import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sanitizeGroup, sanitizeRawPost } from '../../../shared/sanitize';
import { defaultGroupName, repos, type Repos } from '../../db/repositories';
import { createDB, type AppDB } from '../../db/schema';
import { Ingestor } from './ingest';

let db: AppDB;
let store: Repos;
let n = 0;
const NOW = 1_760_000_000_000;

beforeEach(async () => {
  db = createDB(`ingest-${n++}`);
  await db.open();
  store = repos(db);
});
afterEach(async () => {
  db.close();
  await db.delete();
});

const group = { id: 'mockgroup', url: 'https://www.facebook.com/groups/mockgroup', name: 'ตลาดมือสองทดสอบ' };
const post = (id: string, text: string, extra: Record<string, unknown> = {}) => ({
  postId: id,
  postUrl: `https://www.facebook.com/groups/mockgroup/posts/${id}/?__cft__=x`,
  text,
  timeText: '3 ชม.',
  authorName: 'ผู้ขาย',
  ...extra,
});

describe('Ingestor', () => {
  it('runs a full session: creates group, parses, counts, finishes', async () => {
    const ing = new Ingestor(store, () => NOW);
    const s = await ing.start('s1', group);
    expect(s).toMatchObject({ groupCreated: true, knownIds: [], storeAuthorName: false });
    // HELLO ซ้ำต้องไม่เริ่มรอบใหม่
    expect(await ing.start('s1', group)).toBe(s);

    await ing.batch('s1', 1, [post('1', 'iPhone 13\nราคา 12,900.-'), post('2', 'โต๊ะ\nราคาคุยกัน')]);
    await ing.batch('s1', 1, [post('1', 'ซ้ำ')]); // seq ซ้ำ → ไม่นับ
    await ing.batch('s1', 2, [post('3', 'เก้าอี้ 1,500 บาท')]);
    const { session, ackSeq } = await ing.finish('s1', 'maxPosts');

    expect(ackSeq).toBe(3);
    expect(session!.totals).toEqual({ received: 3, added: 3, updated: 0, withPrice: 2 });
    const g = await store.groups.get('mockgroup');
    expect(g).toMatchObject({ name: 'ตลาดมือสองทดสอบ', listingCount: 3 });
    expect(g!.lastSyncedAt).toBeTypeOf('number');
    const l = await db.listings.get('mockgroup_1');
    expect(l).toMatchObject({
      title: 'iPhone 13',
      price: 12900,
      postUrl: 'https://www.facebook.com/groups/mockgroup/posts/1/',
      authorName: null,
      postedAt: NOW - 3 * 3_600_000,
    });
    expect(await db.syncSessions.get('s1')).toMatchObject({ scanned: 3, added: 3, stopReason: 'maxPosts' });
  });

  it('second run updates existing posts, returns known ids and keeps user flags', async () => {
    const ing = new Ingestor(store, () => NOW);
    await ing.start('a', group);
    await ing.batch('a', 1, [post('1', 'iPhone 13 ราคา 12,900')]);
    await ing.finish('a', 'noMore');
    await store.listings.setFavorite('mockgroup_1', true);

    const ing2 = new Ingestor(store, () => NOW + 1000);
    const s = await ing2.start('b', group);
    expect(s!.knownIds).toEqual(['1']);
    expect(s!.groupCreated).toBe(false);
    await ing2.batch('b', 1, [post('1', 'iPhone 13 ราคา 11,500\nขายแล้วครับ'), post('2', 'ใหม่ 500 บาท')]);
    const { session } = await ing2.finish('b', 'reachedKnown');
    expect(session!.totals).toMatchObject({ added: 1, updated: 1 });
    expect(await db.listings.get('mockgroup_1')).toMatchObject({ price: 11500, status: 'sold', favorite: true, firstSeenAt: NOW });
  });

  it('ack seq stops at the first missing batch', async () => {
    const ing = new Ingestor(store, () => NOW);
    await ing.start('s', group);
    await ing.batch('s', 1, [post('1', 'a 100 บาท')]);
    await ing.batch('s', 3, [post('3', 'c 300 บาท')]);
    expect((await ing.finish('s', 'maxPosts')).ackSeq).toBe(2);
  });

  it('stores author names only when the setting allows', async () => {
    await store.settings.update({ storeAuthorName: true });
    const ing = new Ingestor(store, () => NOW);
    expect((await ing.start('s', group))!.storeAuthorName).toBe(true);
    await ing.batch('s', 1, [post('1', 'a 100 บาท')]);
    expect((await db.listings.get('mockgroup_1'))!.authorName).toBe('ผู้ขาย');
  });

  it('does not overwrite a name the user set', async () => {
    await store.groups.add({ id: 'mockgroup', url: group.url, name: 'ชื่อของฉัน' });
    await new Ingestor(store, () => NOW).start('s', group);
    expect((await store.groups.get('mockgroup'))!.name).toBe('ชื่อของฉัน');
  });

  it('fills in the real name for a group added by link', async () => {
    await store.groups.add({ id: 'mockgroup', url: group.url, name: defaultGroupName('mockgroup') });
    await new Ingestor(store, () => NOW).start('s', group);
    expect((await store.groups.get('mockgroup'))!.name).toBe('ตลาดมือสองทดสอบ');
  });

  it('imports a pasted export in one go', async () => {
    const ing = new Ingestor(store, () => NOW);
    const posts = Array.from({ length: 120 }, (_, i) => post(String(i + 1), `สินค้า ${i + 1} ราคา ${(i + 1) * 100} บาท`));
    const s = await ing.importExport({ group, posts, stopReason: 'noMore' });
    expect(s!.totals).toMatchObject({ received: 120, added: 120, withPrice: 120 });
    expect(await db.listings.count()).toBe(120);
  });

  it('rejects an invalid group', async () => {
    const ing = new Ingestor(store, () => NOW);
    expect(await ing.start('s', { id: '../../x', url: 'https://evil.example/groups/1', name: 'x' })).toBeNull();
    expect(await ing.batch('s', 1, [post('1', 'a')])).toBeNull();
  });
});

describe('sanitize', () => {
  it('never lets a non-facebook or javascript: link through', () => {
    const evil = sanitizeRawPost({ postId: '12', postUrl: 'javascript:alert(1)', text: 'x' }, 'g');
    expect(evil!.postUrl).toBe('https://www.facebook.com/groups/g/posts/12/');
    const other = sanitizeRawPost({ postId: '12', postUrl: 'https://facebook.com.evil.example/groups/g/posts/12', text: 'x' }, 'g');
    expect(other!.postUrl).toBe('https://www.facebook.com/groups/g/posts/12/');
    const ok = sanitizeRawPost({ postId: '12', postUrl: 'https://m.facebook.com/groups/g/posts/12/?ref=x', text: 'x' }, 'g');
    expect(ok!.postUrl).toBe('https://www.facebook.com/groups/g/posts/12/');
  });

  it('drops malformed posts and trims long fields', () => {
    expect(sanitizeRawPost({ postId: 'abc', text: 'x' }, 'g')).toBeNull();
    expect(sanitizeRawPost({ postId: '1', text: '' }, 'g')).toBeNull();
    expect(sanitizeRawPost('nope', 'g')).toBeNull();
    expect(sanitizeRawPost({ postId: '1', text: 'a'.repeat(50_000) }, 'g')!.text).toHaveLength(20_000);
  });

  it('derives the group id from its url', () => {
    expect(sanitizeGroup({ id: 'whatever', url: 'https://web.facebook.com/groups/ABC/', name: ' ตลาด ' })).toEqual({
      id: 'abc',
      url: 'https://www.facebook.com/groups/abc',
      name: 'ตลาด',
    });
    expect(sanitizeGroup({ url: 'https://example.com' })).toBeNull();
  });
});
