import Dexie, { type EntityTable } from 'dexie';
import type { Group, Listing, SyncSession } from '../../shared/types';

/** แถวในตาราง settings แบบ key-value */
export interface SettingRow {
  key: string;
  value: unknown;
}

export type AppDB = Dexie & {
  groups: EntityTable<Group, 'id'>;
  listings: EntityTable<Listing, 'id'>;
  syncSessions: EntityTable<SyncSession, 'id'>;
  settings: EntityTable<SettingRow, 'key'>;
};

export const DB_NAME = 'fb-group-market';

/**
 * สร้างฐานข้อมูล — แยกเป็นฟังก์ชันเพื่อให้ test สร้างฐานใหม่ได้ทุกครั้ง
 *
 * หมายเหตุ index ของ listings:
 * - price, postedAt, status, favorite ใช้กรอง/เรียง
 * - [groupId+postedAt] ใช้หาโพสต์ล่าสุดของกลุ่ม (เงื่อนไขหยุด "เจอโพสต์ที่เคยดึงแล้ว")
 * - favorite เก็บเป็น 0/1 ไม่ได้ใน Dexie แบบ boolean → กรองด้วย .filter() แทน index
 */
export function createDB(name = DB_NAME): AppDB {
  const db = new Dexie(name) as AppDB;
  db.version(1).stores({
    groups: 'id, addedAt',
    listings: 'id, groupId, price, postedAt, status, lastSeenAt, [groupId+postedAt]',
    syncSessions: 'id, groupId, startedAt',
    settings: 'key',
  });
  return db;
}

export const db = createDB();
