// ตรวจและทำความสะอาดข้อมูลที่มาจากหน้า Facebook ก่อนบันทึก
// ข้อมูลนี้มาจากหน้าเว็บภายนอก จึงถือว่าไม่น่าเชื่อถือ: ต้องไม่มีลิงก์ที่ไม่ใช่ facebook.com
// (เช่น javascript:) และต้องมีขนาดจำกัด
import { parseGroupUrl } from './parser/url';
import type { GroupInfo } from './protocol';
import type { RawPost } from './types';

const MAX_TEXT = 20_000;
const MAX_SHORT = 200;
const MAX_POSTS_PER_IMPORT = 2_000;

const str = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;

/** ลิงก์โพสต์ต้องเป็น https://www.facebook.com/... เท่านั้น ไม่อย่างนั้นสร้างใหม่จาก id */
export function safePostUrl(url: unknown, groupId: string, postId: string): string {
  if (typeof url === 'string') {
    try {
      const u = new URL(url);
      if (u.protocol === 'https:' && /^(?:www\.|m\.|web\.)?facebook\.com$/.test(u.hostname)) {
        return `https://www.facebook.com${u.pathname}`;
      }
    } catch {
      /* ใช้ค่าที่สร้างใหม่ */
    }
  }
  return `https://www.facebook.com/groups/${encodeURIComponent(groupId)}/posts/${postId}/`;
}

export function sanitizeRawPost(v: unknown, groupId: string): RawPost | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const postId = typeof o.postId === 'string' && /^\d{1,30}$/.test(o.postId) ? o.postId : null;
  if (!postId) return null;
  const text = str(o.text, MAX_TEXT) ?? '';
  const structuredPrice = str(o.structuredPrice, MAX_SHORT);
  if (!text && !structuredPrice) return null;
  return {
    postId,
    postUrl: safePostUrl(o.postUrl, groupId, postId),
    text,
    structuredTitle: str(o.structuredTitle, MAX_SHORT),
    structuredPrice,
    authorName: str(o.authorName, MAX_SHORT),
    timeText: str(o.timeText, MAX_SHORT),
  };
}

export function sanitizePosts(list: unknown, groupId: string): RawPost[] {
  if (!Array.isArray(list)) return [];
  const out: RawPost[] = [];
  for (const v of list.slice(0, MAX_POSTS_PER_IMPORT)) {
    const p = sanitizeRawPost(v, groupId);
    if (p) out.push(p);
  }
  return out;
}

/** กลุ่มต้องมาจากลิงก์กลุ่มที่ถูกต้อง ใช้ id จาก URL เป็นหลัก */
export function sanitizeGroup(v: unknown): GroupInfo | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const fromUrl = typeof o.url === 'string' ? parseGroupUrl(o.url) : null;
  const fromId = typeof o.id === 'string' ? parseGroupUrl(`https://www.facebook.com/groups/${o.id}`) : null;
  const r = fromUrl?.ok ? fromUrl : fromId?.ok ? fromId : null;
  if (!r || !r.ok) return null;
  return { id: r.id, url: r.url, name: str(o.name, MAX_SHORT) ?? '' };
}
