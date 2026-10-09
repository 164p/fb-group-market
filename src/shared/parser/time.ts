// แปลงข้อความเวลาของ Facebook เป็นเวลาโดยประมาณ (epoch ms) ตามเวลาท้องถิ่นของเครื่อง
// รองรับ: "เมื่อสักครู่", "5 นาที", "3 ชม.", "2 วัน", "1 สัปดาห์", "เมื่อวานนี้ เวลา 14:30 น.",
//         "5 ตุลาคม เวลา 10:15 น.", "5 ต.ค. 2567", "Just now", "3h", "Yesterday at 2:30 PM", "October 5 at 10:15 AM"

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const TH_MONTHS: [RegExp, number][] = [
  [/^(มกราคม|ม\.?ค\.?)/, 0],
  [/^(กุมภาพันธ์|ก\.?พ\.?)/, 1],
  [/^(มีนาคม|มี\.?ค\.?)/, 2],
  [/^(เมษายน|เม\.?ย\.?)/, 3],
  [/^(พฤษภาคม|พ\.?ค\.?)/, 4],
  [/^(มิถุนายน|มิ\.?ย\.?)/, 5],
  [/^(กรกฎาคม|ก\.?ค\.?)/, 6],
  [/^(สิงหาคม|ส\.?ค\.?)/, 7],
  [/^(กันยายน|ก\.?ย\.?)/, 8],
  [/^(ตุลาคม|ต\.?ค\.?)/, 9],
  [/^(พฤศจิกายน|พ\.?ย\.?)/, 10],
  [/^(ธันวาคม|ธ\.?ค\.?)/, 11],
];
const EN_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** อ่าน "เวลา 14:30 น." / "at 2:30 PM" → [ชั่วโมง, นาที] */
function clock(s: string): [number, number] | null {
  const m = s.match(/(\d{1,2})[:.](\d{2})\s*(am|pm|น\.)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return h < 24 && min < 60 ? [h, min] : null;
}

function atDate(base: Date, t: [number, number] | null): number {
  const d = new Date(base);
  if (t) d.setHours(t[0], t[1], 0, 0);
  else d.setHours(12, 0, 0, 0);
  return d.getTime();
}

export function parsePostedTime(text: string | undefined | null, now: number): number | null {
  if (!text) return null;
  const s = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return null;

  if (/^(เมื่อสักครู่|เมื่อกี้|just now|now)$/.test(s)) return now;

  // ค่าสัมพัทธ์: "5 นาที", "3 ชม.", "2 วัน", "1 สัปดาห์", "5m", "3h", "2d", "1w"
  const rel = s.match(
    /^(\d+)\s*(นาที|น\.|m|min|mins|minutes?|ชม\.?|ชั่วโมง|h|hr|hrs|hours?|วัน|d|days?|สัปดาห์|อาทิตย์|w|wk|weeks?|ปี|y|yr|years?)(?:\s*(?:ที่แล้ว|ago|ที่ผ่านมา))?$/,
  );
  if (rel) {
    const n = Number(rel[1]);
    const u = rel[2];
    if (/^(นาที|น\.|m|min)/.test(u)) return now - n * MIN;
    if (/^(ชม|ชั่วโมง|h)/.test(u)) return now - n * HOUR;
    if (/^(วัน|d)/.test(u)) return now - n * DAY;
    if (/^(สัปดาห์|อาทิตย์|w)/.test(u)) return now - n * 7 * DAY;
    if (/^(ปี|y)/.test(u)) return now - n * 365 * DAY;
  }

  const t = clock(s);

  if (/^(เมื่อวาน|yesterday)/.test(s)) {
    const d = new Date(now - DAY);
    return atDate(d, t);
  }
  if (/^(วันนี้|today)/.test(s)) return atDate(new Date(now), t);

  // วันที่: "5 ตุลาคม", "5 ต.ค. 2567", "5 ตุลาคม 2024 เวลา 10:15 น."
  let day: number | undefined;
  let month: number | undefined;
  let year: number | undefined;
  const th = s.match(/^(\d{1,2})\s*([ก-๙.]+)\s*(\d{4})?/);
  if (th) {
    const mm = TH_MONTHS.find(([re]) => re.test(th[2]));
    if (mm) {
      day = Number(th[1]);
      month = mm[1];
      if (th[3]) year = Number(th[3]);
    }
  }
  if (month === undefined) {
    // "October 5", "Oct 5, 2024", "5 October 2024"
    const en1 = s.match(/^([a-z]{3,9})\.? (\d{1,2})(?:, (\d{4}))?/);
    const en2 = s.match(/^(\d{1,2}) ([a-z]{3,9})(?: (\d{4}))?/);
    const pick = en1 ? { mon: en1[1], d: en1[2], y: en1[3] } : en2 ? { mon: en2[2], d: en2[1], y: en2[3] } : null;
    if (pick) {
      const mi = EN_MONTHS.indexOf(pick.mon.slice(0, 3));
      if (mi >= 0) {
        day = Number(pick.d);
        month = mi;
        if (pick.y) year = Number(pick.y);
      }
    }
  }
  if (month === undefined || day === undefined || day < 1 || day > 31) return null;

  const nowD = new Date(now);
  if (year !== undefined && year > 2400) year -= 543; // พ.ศ. → ค.ศ.
  let y = year ?? nowD.getFullYear();
  let d = new Date(y, month, day);
  // ไม่ระบุปีแต่วันที่อยู่ในอนาคต → เป็นของปีที่แล้ว
  if (year === undefined && d.getTime() > now + DAY) {
    y -= 1;
    d = new Date(y, month, day);
  }
  return atDate(d, t);
}
