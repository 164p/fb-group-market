// แยกโพสต์ที่ขายหลายรายการ เช่น
//   แผ่นเกม Switch มือ2
//   -Mario Kart 8 สภาพสะสม
//   970รวมส่ง
//   -Dragon Quest Treasures 720รวมส่ง
// → 2 รายการ แต่ละรายการมีชื่อและราคาของตัวเอง
//
// กฎ:
// - บรรทัดที่มี "ชื่อ + ราคา" = 1 รายการ
// - บรรทัดที่มี "ราคาอย่างเดียว" = ราคาของบรรทัดชื่อก่อนหน้าทันที
// - บรรทัดสั้นๆ ที่ตามด้วยรายการ เช่น "มือ1 ไม่แกะซีล" = หมวดย่อย (itemNote) ของรายการที่ตามมา
// - บรรทัดแรกที่ไม่ใช่รายการ = หัวข้อโพสต์ (postTitle)
// - แยกเมื่อพบอย่างน้อย 2 รายการเท่านั้น ไม่อย่างนั้นถือเป็นโพสต์ขายรายการเดียว
import { parsePrice, type PriceResult } from './price';
import { parseStatus } from './status';
import { clean, truncate } from './title';

export interface ParsedItem {
  title: string;
  price: PriceResult;
  text: string;
  note?: string;
  sold: boolean;
}

export interface SplitResult {
  postTitle?: string;
  items: ParsedItem[];
}

const MAX_ITEMS = 40;

/** คำที่เกี่ยวกับราคา/การส่ง — ตัดออกแล้วถ้าไม่เหลือตัวอักษร แปลว่าบรรทัดนั้นมีแต่ราคา */
const PRICE_WORDS =
  /ราคา|price|ขาย|ปล่อย|เหลือ|เพียง|พิเศษ|เหมา|ลด|(?:ยังไม่|ไม่)?รวม(?:ค่า)?ส่ง(?:แล้ว)?|ส่งฟรี|ฟรีส่ง|\+\s?ส่ง|ems|kerry|flash|j&t|บาท|บ\.|thb|baht|ต่อรองได้|ต่อได้|ไม่ต่อ(?:รอง)?|เท่านั้น|ค่ะ|ครับ|คับ|คะ|นะ|จ้า|net|สุทธิ/gi;

/** บรรทัดที่เป็นค่าส่ง/ติดต่อ/เงื่อนไข ไม่ใช่สินค้า */
const NOT_ITEM =
  /^(?:ค่าส่ง|ค่าจัดส่ง|ส่ง\s*(?:ems|kerry|flash|j&t|ไปรษณีย์|ด่วน)|โทร|tel|line|ไลน์|ติดต่อ|สนใจ|นัดรับ|ถ้านัดรับ|รับเอง|โอน|ไม่รับ|เงื่อนไข|หมายเหตุ|ps\b|#)/i;

const SOLD_LINE = /(ขายแล้ว|ปิดการขาย|ปิดขาย|\bsold\b|ได้เจ้าของแล้ว|หมดแล้ว)/i;

const letters = (s: string) => (s.match(/[\p{L}\p{M}]/gu) ?? []).length;

/** ทำความสะอาดแบบเบา (ไม่ตัดคำขึ้นต้นอย่าง "มือ2") ใช้กับหมวดย่อย */
const cleanLight = (s: string) =>
  s
    .replace(/[\p{Extended_Pictographic}\u{FE0F}*_~`•·●○◆■▪►▶]/gu, ' ')
    .replace(/^[\s\-–—:：|]+|[\s\-–—:：|]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

interface LineInfo {
  raw: string;
  price: PriceResult | null;
  /** ชื่อสินค้าในบรรทัด (หลังตัดราคาออก) — ว่างถ้าบรรทัดมีแต่ราคา */
  name: string;
}

function analyze(raw: string): LineInfo {
  const line = raw.trim();
  if (!line || NOT_ITEM.test(clean(line))) return { raw: line, price: null, name: '' };
  const p = parsePrice(line);
  const hasPrice = p.price != null && p.span != null;
  if (!hasPrice) return { raw: line, price: null, name: clean(line) || cleanLight(line) };
  const [s, e] = p.span!;
  const rest = `${line.slice(0, s)} ${line.slice(e)}`;
  const name = clean(rest.replace(PRICE_WORDS, ' ').replace(/[()[\]:：=]+\s*$/g, ''));
  return { raw: line, price: p, name: letters(name) >= 2 ? clean(line.slice(0, s).replace(/(?:ราคา|ขาย|ปล่อย|เหลือ|เพียง|เหมา|price)\s*:?\s*฿?\s*$/i, '')) || name : '' };
}

export function splitItems(text: string): SplitResult | null {
  const lines = text.split('\n').map(analyze);
  const items: ParsedItem[] = [];
  let prevName: { idx: number; name: string } | null = null;
  let note: string | undefined;
  let postTitle: string | undefined;
  let firstItemLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (!L.raw) {
      prevName = null;
      continue;
    }

    if (L.price && L.name) {
      // ชื่อ + ราคาในบรรทัดเดียว
      if (firstItemLine < 0) firstItemLine = i;
      items.push({ title: L.name, price: L.price, text: L.raw, note, sold: SOLD_LINE.test(L.raw) });
      prevName = null;
      continue;
    }

    if (L.price && !L.name) {
      // ราคาอย่างเดียว → ของบรรทัดชื่อก่อนหน้าทันที
      if (prevName && prevName.idx === i - 1) {
        if (firstItemLine < 0) firstItemLine = prevName.idx;
        const prevRaw = lines[prevName.idx].raw;
        items.push({ title: prevName.name, price: L.price, text: `${prevRaw}\n${L.raw}`, note, sold: SOLD_LINE.test(prevRaw + L.raw) });
      }
      prevName = null;
      continue;
    }

    // บรรทัดไม่มีราคา
    if (!L.name || letters(L.name) < 2) {
      prevName = null;
      continue;
    }
    const next = lines.slice(i + 1).find((x) => x.raw);
    const nextIsNamedItem = !!next?.price && !!next.name;
    if (nextIsNamedItem && L.name.length <= 30 && items.length + (postTitle ? 1 : 0) > 0) {
      // หมวดย่อยของรายการที่ตามมา เช่น "มือ1 ไม่แกะซีล", "มือ2"
      note = cleanLight(L.raw);
      prevName = null;
      continue;
    }
    if (!postTitle && items.length === 0 && !(next?.price && !next.name)) {
      // บรรทัดแรกที่ไม่ได้เป็นชื่อรายการ = หัวข้อโพสต์
      postTitle = L.name;
      prevName = null;
      continue;
    }
    prevName = { idx: i, name: L.name };
  }

  if (items.length < 2 || items.length > MAX_ITEMS) return null;
  // ทุกรายการต้องชื่อไม่ซ้ำกัน (กันกรณีแยกผิดจากบรรทัดคำอธิบาย)
  if (new Set(items.map((x) => x.title.toLowerCase())).size < items.length) return null;

  const postSold = parseStatus(text) === 'sold' && !items.some((x) => x.sold);
  return {
    postTitle: postTitle ? truncate(postTitle) : undefined,
    items: items.map((x) => ({ ...x, title: truncate(x.title), sold: x.sold || postSold })),
  };
}
