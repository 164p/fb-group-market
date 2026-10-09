import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../shared/config';
import type { Listing } from '../../shared/types';
import { listingKey, repos, type Repos } from './repositories';
import { buildSampleData, removeSampleData, SAMPLE_COUNT, seedOnFirstRun, seedSampleData } from './sample';
import { createDB, type AppDB } from './schema';

let db: AppDB;
let store: Repos;
let n = 0;

beforeEach(async () => {
  db = createDB(`test-${n++}`);
  await db.open();
  store = repos(db);
});
afterEach(async () => {
  db.close();
  await db.delete();
});

function listing(groupId: string, postId: string, patch: Partial<Listing> = {}): Listing {
  return {
    id: listingKey(groupId, postId),
    groupId,
    postId,
    postUrl: `https://www.facebook.com/groups/${groupId}/posts/${postId}`,
    title: 'สินค้า',
    rawText: 'สินค้า ราคา 100',
    price: 100,
    priceMin: 100,
    priceMax: 100,
    priceType: 'fixed',
    priceText: '100',
    currency: 'THB',
    status: 'available',
    authorName: null,
    postedAt: 1_000,
    postedAtText: null,
    firstSeenAt: 1_000,
    lastSeenAt: 1_000,
    favorite: false,
    hidden: false,
    parserVersion: 1,
    ...patch,
  };
}

describe('groups', () => {
  it('adds a group once and rejects duplicates', async () => {
    expect(await store.groups.add({ id: '123', url: 'u', name: 'A' })).toBe(true);
    expect(await store.groups.add({ id: '123', url: 'u', name: 'B' })).toBe(false);
    const g = await store.groups.get('123');
    expect(g?.name).toBe('A');
    expect(g?.listingCount).toBe(0);
  });

  it('removing a group deletes its listings and sessions only', async () => {
    await store.groups.add({ id: 'a', url: 'u', name: 'A' });
    await store.groups.add({ id: 'b', url: 'u', name: 'B' });
    await store.listings.upsertMany([listing('a', '1'), listing('a', '2'), listing('b', '1')]);
    await store.sessions.start('a', 's1');
    await store.groups.remove('a');
    expect(await store.groups.get('a')).toBeUndefined();
    expect(await store.listings.count()).toBe(1);
    expect(await db.syncSessions.count()).toBe(0);
  });
});

describe('listings.upsertMany', () => {
  it('counts added vs updated and keeps user flags and firstSeenAt', async () => {
    await store.listings.upsertMany([listing('g', '1'), listing('g', '2')]);
    await store.listings.setFavorite(listingKey('g', '1'), true);
    await store.listings.setHidden(listingKey('g', '2'), true);

    const res = await store.listings.upsertMany([
      listing('g', '1', { title: 'แก้ชื่อ', price: 90, firstSeenAt: 5_000, lastSeenAt: 5_000 }),
      listing('g', '2', { postedAt: null, lastSeenAt: 5_000 }),
      listing('g', '3', { firstSeenAt: 5_000 }),
    ]);
    expect(res).toEqual({ added: 1, updated: 2 });

    const one = await db.listings.get(listingKey('g', '1'));
    expect(one).toMatchObject({ title: 'แก้ชื่อ', price: 90, favorite: true, firstSeenAt: 1_000, lastSeenAt: 5_000 });

    const two = await db.listings.get(listingKey('g', '2'));
    expect(two).toMatchObject({ hidden: true, postedAt: 1_000 });
  });

  it('returns known post ids for a group', async () => {
    await store.listings.upsertMany([listing('g', '10'), listing('g', '11'), listing('x', '12')]);
    expect([...(await store.listings.knownPostIds('g'))].sort()).toEqual(['10', '11']);
  });
});

describe('sessions', () => {
  it('accumulates counts and updates the group on finish', async () => {
    await store.groups.add({ id: 'g', url: 'u', name: 'G' });
    await store.listings.upsertMany([listing('g', '1'), listing('g', '2')]);
    await store.sessions.start('g', 's');
    await store.sessions.addCounts('s', { scanned: 10, added: 2, withPrice: 1 });
    await store.sessions.addCounts('s', { scanned: 5, updated: 3 });
    await store.sessions.finish('s', 'maxPosts');

    expect(await db.syncSessions.get('s')).toMatchObject({ scanned: 15, added: 2, updated: 3, withPrice: 1, stopReason: 'maxPosts' });
    const g = await store.groups.get('g');
    expect(g?.listingCount).toBe(2);
    expect(g?.lastSyncedAt).toBeTypeOf('number');
  });
});

describe('settings', () => {
  it('fills defaults and persists patches', async () => {
    expect(await store.settings.get()).toEqual(DEFAULT_SETTINGS);
    await store.settings.update({ maxPosts: 250, storeAuthorName: true });
    expect(await store.settings.get()).toMatchObject({ maxPosts: 250, storeAuthorName: true, maxAgeDays: 7 });
  });
});

describe('sample data', () => {
  it('builds about 60 consistent listings', () => {
    const { groups, listings } = buildSampleData(1_700_000_000_000);
    expect(listings).toHaveLength(SAMPLE_COUNT);
    expect(SAMPLE_COUNT).toBeGreaterThanOrEqual(55);
    expect(new Set(listings.map((l) => l.id)).size).toBe(listings.length);
    expect(groups.every((g) => g.isSample)).toBe(true);
    for (const l of listings) {
      if (l.priceType === 'range') expect(l.priceMin!).toBeLessThan(l.priceMax!);
      if (l.priceType === 'fixed') expect(l.price).not.toBeNull();
    }
    expect(listings.some((l) => l.status === 'sold')).toBe(true);
    expect(listings.some((l) => l.price === null)).toBe(true);
  });

  it('seeds once on first run, reseeds without duplicates, and removes only sample data', async () => {
    expect(await seedOnFirstRun(store)).toBe(true);
    expect(await store.listings.count()).toBe(SAMPLE_COUNT);
    expect(await seedOnFirstRun(store)).toBe(false);

    await seedSampleData(store);
    expect(await store.listings.count()).toBe(SAMPLE_COUNT);

    await store.groups.add({ id: 'real', url: 'u', name: 'จริง' });
    await store.listings.upsertMany([listing('real', '1')]);
    await removeSampleData(store);
    expect(await store.listings.count()).toBe(1);
    expect((await store.groups.list()).map((g) => g.id)).toEqual(['real']);

    // ลบตัวอย่างแล้ว เปิดแอปใหม่ต้องไม่ใส่กลับมาเอง
    expect(await seedOnFirstRun(store)).toBe(false);
  });

  it('does not seed when the user already has real groups', async () => {
    await store.groups.add({ id: 'real', url: 'u', name: 'จริง' });
    expect(await seedOnFirstRun(store)).toBe(false);
    expect(await store.listings.count()).toBe(0);
  });

  it('clearAllData keeps settings', async () => {
    await seedSampleData(store);
    await store.settings.update({ maxPosts: 300 });
    await store.clearAllData();
    expect(await store.listings.count()).toBe(0);
    expect(await store.groups.list()).toHaveLength(0);
    expect((await store.settings.get()).maxPosts).toBe(300);
  });
});
