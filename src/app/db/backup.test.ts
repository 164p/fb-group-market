import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exportBackup, importBackup } from './backup';
import { repos, type Repos } from './repositories';
import { seedSampleData } from './sample';
import { createDB, type AppDB } from './schema';
import { Ingestor } from '../features/receive/ingest';

let a: AppDB;
let b: AppDB;
let sa: Repos;
let sb: Repos;
let n = 0;

beforeEach(async () => {
  a = createDB(`bk-a-${n}`);
  b = createDB(`bk-b-${n++}`);
  await Promise.all([a.open(), b.open()]);
  sa = repos(a);
  sb = repos(b);
});
afterEach(async () => {
  for (const d of [a, b]) {
    d.close();
    await d.delete();
  }
});

const group = { id: 'g1', url: 'https://www.facebook.com/groups/g1', name: 'ตลาดเกม' };
const post = (id: string, text: string) => ({ postId: id, postUrl: `https://www.facebook.com/groups/g1/posts/${id}/`, text, timeText: '2 ชม.' });

async function fill(store: Repos) {
  const ing = new Ingestor(store, () => 1_760_000_000_000);
  await ing.start('s', group);
  await ing.batch('s', 1, [post('1', 'iPhone 13 ราคา 12,900'), post('2', 'ขายเกม\nZelda 900\nMario 1,050')]);
  await ing.finish('s', 'maxPosts');
}

describe('backup', () => {
  it('round-trips data, stars and hidden flags to another browser, without sample data', async () => {
    await seedSampleData(sa);
    await fill(sa);
    await sa.listings.setFavorite('g1_1', true);
    await sa.listings.setHidden('g1_2_1', true);

    const file = JSON.parse(JSON.stringify(await exportBackup(a)));
    expect(file.groups.map((g: { id: string }) => g.id)).toEqual(['g1']);

    const res = await importBackup(b, sb, file);
    expect(res).toEqual({ groups: 1, posts: 2, listings: 3 });
    expect(await b.listings.get('g1_1')).toMatchObject({ title: 'iPhone 13', price: 12900, favorite: true });
    expect(await b.listings.get('g1_2_1')).toMatchObject({ title: 'Mario', price: 1050, hidden: true });
    expect((await sb.groups.get('g1'))!).toMatchObject({ name: 'ตลาดเกม', listingCount: 3 });
  });

  it('merges into existing data: keeps names, ORs flags, no duplicates', async () => {
    await fill(sa);
    await sa.listings.setFavorite('g1_1', true);
    await fill(sb);
    await sb.groups.rename('g1', 'ชื่อของฉัน');
    await sb.listings.setHidden('g1_1', true);

    await importBackup(b, sb, await exportBackup(a));
    expect(await b.listings.count()).toBe(3);
    expect(await b.listings.get('g1_1')).toMatchObject({ favorite: true, hidden: true });
    expect((await sb.groups.get('g1'))!.name).toBe('ชื่อของฉัน');
  });

  it('rejects other files and neutralises unsafe content', async () => {
    await expect(importBackup(b, sb, { hello: 1 })).rejects.toThrow('ไม่ใช่ไฟล์สำรอง');
    const evil = {
      app: 'fb-group-market',
      v: 1,
      exportedAt: '',
      groups: [group, { id: 'x', url: 'https://evil.example/groups/x', name: 'x' }],
      listings: [
        { id: 'g1_9', groupId: 'g1', postId: '9', postUrl: 'javascript:alert(1)', rawText: 'โต๊ะ 500 บาท', title: '<img onerror=x>', price: -1 },
        { groupId: 'x', postId: '1', rawText: 'a 1 บาท' },
        { groupId: 'g1', postId: 'abc', rawText: 'b' },
      ],
    };
    const res = await importBackup(b, sb, evil);
    // กลุ่ม x ใช้ได้ แต่ลิงก์ถูกสร้างใหม่เป็น facebook.com เสมอ
    expect(res).toEqual({ groups: 2, posts: 2, listings: 2 });
    expect((await sb.groups.get('x'))!.url).toBe('https://www.facebook.com/groups/x');
    expect(await b.listings.get('g1_9')).toMatchObject({
      postUrl: 'https://www.facebook.com/groups/g1/posts/9/',
      title: 'โต๊ะ',
      price: 500,
    });
  });
});
