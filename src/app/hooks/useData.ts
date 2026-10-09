import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export interface DataStats {
  listings: number;
  groups: number;
  sampleGroups: number;
  realGroups: number;
}

/** ตัวเลขสรุปของฐานข้อมูล อัปเดตอัตโนมัติเมื่อข้อมูลเปลี่ยน (undefined ระหว่างโหลด) */
export function useDataStats(): DataStats | undefined {
  return useLiveQuery(async () => {
    const [listings, groups] = await Promise.all([db.listings.count(), db.groups.toArray()]);
    const sampleGroups = groups.filter((g) => g.isSample).length;
    return { listings, groups: groups.length, sampleGroups, realGroups: groups.length - sampleGroups };
  }, []);
}

/** รายชื่อกลุ่มทั้งหมด เรียงตามเวลาที่เพิ่ม */
export function useGroups() {
  return useLiveQuery(() => db.groups.orderBy('addedAt').toArray(), []);
}
