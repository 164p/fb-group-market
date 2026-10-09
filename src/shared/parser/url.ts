// แยกลิงก์กลุ่ม Facebook ที่ผู้ใช้แปะ → group id มาตรฐาน
// ใช้ร่วมกันระหว่างหน้า Groups และ bookmarklet

export type GroupUrlResult =
  | { ok: true; id: string; url: string }
  | { ok: false; reason: GroupUrlError };

export type GroupUrlError =
  | 'empty'
  | 'notFacebook'
  | 'notGroup'
  | 'shareLink'
  | 'missingId';

export const GROUP_URL_ERRORS: Record<GroupUrlError, string> = {
  empty: 'แปะลิงก์กลุ่ม Facebook',
  notFacebook: 'ลิงก์นี้ไม่ใช่ของ Facebook',
  notGroup: 'ลิงก์นี้ไม่ใช่ลิงก์กลุ่ม ลิงก์กลุ่มจะมีคำว่า /groups/ เช่น facebook.com/groups/123456789',
  shareLink:
    'ลิงก์แชร์แบบย่อใช้ไม่ได้ ให้เปิดลิงก์นี้ในเบราว์เซอร์ก่อน แล้วคัดลอกที่อยู่จากแถบด้านบน (จะขึ้นต้นด้วย facebook.com/groups/)',
  missingId: 'ลิงก์ไม่มีรหัสกลุ่ม ลองคัดลอกจากหน้าแรกของกลุ่มอีกครั้ง',
};

const FB_HOSTS = /^(?:(?:www|m|web|mbasic|mobile|touch|business)\.)?(?:facebook\.com|fb\.com)$/i;

/** คำที่ตามหลัง /groups/ แต่ไม่ใช่ชื่อกลุ่ม */
const RESERVED = new Set(['feed', 'discover', 'joins', 'create', 'notifications', 'search', 'category']);

/** slug ของกลุ่ม: ตัวอักษร (รวมภาษาไทยและสระ/วรรณยุกต์ซึ่งเป็น combining mark) ตัวเลข จุด ขีด ขีดล่าง */
const SLUG = /^[\p{L}\p{M}\p{N}._-]+$/u;

export function canonicalGroupUrl(id: string): string {
  return `https://www.facebook.com/groups/${encodeURIComponent(id)}`;
}

/** ลิงก์เปิดกลุ่มแบบ "โพสต์ใหม่" เพื่อให้ bookmarklet อ่านตามลำดับเวลา */
export function chronologicalGroupUrl(id: string): string {
  return `${canonicalGroupUrl(id)}/?sorting_setting=CHRONOLOGICAL`;
}

export function parseGroupUrl(input: string): GroupUrlResult {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: 'empty' };

  // รหัสกลุ่มตัวเลขล้วน (คัดลอกมาจากที่อื่น)
  if (/^\d{5,20}$/.test(raw)) return ok(raw);

  let u: URL;
  try {
    u = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { ok: false, reason: 'notFacebook' };
  }

  if (!FB_HOSTS.test(u.hostname)) return { ok: false, reason: 'notFacebook' };

  const parts = u.pathname.split('/').filter(Boolean);
  if (parts[0] === 'share' && (parts[1] === 'g' || parts[1] === 'p')) return { ok: false, reason: 'shareLink' };

  const gi = parts.findIndex((p) => p.toLowerCase() === 'groups');
  if (gi === -1) {
    // ลิงก์โพสต์แบบเก่า: /permalink.php?id=GROUP_ID หรือ ?group_id=
    const qid = u.searchParams.get('group_id');
    if (qid && /^\d+$/.test(qid)) return ok(qid);
    return { ok: false, reason: 'notGroup' };
  }

  let seg = parts[gi + 1];
  if (!seg) return { ok: false, reason: 'missingId' };
  try {
    seg = decodeURIComponent(seg);
  } catch {
    return { ok: false, reason: 'missingId' };
  }
  if (RESERVED.has(seg.toLowerCase())) return { ok: false, reason: 'missingId' };
  if (!SLUG.test(seg)) return { ok: false, reason: 'missingId' };

  return ok(/^\d+$/.test(seg) ? seg : seg.toLowerCase());
}

function ok(id: string): GroupUrlResult {
  return { ok: true, id, url: canonicalGroupUrl(id) };
}
