// ชั้นเข้าถึงข้อมูล — ทุกหน้าเรียกผ่านที่นี่ ไม่แตะ Dexie ตรงๆ
import { DEFAULT_SETTINGS } from '../../shared/config';
import type { Group, Listing, Settings, StopReason, SyncSession } from '../../shared/types';
import type { AppDB } from './schema';

export const listingKey = (groupId: string, postId: string) => `${groupId}_${postId}`;

/* ------------------------------------------------------------------ groups */

export function groupsRepo(db: AppDB) {
  return {
    list: () => db.groups.orderBy('addedAt').toArray(),
    get: (id: string) => db.groups.get(id),

    /** เพิ่มกลุ่มใหม่ — คืน false ถ้ามีอยู่แล้ว */
    async add(input: Pick<Group, 'id' | 'url' | 'name'> & Partial<Group>): Promise<boolean> {
      return db.transaction('rw', db.groups, async () => {
        if (await db.groups.get(input.id)) return false;
        await db.groups.add({ addedAt: Date.now(), listingCount: 0, ...input });
        return true;
      });
    },

    rename: (id: string, name: string) => db.groups.update(id, { name: name.trim() }),

    /** ลบกลุ่มพร้อมสินค้าและประวัติการดึงทั้งหมดของกลุ่มนั้น */
    async remove(id: string) {
      await db.transaction('rw', [db.groups, db.listings, db.syncSessions], async () => {
        await db.listings.where('groupId').equals(id).delete();
        await db.syncSessions.where('groupId').equals(id).delete();
        await db.groups.delete(id);
      });
    },

    /** นับสินค้าใหม่แล้วเก็บเป็น cache ใน listingCount */
    async recount(id: string) {
      const n = await db.listings.where('groupId').equals(id).count();
      await db.groups.update(id, { listingCount: n });
      return n;
    },
  };
}

/* ---------------------------------------------------------------- listings */

export interface UpsertResult {
  added: number;
  updated: number;
}

export function listingsRepo(db: AppDB) {
  return {
    all: () => db.listings.toArray(),
    count: () => db.listings.count(),
    byGroup: (groupId: string) => db.listings.where('groupId').equals(groupId).toArray(),

    /** post id ของกลุ่มที่มีอยู่แล้ว — ใช้ส่งกลับให้ bookmarklet ใน ACK */
    async knownPostIds(groupId: string): Promise<Set<string>> {
      const keys = await db.listings.where('groupId').equals(groupId).primaryKeys();
      const prefix = `${groupId}_`;
      return new Set(keys.map((k) => String(k).slice(prefix.length)));
    },

    /**
     * เพิ่มหรืออัปเดตหลายรายการ
     * - รายการใหม่: บันทึกตามที่ส่งมา
     * - รายการเดิม: อัปเดตเนื้อหาและ lastSeenAt แต่คงค่าที่ผู้ใช้ตั้งเอง (favorite, hidden)
     *   และ firstSeenAt ไว้ ส่วน postedAt เดิมคงไว้ถ้าค่าใหม่ไม่มี
     */
    async upsertMany(items: Listing[]): Promise<UpsertResult> {
      if (items.length === 0) return { added: 0, updated: 0 };
      return db.transaction('rw', db.listings, async () => {
        const existing = await db.listings.bulkGet(items.map((i) => i.id));
        let added = 0;
        let updated = 0;
        const merged = items.map((item, idx) => {
          const old = existing[idx];
          if (!old) {
            added++;
            return item;
          }
          updated++;
          return {
            ...item,
            firstSeenAt: old.firstSeenAt,
            favorite: old.favorite,
            hidden: old.hidden,
            postedAt: item.postedAt ?? old.postedAt,
            postedAtText: item.postedAtText ?? old.postedAtText,
            authorName: item.authorName ?? old.authorName,
          };
        });
        await db.listings.bulkPut(merged);
        return { added, updated };
      });
    },

    setFavorite: (id: string, favorite: boolean) => db.listings.update(id, { favorite }),
    setHidden: (id: string, hidden: boolean) => db.listings.update(id, { hidden }),
    remove: (id: string) => db.listings.delete(id),
  };
}

/* ---------------------------------------------------------------- sessions */

export function sessionsRepo(db: AppDB) {
  return {
    async start(groupId: string, id: string = crypto.randomUUID()): Promise<SyncSession> {
      const s: SyncSession = { id, groupId, startedAt: Date.now(), scanned: 0, added: 0, updated: 0, withPrice: 0 };
      await db.syncSessions.put(s);
      return s;
    },

    /** บวกตัวเลขสะสมระหว่างรับข้อมูลทีละชุด */
    async addCounts(id: string, delta: Partial<Pick<SyncSession, 'scanned' | 'added' | 'updated' | 'withPrice'>>) {
      await db.transaction('rw', db.syncSessions, async () => {
        const s = await db.syncSessions.get(id);
        if (!s) return;
        await db.syncSessions.update(id, {
          scanned: s.scanned + (delta.scanned ?? 0),
          added: s.added + (delta.added ?? 0),
          updated: s.updated + (delta.updated ?? 0),
          withPrice: s.withPrice + (delta.withPrice ?? 0),
        });
      });
    },

    /** ปิดรอบดึง และอัปเดตเวลาดึงล่าสุด + จำนวนสินค้าของกลุ่ม */
    async finish(id: string, stopReason: StopReason) {
      await db.transaction('rw', [db.syncSessions, db.groups, db.listings], async () => {
        const s = await db.syncSessions.get(id);
        if (!s) return;
        const now = Date.now();
        await db.syncSessions.update(id, { finishedAt: now, stopReason });
        const n = await db.listings.where('groupId').equals(s.groupId).count();
        await db.groups.update(s.groupId, { lastSyncedAt: now, listingCount: n });
      });
    },

    byGroup: (groupId: string) => db.syncSessions.where('groupId').equals(groupId).reverse().sortBy('startedAt'),
  };
}

/* ---------------------------------------------------------------- settings */

const META_KEYS = { sampleSeededAt: 'meta.sampleSeededAt' } as const;

export function settingsRepo(db: AppDB) {
  return {
    /** อ่านค่าทั้งหมด เติมค่าเริ่มต้นให้คีย์ที่ยังไม่เคยตั้ง */
    async get(): Promise<Settings> {
      const rows = await db.settings.toArray();
      const stored = Object.fromEntries(rows.filter((r) => !r.key.startsWith('meta.')).map((r) => [r.key, r.value]));
      return { ...DEFAULT_SETTINGS, ...stored } as Settings;
    },

    async update(patch: Partial<Settings>) {
      await db.settings.bulkPut(Object.entries(patch).map(([key, value]) => ({ key, value })));
    },

    async getMeta(key: keyof typeof META_KEYS): Promise<number | null> {
      const row = await db.settings.get(META_KEYS[key]);
      return typeof row?.value === 'number' ? row.value : null;
    },
    setMeta: (key: keyof typeof META_KEYS, value: number) => db.settings.put({ key: META_KEYS[key], value }),
  };
}

/* ------------------------------------------------------------- whole store */

export function repos(db: AppDB) {
  return {
    groups: groupsRepo(db),
    listings: listingsRepo(db),
    sessions: sessionsRepo(db),
    settings: settingsRepo(db),

    /** ล้างข้อมูลทั้งหมด (สินค้า กลุ่ม ประวัติ) แต่คงการตั้งค่าไว้ */
    async clearAllData() {
      await db.transaction('rw', [db.groups, db.listings, db.syncSessions], async () => {
        await Promise.all([db.groups.clear(), db.listings.clear(), db.syncSessions.clear()]);
      });
    },
  };
}

export type Repos = ReturnType<typeof repos>;
