// สำรองและย้ายข้อมูลระหว่างเบราว์เซอร์/เครื่อง ด้วยไฟล์ JSON
//
// นำเข้า: ไม่เชื่อค่าที่คำนวณไว้ในไฟล์ (ชื่อ/ราคา) — ใช้เฉพาะข้อความโพสต์และค่าที่ผู้ใช้ตั้ง
// แล้วแยกข้อมูลใหม่ด้วย parser ปัจจุบัน ลิงก์ทุกอันถูกตรวจว่าเป็น facebook.com
import { postKey, reparsePost } from '../../shared/parser';
import { safePostUrl, sanitizeGroup } from '../../shared/sanitize';
import type { Group, Listing } from '../../shared/types';
import type { Repos } from './repositories';
import { isSampleGroupId } from './sample';
import type { AppDB } from './schema';

export const BACKUP_APP = 'fb-group-market';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  v: number;
  exportedAt: string;
  groups: Group[];
  listings: Listing[];
}

export interface ImportResult {
  groups: number;
  posts: number;
  listings: number;
}

/** ข้อมูลทั้งหมดยกเว้นข้อมูลตัวอย่างและประวัติการดึง */
export async function exportBackup(db: AppDB, now = new Date()): Promise<BackupFile> {
  const [groups, listings] = await Promise.all([db.groups.toArray(), db.listings.toArray()]);
  return {
    app: BACKUP_APP,
    v: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    groups: groups.filter((g) => !g.isSample),
    listings: listings.filter((l) => !isSampleGroupId(l.groupId)),
  };
}

export function backupFileName(now = new Date()): string {
  const d = now.toISOString().slice(0, 10);
  return `fb-group-market-backup-${d}.json`;
}

const num = (v: unknown, fallback: number | null = null) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/** แปลงแถวจากไฟล์เป็นข้อมูลดิบที่ปลอดภัย (ยังไม่แยกราคา) */
function sanitizeRow(v: unknown, groupIds: Set<string>): Listing | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const groupId = typeof o.groupId === 'string' && groupIds.has(o.groupId) ? o.groupId : null;
  const postId = typeof o.postId === 'string' && /^\d{1,30}$/.test(o.postId) ? o.postId : null;
  const rawText = text(o.rawText, 20_000).trim();
  if (!groupId || !postId || !rawText) return null;
  const id = typeof o.id === 'string' && (o.id === postKey(groupId, postId) || o.id.startsWith(`${postKey(groupId, postId)}_`)) ? o.id : postKey(groupId, postId);
  const now = Date.now();
  return {
    id,
    groupId,
    postId,
    postUrl: safePostUrl(o.postUrl, groupId, postId),
    title: '',
    rawText,
    price: null,
    priceMin: null,
    priceMax: null,
    priceType: 'unknown',
    priceText: null,
    currency: 'THB',
    status: 'available',
    authorName: null,
    postedAt: num(o.postedAt),
    postedAtText: text(o.postedAtText, 200) || null,
    firstSeenAt: num(o.firstSeenAt, now)!,
    lastSeenAt: num(o.lastSeenAt, now)!,
    favorite: o.favorite === true,
    hidden: o.hidden === true,
    parserVersion: 0,
    ...(typeof o.structuredPrice === 'string' ? { structuredPrice: text(o.structuredPrice, 200) } : {}),
  };
}

export function isBackupFile(v: unknown): v is BackupFile {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return o.app === BACKUP_APP && typeof o.v === 'number' && Array.isArray(o.groups) && Array.isArray(o.listings);
}

/**
 * รวมข้อมูลจากไฟล์เข้ากับข้อมูลเดิม (ไม่ลบของเดิม)
 * - กลุ่มที่มีอยู่แล้วคงชื่อเดิม
 * - โพสต์ที่มีทั้งสองฝั่ง: ดาว/ซ่อน รวมกัน (มีฝั่งใดฝั่งหนึ่งก็ถือว่ามี) เวลาใช้ค่าที่เก่าสุด/ใหม่สุด
 */
export async function importBackup(db: AppDB, store: Repos, data: unknown): Promise<ImportResult> {
  if (!isBackupFile(data)) throw new Error('ไฟล์นี้ไม่ใช่ไฟล์สำรองของตลาดกลุ่ม');
  if (data.v > BACKUP_VERSION) throw new Error('ไฟล์สำรองมาจากเวอร์ชันใหม่กว่า กรุณาโหลดหน้าเว็บใหม่แล้วลองอีกครั้ง');

  const groups: Group[] = [];
  for (const g of data.groups.slice(0, 1000)) {
    const info = sanitizeGroup(g);
    if (!info || isSampleGroupId(info.id)) continue;
    groups.push({
      id: info.id,
      url: info.url,
      name: info.name || `กลุ่ม ${info.id}`,
      addedAt: num((g as Group).addedAt, Date.now())!,
      lastSyncedAt: num((g as Group).lastSyncedAt) ?? undefined,
      listingCount: 0,
    });
  }
  const groupIds = new Set(groups.map((g) => g.id));

  const byPost = new Map<string, Listing[]>();
  for (const v of data.listings.slice(0, 100_000)) {
    const row = sanitizeRow(v, groupIds);
    if (!row) continue;
    const k = postKey(row.groupId, row.postId);
    byPost.set(k, [...(byPost.get(k) ?? []), row]);
  }

  let listingsWritten = 0;
  await db.transaction('rw', [db.groups, db.listings], async () => {
    for (const g of groups) if (!(await db.groups.get(g.id))) await db.groups.add(g);

    for (const [key, rows] of byPost) {
      rows.sort((a, b) => a.id.localeCompare(b.id));
      const fresh = reparsePost(rows);
      const old = (await db.listings.where(':id').startsWith(key).toArray()).filter(
        (r) => r.id === key || r.id.startsWith(`${key}_`),
      );
      const oldById = new Map(old.map((r) => [r.id, r]));
      const merged = fresh.map((f) => {
        const o = oldById.get(f.id);
        if (!o) return f;
        return {
          ...f,
          favorite: f.favorite || o.favorite,
          hidden: f.hidden || o.hidden,
          firstSeenAt: Math.min(f.firstSeenAt, o.firstSeenAt),
          lastSeenAt: Math.max(f.lastSeenAt, o.lastSeenAt),
          postedAt: f.postedAt ?? o.postedAt,
          authorName: o.authorName,
        };
      });
      const keep = new Set(merged.map((m) => m.id));
      const stale = old.filter((r) => !keep.has(r.id)).map((r) => r.id);
      if (stale.length) await db.listings.bulkDelete(stale);
      await db.listings.bulkPut(merged);
      listingsWritten += merged.length;
    }
  });

  for (const g of groups) await store.groups.recount(g.id);
  return { groups: groups.length, posts: byPost.size, listings: listingsWritten };
}
