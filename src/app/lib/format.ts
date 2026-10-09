import type { Listing } from '../../shared/types';

const num = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });
export const formatBaht = (n: number) => num.format(n);

export interface PriceDisplay {
  /** ข้อความหลักบนป้ายราคา */
  main: string;
  /** คำอธิบายเล็กใต้ราคา (ถ้ามี) */
  note?: string;
  /** ไม่มีตัวเลขราคา */
  empty: boolean;
}

export function formatPrice(l: Pick<Listing, 'price' | 'priceMin' | 'priceMax' | 'priceType'>): PriceDisplay {
  if (l.priceType === 'range' && l.priceMin != null && l.priceMax != null && l.priceMin !== l.priceMax) {
    return { main: `${formatBaht(l.priceMin)}–${formatBaht(l.priceMax)}`, empty: false };
  }
  if (l.price != null) {
    return { main: formatBaht(l.price), note: l.priceType === 'negotiable' ? 'ต่อรองได้' : undefined, empty: false };
  }
  if (l.priceType === 'negotiable') return { main: 'คุยราคา', empty: true };
  return { main: 'ไม่ระบุราคา', empty: true };
}

const rtf = new Intl.RelativeTimeFormat('th', { numeric: 'auto' });
const dateFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' });
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "5 นาทีที่ผ่านมา", "3 ชั่วโมงที่ผ่านมา", "เมื่อวาน", เกิน 7 วันแสดงวันที่ */
export function relativeTime(ts: number | null, now = Date.now()): string | null {
  if (ts == null) return null;
  const diff = now - ts;
  if (diff < MIN) return 'เมื่อสักครู่';
  if (diff < HOUR) return rtf.format(-Math.floor(diff / MIN), 'minute');
  if (diff < DAY) return rtf.format(-Math.floor(diff / HOUR), 'hour');
  if (diff < 7 * DAY) return rtf.format(-Math.floor(diff / DAY), 'day');
  return dateFmt.format(ts);
}
