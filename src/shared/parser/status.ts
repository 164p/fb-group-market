import type { ListingStatus } from '../types';

const SOLD = /(ขายแล้ว|ขายไปแล้ว|ปิดการขาย|ปิดขาย|ปิดดีล|ได้เจ้าของแล้ว|มีเจ้าของแล้ว|หมดแล้ว|ของหมด|\bsold\b|sold\s*out|\[sold\]|\(sold\))/i;
/** ประโยคปฏิเสธที่มีคำว่าขายแล้ว เช่น "ยังไม่ขาย", "ยังไม่ได้ขายแล้ว" */
const NOT_SOLD = /(ยังไม่(?:ได้)?ขาย|ยังไม่ปิด|ยังไม่หมด|ไม่ได้ขายแล้ว|not\s+sold|unsold|ยังว่าง|ยังอยู่|ยังมี)/i;

/** ดูว่าโพสต์ระบุว่าขายแล้วหรือยัง */
export function parseStatus(text: string): ListingStatus {
  if (!SOLD.test(text)) return 'available';
  // ถ้าเจอทั้งสองแบบ ให้ดูว่าคำไหนอยู่หลังสุด (มักเป็นการแก้ไขโพสต์ล่าสุด)
  if (NOT_SOLD.test(text)) {
    const lastSold = lastIndex(text, SOLD);
    const lastNot = lastIndex(text, NOT_SOLD);
    return lastSold > lastNot ? 'sold' : 'available';
  }
  return 'sold';
}

function lastIndex(text: string, re: RegExp): number {
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let last = -1;
  for (const m of text.matchAll(g)) last = m.index!;
  return last;
}
