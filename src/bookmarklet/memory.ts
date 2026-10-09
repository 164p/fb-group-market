// ความจำของปุ่มดึงสินค้า (เก็บใน localStorage ของ facebook.com บนเครื่องผู้ใช้)
// - ส่งตรงไปหน้าต่างเว็บแอปได้ไหม: ถ้าไม่ได้ ครั้งหน้าจะข้ามการรอ 6 วินาที
// - post id ที่เคยดึงต่อกลุ่ม: ใช้กับ "หยุดเมื่อเจอโพสต์ที่เคยดึงแล้ว" แม้ส่งตรงไม่ได้

const DIRECT_KEY = 'fbgm:direct';
const SENT_PREFIX = 'fbgm:sent:';
const MAX_SENT = 3000;
const RETRY_DIRECT_AFTER_MS = 14 * 86_400_000;

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* พื้นที่เต็ม/ถูกบล็อก ไม่เป็นไร */
  }
}

/** เคยลองส่งตรงแล้วไม่สำเร็จเมื่อไม่นานนี้ → ข้ามไปใช้การส่งผ่านแท็บใหม่เลย */
export function directKnownToFail(now = Date.now()): boolean {
  const r = read<{ ok: boolean; at: number } | null>(DIRECT_KEY, null);
  return !!r && !r.ok && now - r.at < RETRY_DIRECT_AFTER_MS;
}

export function rememberDirect(ok: boolean, now = Date.now()) {
  write(DIRECT_KEY, { ok, at: now });
}

export function loadSentIds(groupId: string): Set<string> {
  return new Set(read<string[]>(SENT_PREFIX + groupId, []));
}

export function saveSentIds(groupId: string, ids: Iterable<string>) {
  const merged = [...new Set([...ids, ...read<string[]>(SENT_PREFIX + groupId, [])])].slice(0, MAX_SENT);
  write(SENT_PREFIX + groupId, merged);
}
