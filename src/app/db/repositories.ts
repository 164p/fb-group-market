// ชั้นเข้าถึงข้อมูล — ทุกหน้าเรียกผ่านที่นี่ ไม่แตะ Dexie ตรงๆ
import { DEFAULT_SETTINGS } from '../../shared/config';
import type { Group, Listing, Settings, StopReason, SyncSession } from '../../shared/types';
import type { AppDB } from './schema';

export const listingKey = (groupId: string, postId: string) => `${groupId}_${postId}`;

/** ชื่อชั่วคราวของกลุ่มที่เพิ่มด้วยลิงก์ ก่อนรู้ชื่อจริง */
export const defaultGroupName = (id: string) => `กลุ่ม ${id}`;

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

    /**
     * ใช้ตอนรับข้อมูลจาก bookmarklet: สร้างกลุ่มถ้ายังไม่มี
     * ถ้ามีแล้วและยังใช้ชื่อเริ่มต้น "กลุ่ม {id}" → เปลี่ยนเป็นชื่อจริงจากหน้า Facebook
     * (ไม่ทับชื่อที่ผู้ใช้ตั้งเอง)
     * @returns true เมื่อสร้างกลุ่มใหม่
     */
    async ensure(info: { id: string; url: string; name?: string }): Promise<boolean> {
      return db.transaction('rw', db.groups, async () => {
        const name = info.name?.trim();
        const existing = await db.groups.get(info.id);
        if (!existing) {
          await db.groups.add({
            id: info.id,
            url: info.url,
            name: name || defaultGroupName(info.id),
            addedAt: Date.now(),
            listingCount: 0,
          });
          return true;
        }
        if (name && existing.name === defaultGroupName(info.id)) await db.groups.update(info.id, { name });
        return false;
      });
    },

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

    /** post id ของกลุ่มที่มีอยู่แล้ว — ใช้ส่งกลับให้ bookmarklet ใน ACK (โพสต์หลายรายการนับเป็น 1) */
    async knownPostIds(groupId: string): Promise<Set<string>> {
      const keys = await db.listings.where('groupId').equals(groupId).primaryKeys();
      const prefix = `${groupId}_`;
      return new Set(keys.map((k) => String(k).slice(prefix.length).split('_')[0]));
    },

    /** ทุกแถวของโพสต์หนึ่ง (แถวเดียว หรือหลายรายการ) */
    async rowsOfPost(groupId: string, postId: string): Promise<Listing[]> {
      const key = listingKey(groupId, postId);
      const rows = await db.listings.where(':id').startsWith(key).toArray();
      return rows.filter((r) => r.id === key || r.id.startsWith(`${key}_`));
    },

    /**
     * บันทึกผลการแยกโพสต์ (แต่ละโพสต์อาจมีหลายแถว)
     * - แถวของโพสต์เดิมที่ไม่มีในผลใหม่ถูกลบ (เช่น เดิมแถวเดียว ตอนนี้แยกเป็นหลายรายการ)
     * - คงดาว/ซ่อน/เวลาที่เห็นครั้งแรก จากแถวเดิมที่ id ตรงกัน หรือจากแถวเดิมของโพสต์เดียวกัน
     * - นับ "ใหม่" เฉพาะโพสต์ที่ไม่เคยมี, โพสต์ที่เคยมีนับเป็น "อัปเดต"
     */
    async replacePosts(rows: Listing[]): Promise<UpsertResult> {
      if (rows.length === 0) return { added: 0, updated: 0 };
      return db.transaction('rw', db.listings, async () => {
        const byPost = new Map<string, Listing[]>();
        for (const r of rows) {
          const k = listingKey(r.groupId, r.postId);
          byPost.set(k, [...(byPost.get(k) ?? []), r]);
        }
        let added = 0;
        let updated = 0;
        const put: Listing[] = [];
        const del: string[] = [];
        for (const [key, fresh] of byPost) {
          const old = (await db.listings.where(':id').startsWith(key).toArray()).filter(
            (r) => r.id === key || r.id.startsWith(`${key}_`),
          );
          if (old.length === 0) added += fresh.length;
          else updated += fresh.length;
          const oldById = new Map(old.map((r) => [r.id, r]));
          const fallback = old[0];
          for (const item of fresh) {
            const prev = oldById.get(item.id) ?? fallback;
            put.push(
              prev
                ? {
                    ...item,
                    firstSeenAt: Math.min(prev.firstSeenAt, item.firstSeenAt),
                    favorite: prev.favorite,
                    hidden: prev.hidden,
                    postedAt: item.postedAt ?? prev.postedAt,
                    postedAtText: item.postedAtText ?? prev.postedAtText,
                    authorName: item.authorName ?? prev.authorName,
                  }
                : item,
            );
          }
          const keep = new Set(fresh.map((f) => f.id));
          for (const r of old) if (!keep.has(r.id)) del.push(r.id);
        }
        if (del.length) await db.listings.bulkDelete(del);
        await db.listings.bulkPut(put);
        return { added, updated };
      });
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

    /**
     * ใช้ parser ปัจจุบันแยกข้อมูลใหม่จาก rawText (ไม่รวมข้อมูลตัวอย่าง)
     * @returns จำนวนรายการที่ราคา/ชื่อ/สถานะเปลี่ยน
     */
    async reparseAll(reparse: (rows: Listing[]) => Listing[], skipGroup: (groupId: string) => boolean): Promise<number> {
      return db.transaction('rw', db.listings, async () => {
        const all = await db.listings.toArray();
        const byPost = new Map<string, Listing[]>();
        for (const l of all) {
          if (skipGroup(l.groupId)) continue;
          const k = listingKey(l.groupId, l.postId);
          byPost.set(k, [...(byPost.get(k) ?? []), l]);
        }
        const sig = (l: Listing) =>
          [l.id, l.title, l.price, l.priceMin, l.priceMax, l.priceType, l.status, l.itemNote, l.postTitle].join('|');
        let changed = 0;
        const put: Listing[] = [];
        const del: string[] = [];
        for (const rows of byPost.values()) {
          rows.sort((a, b) => a.id.localeCompare(b.id));
          const fresh = reparse(rows);
          const before = new Set(rows.map(sig));
          const diff = fresh.filter((f) => !before.has(sig(f))).length + Math.max(0, rows.length - fresh.length);
          if (diff === 0 && rows.every((r) => r.parserVersion === fresh[0]?.parserVersion)) continue;
          changed += Math.max(diff, 1);
          const keep = new Set(fresh.map((f) => f.id));
          for (const r of rows) if (!keep.has(r.id)) del.push(r.id);
          put.push(...fresh);
        }
        if (del.length) await db.listings.bulkDelete(del);
        await db.listings.bulkPut(put);
        return changed;
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
