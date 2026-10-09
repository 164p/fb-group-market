// แยกราคาจากข้อความโพสต์ขายภาษาไทย
//
// วิธีคิด: หาตัวเลขทุกตัวในข้อความ แล้วให้คะแนนจากบริบทรอบๆ
//   + คำนำหน้าแบบราคา (ราคา, ขาย, ปล่อย, เหลือ, ฿) และคำต่อท้าย (บาท, บ., .-, ฿)
//   + ตัวเลขที่อยู่บรรทัดเดียวโดดๆ หรือท้ายบรรทัดชื่อสินค้า
//   − ตัวเลขที่เป็นสเปก (128GB, 18k ชัต, 10 นิ้ว), จำนวน (3 ชิ้น), รุ่น (S23, V8), ปี, เบอร์โทร
//   − ราคาเดิม/ราคาเต็ม/ซื้อมา (ไม่ใช่ราคาขาย)
// แล้วเลือกตัวที่คะแนนสูงสุด

import type { PriceType } from '../types';

export interface PriceResult {
  price: number | null;
  priceMin: number | null;
  priceMax: number | null;
  priceType: PriceType;
  /** ข้อความราคาตามต้นฉบับ เช่น "1,500.-" */
  priceText: string | null;
  /** ตำแหน่งของข้อความราคาในต้นฉบับ (ใช้ตัดราคาออกจากชื่อสินค้า) */
  span: [number, number] | null;
}

const EMPTY: PriceResult = { price: null, priceMin: null, priceMax: null, priceType: 'unknown', priceText: null, span: null };

/* ------------------------------------------------------------ keyword sets */

const NEGOTIABLE =
  /(ต่อรองได้|ต่อได้|ต่อรองราคา|คุยได้|คุยกันได้|ราคาคุยกัน|คุยราคา|สอบถามราคา|ถามราคา|ทัก(?:แชท|มา|ไลน์|inbox|ib)?\S{0,6}ราคา|ราคา(?:ทัก|inbox|ib|ใน\s*inbox)|ราคาเป็นกันเอง|เสนอราคา|ให้ราคา|best offer|\bobo\b|negotiable)/i;
const NOT_NEGOTIABLE = /(ไม่ต่อ|ต่อไม่ได้|งดต่อ|ราคาตายตัว|ขาดตัว|no nego)/i;
const FREE = /(แจกฟรี|ให้ฟรี|ฟรี\s*ไม่คิด|ไม่คิดเงิน|give\s*away|\bfree\b(?!\s*ship))/i;

/** หลังตัวเลข: เป็นหน่วยของสเปก/จำนวน ไม่ใช่ราคา */
const UNIT_AFTER =
  /^\s?(?:gb|tb|mb|mm|cm|btu|rpm|dpi|มม\.?|ซม\.?|นิ้ว|in\b|"|”|″|กก\.?|kg|กรัม|g\b|ลิตร|l\b|ml|มล\.?|mah|w\b|วัตต์|watt|%|เปอร์|ชิ้น|ใบ|ตัว|อัน|คู่|เครื่อง|เส้น|แผ่น|ก้อน|กล่อง|ห่อ|ซอง|คัน|หลัง|ห้อง|คน|ท่าน|ที่นั่ง|ชั้น|ประตู|คิว|ฟุต|ft|เมตร|ม\.|km|กม\.?|กิโล|hz|mp|cc|v\b|โวลต์|ครั้ง|ปี|เดือน|วัน|ชม|ชั่วโมง|นาที|ขวบ|รอบ|core|คอร์|bit|บิต|gen|th\b|st\b|nd\b|rd\b|x\s?\d|×|\*\s?\d|:\d|\/\d|ข้อ|ลูก|ต้น|กระถาง|เล่ม|แพ็ค|pack|pcs|ea\b|ไซส์|size|ปอนด์|lb)/i;

/** ก่อนตัวเลข: ตัวเลขนี้เป็นสเปก/คุณลักษณะ */
const SPEC_BEFORE =
  /(ชัต(?:เตอร์)?|shutter|แบต(?:เตอรี่)?|battery|ความจุ|ขนาด|ไซส์|size|รุ่น|series|gen|ปี|ใช้มา|ใช้ไป|ประกัน(?:เหลือ)?|ระยะ|เลข|เบอร์|no\.?|#|ram|rom|จอ|รหัส|ไมล์|mile|โมเดล|model|ver\.?|version|ios|android|จำนวน|ยาว|กว้าง|สูง|หนา|น้ำหนัก|อายุ|ล็อต|lot|สต็อก|stock|ซม|เบอร์)\s*:?\s*$/i;

/** ก่อนตัวเลข: เป็นราคาเดิม ไม่ใช่ราคาขาย */
const ORIGINAL_BEFORE =
  /(ราคาเต็ม|เต็มป้าย|ป้าย|ซื้อมา(?:ราคา|ในราคา)?|ราคาซื้อ|ปกติราคา|ราคาปกติ|ศูนย์ขาย|ราคาศูนย์|ราคาห้าง|ห้าง|จากราคา|จาก|เดิม|ราคาเดิม|เคยขาย|ทุน|มือ\s?1|ของใหม่ราคา|retail)\s*(?:ราคา)?\s*:?\s*฿?\s*$/i;

/** ก่อนตัวเลข: บอกว่าเป็นราคาขายแน่ๆ */
const STRONG_BEFORE = /(ราคา(?:ขาย|พิเศษ|เพียง|ปล่อย|เหมา)?|ลดเหลือ|เหลือ(?:เพียง)?|ปล่อย(?:ที่|ราคา)?|ขาย(?:ที่|ราคา|ถูก)?|เพียง|แค่|ละ|เหมา|price|ราคาละ|sale|รวม)\s*:?\s*(?:฿|thb|บ\.)?\s*$/i;
const CURRENCY_BEFORE = /(฿|thb|บาท)\s*$/i;
const CURRENCY_AFTER = /^\s?(บาท|บ\.(?!\S*\d)|บ(?![ก-๙])|฿|thb|baht|bht|\.-|-\.|\/-|,-|-(?!\s*\d)|=|\.?—)/i;

/** ราคาตามด้วยข้อมูลการส่ง เช่น "970รวมส่งems", "450 ส่งฟรี", "300+ส่ง" */
const SHIPPING_AFTER = /^\s?(?:\+\s?ส่ง|รวมส่ง|รวมค่าส่ง|ส่งฟรี|ฟรีส่ง|ไม่รวมส่ง|ยังไม่รวมส่ง|ems|kerry|flash|j&t|ไปรษณีย์)/i;

const MULTIPLIERS: [RegExp, number][] = [
  [/^\s?(k|K)(?![a-zA-Z])/, 1_000],
  [/^\s?พัน/, 1_000],
  [/^\s?หมื่น/, 10_000],
  [/^\s?แสน/, 100_000],
  [/^\s?ล้าน/, 1_000_000],
];

const RANGE_SEP = /^\s*(?:-|–|—|~|ถึง|to)\s*(?:฿|thb)?\s*$/i;

/* --------------------------------------------------------------- scanning */

interface Candidate {
  value: number;
  start: number;
  end: number;
  score: number;
  max?: number;
}

/** แทนเบอร์โทร/วันที่/เวลา ด้วยช่องว่าง (ความยาวเท่าเดิม) เพื่อไม่ให้ถูกนับเป็นราคา */
function maskNoise(text: string): string {
  const blank = (m: string) => ' '.repeat(m.length);
  return text
    .replace(/(?:\+66|\b0)[\d\s-]{8,12}\d/g, (m) => (m.replace(/\D/g, '').length >= 9 ? blank(m) : m))
    .replace(/\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b/g, blank)
    .replace(/\b\d{1,2}[:.]\d{2}\s*(?:น\.|นาฬิกา|am|pm)/gi, blank)
    .replace(/\b\d{1,2}:\d{2}\b/g, blank)
    .replace(/https?:\/\/\S+/g, blank)
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, blank);
}

const NUMBER = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g;

function readNumber(raw: string): number {
  return Number(raw.replace(/,/g, ''));
}

/** ตัวเลขถัดจาก pos (ข้ามช่องว่าง/ตัวคั่นช่วง) */
function readMultiplier(text: string, end: number): { mult: number; len: number } {
  const rest = text.slice(end, end + 6);
  for (const [re, mult] of MULTIPLIERS) {
    const m = rest.match(re);
    if (m) return { mult, len: m[0].length };
  }
  return { mult: 1, len: 0 };
}

function lineBounds(text: string, i: number): [number, number] {
  const s = text.lastIndexOf('\n', i - 1) + 1;
  const e = text.indexOf('\n', i);
  return [s, e === -1 ? text.length : e];
}

function scan(original: string): Candidate[] {
  const text = maskNoise(original);
  const lower = text.toLowerCase();

  const out: Candidate[] = [];
  const consumed = new Set<number>();

  for (const m of text.matchAll(NUMBER)) {
    const start = m.index!;
    if (consumed.has(start)) continue;
    const prevChar = text[start - 1] ?? ' ';
    // ติดกับตัวอักษรละติน/ตัวเลข/จุด/ทับ → เป็นชื่อรุ่น เช่น S23, V8, f/1.8, X-T30
    if (/[a-zA-Z0-9./]/.test(prevChar)) continue;
    if (prevChar === '-' && /[a-zA-Z]/.test(text[start - 2] ?? '')) continue;

    let end = start + m[0].length;
    const { mult, len } = readMultiplier(text, end);
    let value = readNumber(m[0]) * mult;
    end += len;
    // ตัวเลขทศนิยมไม่มีตัวคูณ (เช่น 6.8 นิ้ว, f1.4) ไม่ใช่ราคา
    if (mult === 1 && m[0].includes('.') && !m[0].includes(',')) continue;
    // ตัวอักษรละตินติดท้าย (เช่น 5G, 15mm) → สเปก
    if (mult === 1 && /^[a-zA-Z]/.test(text.slice(end)) && !/^(thb|baht)/i.test(text.slice(end))) continue;

    // ช่วงราคา: 500-800, 8,900 - 9,500, 3,500 ถึง 4,200
    let max: number | undefined;
    const after = text.slice(end, end + 12);
    const sep = after.match(/^\s*(?:-|–|—|~|ถึง|to)\s*(?:฿|thb)?\s*/i);
    if (sep && RANGE_SEP.test(sep[0])) {
      const rest = text.slice(end + sep[0].length);
      const m2 = rest.match(/^(\d{1,3}(?:,\d{3})+|\d+)/);
      if (m2) {
        const mult2 = readMultiplier(text, end + sep[0].length + m2[0].length);
        let hi = readNumber(m2[0]) * mult2.mult;
        // "1.5-2k" → ตัวคูณของตัวหลังใช้กับตัวหน้าด้วย
        if (mult === 1 && mult2.mult > 1 && value < hi / mult2.mult + 1) value *= mult2.mult;
        if (hi > value && hi <= value * 5) {
          max = hi;
          consumed.add(end + sep[0].length);
          end = end + sep[0].length + m2[0].length + mult2.len;
        } else {
          hi = 0;
        }
      }
    }

    const [ls, le] = lineBounds(text, start);
    const before = lower.slice(Math.max(ls, start - 18), start);
    const tail = lower.slice(end, Math.min(le, end + 10));

    let score = 0;
    if (value >= 100 || m[0].includes(',')) score += 1;
    if (value < 10 && mult === 1) score -= 3;

    if (ORIGINAL_BEFORE.test(before)) score -= 8;
    else if (STRONG_BEFORE.test(before)) score += 6;
    else if (CURRENCY_BEFORE.test(before)) score += 5;
    if (SPEC_BEFORE.test(before) && !STRONG_BEFORE.test(before)) score -= 5;

    if (CURRENCY_AFTER.test(tail)) score += 5;
    else if (SHIPPING_AFTER.test(tail)) score += 4;
    else if (UNIT_AFTER.test(tail)) score -= 8;
    if (/^\s?k\b/i.test(lower.slice(start + m[0].length)) && /(ชัต|shutter|ไมล์|mile|km|กม)/i.test(before)) score -= 10;

    // ปีพุทธศักราช/คริสต์ศักราชโดดๆ
    if (mult === 1 && max === undefined && /^\d{4}$/.test(m[0]) && ((value >= 2500 && value <= 2600) || (value >= 1990 && value <= 2035))) {
      if (!CURRENCY_AFTER.test(tail) && !CURRENCY_BEFORE.test(before) && !STRONG_BEFORE.test(before)) score -= 4;
    }

    // บรรทัดที่มีแค่ราคา เช่น "4,500" หรือ "฿1,500.-"
    const lineRest = (lower.slice(ls, start) + lower.slice(end, le)).replace(
      /[\s฿.\-,:=*!+✅💰🔥📌💵]|\p{Extended_Pictographic}|บาท|บ\.|thb|baht|ราคา|price|ต่อรองได้|ต่อได้|ไม่ต่อ(?:รอง)?|ขาดตัว|ค่ะ|ครับ|คับ|คะ|นะ|จ้า|เท่านั้น|(?:ยังไม่|ไม่)?รวม(?:ค่า)?ส่ง(?:แล้ว)?|ส่งฟรี|ฟรีส่ง|ems|kerry|flash|net|สุทธิ/gu,
      '',
    );
    if (lineRest === '') score += 4;
    // ตัวเลขท้ายบรรทัดชื่อสินค้า เช่น "iPhone 11 7500" หรือ "เครื่องกรองน้ำ Coway 3,200"
    else if (
      lower
        .slice(end, le)
        .replace(/ขายแล้ว|ขายไปแล้ว|sold|จองแล้ว|ติดจอง|ปิดการขาย|[\s.!)]/g, '') === '' &&
      value >= 100 &&
      /[\p{L}]/u.test(lower.slice(ls, start))
    )
      score += 2;

    if (value <= 0 || value > 50_000_000) continue;
    out.push({ value, start, end, score, max });
  }
  return out;
}

/** ขยายช่วงข้อความราคาให้ครอบสัญลักษณ์สกุลเงินด้านหน้า/หลัง */
function priceTextOf(text: string, c: Candidate): { text: string; span: [number, number] } {
  let s = c.start;
  let e = c.end;
  const pre = text.slice(Math.max(0, s - 4), s).match(/(฿|thb)\s*$/i);
  if (pre) s -= pre[0].length;
  const post = text.slice(e, e + 6).match(/^\s?(บาท|บ\.|฿|thb|baht|\.-|-\.|\/-|,-)/i);
  if (post) e += post[0].length;
  return { text: text.slice(s, e).trim(), span: [s, e] };
}

/* ------------------------------------------------------------------ public */

export function parsePrice(text: string, structuredPrice?: string): PriceResult {
  // โพสต์ขายแบบมีฟอร์ม: Facebook แสดงราคาแยก น่าเชื่อถือที่สุด
  if (structuredPrice) {
    const s = parsePrice(structuredPrice);
    if (s.price != null || /ฟรี|free/i.test(structuredPrice)) {
      const negotiable = NEGOTIABLE.test(text) && !NOT_NEGOTIABLE.test(text);
      if (s.price == null) return { ...EMPTY, price: 0, priceMin: 0, priceMax: 0, priceType: 'fixed', priceText: structuredPrice.trim() };
      return { ...s, priceType: s.priceType === 'range' ? 'range' : negotiable ? 'negotiable' : 'fixed', span: null };
    }
  }

  const negotiable = NEGOTIABLE.test(text) && !NOT_NEGOTIABLE.test(text);
  const candidates = scan(text);
  let best: Candidate | undefined;
  for (const c of candidates) if (!best || c.score > best.score) best = c;

  if (!best || best.score < 3) {
    if (FREE.test(text)) return { ...EMPTY, price: 0, priceMin: 0, priceMax: 0, priceType: 'fixed', priceText: 'ฟรี' };
    return { ...EMPTY, priceType: negotiable ? 'negotiable' : 'unknown' };
  }

  const { text: priceText, span } = priceTextOf(text, best);
  if (best.max !== undefined) {
    return {
      price: Math.round((best.value + best.max) / 2),
      priceMin: best.value,
      priceMax: best.max,
      priceType: 'range',
      priceText,
      span,
    };
  }
  return {
    price: best.value,
    priceMin: best.value,
    priceMax: best.value,
    priceType: negotiable ? 'negotiable' : 'fixed',
    priceText,
    span,
  };
}
