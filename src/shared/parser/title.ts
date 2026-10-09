// แยกชื่อสินค้าจากโพสต์

const MAX_LEN = 80;

/** อีโมจิ สัญลักษณ์ตกแต่ง */
const DECOR = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}★☆●○◆◇■□▶►▪•·※→←↑↓✓✔✅❌❗❕‼️⭐️]/gu;

/** คำขึ้นต้นที่ไม่ใช่ชื่อสินค้า */
const LEAD =
  /^(?:[[(]?\s*(?:ขออนุญาต(?:แอด(?:มิน)?|ลง)?(?:ขาย)?|ขาย(?:ด่วน|ถูก|ต่อ|แล้ว)?|ปล่อย(?:ต่อ)?|ส่งต่อ|มือสอง|มือ\s?2|sold(?:\s*out)?|wts|fs|for\s*sale|sale|sell(?:ing)?|ด่วน|ลดราคา|ราคาดี|ของดี|มาแล้ว|ขายค่ะ|ขายครับ|ขายคะ|ขายนะ)\s*\]?\s*[:：\-–—|/]?\s*)+/i;

/** บรรทัดที่ไม่ใช่ชื่อสินค้าแน่ๆ */
const SKIP_LINE =
  /^(?:ขาย(?:ค่ะ|ครับ|คะ|นะ|จ้า|จ้ะ)?|ปล่อย(?:ค่ะ|ครับ)?|มือสอง|ด่วน|สวัสดี.*|สนใจ.*|ราคา\s*[:：]?.*|ส่งฟรี.*|นัดรับ.*|โอนก่อน.*|ไม่รับ.*|ติดต่อ.*|tel.*|โทร.*|line.*|ไลน์.*|#.*|\.+|-+|=+|ขายแล้ว.*|sold.*)$/i;

/** คำลงท้ายสุภาพท้ายชื่อ เช่น "…แผ่นครับบ", "…เองค่ะ" */
const TRAILING_PARTICLE = /\s*(?:นะ)?(?:ค่ะ+|คะ+|ครับ+|คับ+|ค่า+|จ้า+|จ้ะ|น้า+|ฮะ)\s*$/;

export function clean(line: string): string {
  return line
    .replace(DECOR, ' ')
    .replace(/#[^\s#]+/g, ' ')
    .replace(/[*_~`]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(LEAD, '')
    .replace(/^[\s:：\-–—|/.,]+|[\s:：\-–—|/,]+$/g, '')
    .replace(TRAILING_PARTICLE, '')
    .trim();
}

export function truncate(s: string): string {
  if (s.length <= MAX_LEN) return s;
  const cut = s.slice(0, MAX_LEN);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > MAX_LEN * 0.6 ? cut.slice(0, sp) : cut).trim()}…`;
}

/**
 * @param text ข้อความโพสต์
 * @param priceSpan ตำแหน่งข้อความราคาที่เลือก — ถ้าอยู่ในบรรทัดชื่อจะตัดออก เช่น "iPhone 11 64GB 7,500 บาท" → "iPhone 11 64GB"
 */
export function parseTitle(text: string, structuredTitle?: string, priceSpan?: [number, number] | null): string {
  if (structuredTitle?.trim()) return truncate(clean(structuredTitle) || structuredTitle.trim());

  let offset = 0;
  for (const raw of text.split('\n')) {
    const lineStart = offset;
    offset += raw.length + 1;

    let line = raw;
    // ตัดราคาออกจากบรรทัดนี้ถ้าราคาอยู่ในบรรทัดเดียวกัน (พร้อมคำว่า "ราคา" ด้านหน้า)
    if (priceSpan && priceSpan[0] >= lineStart && priceSpan[1] <= lineStart + raw.length) {
      const s = priceSpan[0] - lineStart;
      const head = raw.slice(0, s).replace(/(?:ราคา|ขาย|ปล่อย|เหลือ|เพียง|พิเศษ|เหมา|ลด|ถูก|price)+\s*:?\s*฿?\s*$/i, '');
      const rest = raw.slice(priceSpan[1] - lineStart);
      line = clean(head).length >= 3 ? head : `${head} ${rest}`;
    }

    // ตัดส่วนราคาอื่นๆ ที่ตามมาในบรรทัดชื่อ เช่น "Dyson V8 ซื้อมา 15,900 ปล่อย 6,900"
    const intro = line.search(/\s(?:ราคา|ซื้อมา|ปล่อย|ขาย(?:ที่|เพียง)|ลดเหลือ|เหลือ|เต็มป้าย|จาก)\s*:?\s*฿?\s*\d/);
    if (intro > 0 && clean(line.slice(0, intro)).length >= 3) line = line.slice(0, intro);

    const c = clean(line);
    if (c.length < 2) continue;
    if (SKIP_LINE.test(c)) continue;
    // บรรทัดอย่าง "ขายแล้วค่ะ" → หลังตัดคำนำหน้าเหลือแค่คำลงท้าย
    if (SKIP_LINE.test(line.replace(DECOR, ' ').trim())) continue;
    if (/^(ค่ะ|ครับ|คะ|นะ|จ้า|จ้ะ|น้า|ค่า|คับ)$/.test(c)) continue;
    // บรรทัดที่มีแต่ตัวเลข/สัญลักษณ์
    if (!/[\p{L}]/u.test(c)) continue;
    return truncate(c);
  }

  const fallback = clean(text.replace(/\n/g, ' '));
  return truncate(fallback || 'ไม่มีชื่อสินค้า');
}
