// สถานะตัวกรองของหน้ารายการสินค้า — เก็บใน URL เพื่อบุ๊กมาร์ก/แชร์มุมมองได้
import type { Listing } from '../../../shared/types';

export type Within = '24h' | '3d' | '7d' | '30d' | 'all';
export type SortKey = 'newest' | 'priceAsc' | 'priceDesc' | 'relevance';
export type ViewMode = 'grid' | 'list';

export interface Filters {
  q: string;
  groups: string[];
  min: number | null;
  max: number | null;
  hasPrice: boolean;
  within: Within;
  showSold: boolean;
  favOnly: boolean;
  showHidden: boolean;
  sort: SortKey;
  view: ViewMode;
}

export const DEFAULT_FILTERS: Filters = {
  q: '',
  groups: [],
  min: null,
  max: null,
  hasPrice: false,
  within: 'all',
  showSold: false,
  favOnly: false,
  showHidden: false,
  sort: 'newest',
  view: 'grid',
};

export const WITHIN_OPTIONS: { value: Within; label: string; ms: number }[] = [
  { value: '24h', label: '24 ชม.', ms: 24 * 3_600_000 },
  { value: '3d', label: '3 วัน', ms: 3 * 86_400_000 },
  { value: '7d', label: '7 วัน', ms: 7 * 86_400_000 },
  { value: '30d', label: '30 วัน', ms: 30 * 86_400_000 },
  { value: 'all', label: 'ทั้งหมด', ms: Infinity },
];

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'โพสต์ใหม่สุด' },
  { value: 'priceAsc', label: 'ราคาต่ำ → สูง' },
  { value: 'priceDesc', label: 'ราคาสูง → ต่ำ' },
  { value: 'relevance', label: 'ตรงคำค้นที่สุด' },
];

export const PRICE_PRESETS: { label: string; min: number | null; max: number | null }[] = [
  { label: 'ไม่เกิน 1,000', min: null, max: 1000 },
  { label: '1,000–5,000', min: 1000, max: 5000 },
  { label: '5,000–20,000', min: 5000, max: 20000 },
  { label: '20,000 ขึ้นไป', min: 20000, max: null },
];

/* ------------------------------------------------------------ URL <-> state */

const toNum = (v: string | null): number | null => {
  if (v == null || v.trim() === '') return null;
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const pick = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

export function parseFilters(p: URLSearchParams): Filters {
  let min = toNum(p.get('min'));
  let max = toNum(p.get('max'));
  if (min != null && max != null && min > max) [min, max] = [max, min];
  return {
    q: p.get('q') ?? '',
    groups: (p.get('g') ?? '').split(',').filter(Boolean),
    min,
    max,
    hasPrice: p.get('price') === '1',
    within: pick(p.get('t'), WITHIN_OPTIONS.map((o) => o.value), 'all'),
    showSold: p.get('sold') === '1',
    favOnly: p.get('fav') === '1',
    showHidden: p.get('hidden') === '1',
    sort: pick(p.get('sort'), SORT_OPTIONS.map((o) => o.value), 'newest'),
    view: p.get('view') === 'list' ? 'list' : 'grid',
  };
}

/** แปลงกลับเป็น URL โดยใส่เฉพาะค่าที่ต่างจากค่าเริ่มต้น */
export function serializeFilters(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.groups.length) p.set('g', f.groups.join(','));
  if (f.min != null) p.set('min', String(f.min));
  if (f.max != null) p.set('max', String(f.max));
  if (f.hasPrice) p.set('price', '1');
  if (f.within !== 'all') p.set('t', f.within);
  if (f.showSold) p.set('sold', '1');
  if (f.favOnly) p.set('fav', '1');
  if (f.showHidden) p.set('hidden', '1');
  if (f.sort !== 'newest') p.set('sort', f.sort);
  if (f.view !== 'grid') p.set('view', f.view);
  return p;
}

/** จำนวนตัวกรองที่ใช้อยู่ (ไม่นับคำค้น การเรียง และมุมมอง) — ใช้แสดงบนปุ่มตัวกรองในมือถือ */
export function activeFilterCount(f: Filters): number {
  return (
    (f.groups.length ? 1 : 0) +
    (f.min != null || f.max != null ? 1 : 0) +
    (f.hasPrice ? 1 : 0) +
    (f.within !== 'all' ? 1 : 0) +
    (f.showSold ? 1 : 0) +
    (f.favOnly ? 1 : 0) +
    (f.showHidden ? 1 : 0)
  );
}

/* ------------------------------------------------------------------ apply */

/**
 * กรองและเรียงรายการ
 * @param hits ผลค้นหา (id → คะแนน) — ส่งเมื่อมีคำค้นเท่านั้น
 */
export function applyFilters(listings: Listing[], f: Filters, now: number, hits?: Map<string, number>): Listing[] {
  const within = WITHIN_OPTIONS.find((o) => o.value === f.within)!.ms;
  const groups = f.groups.length ? new Set(f.groups) : null;
  const priceFiltered = f.min != null || f.max != null;

  const out = listings.filter((l) => {
    if (l.hidden && !f.showHidden) return false;
    if (f.favOnly && !l.favorite) return false;
    if (!f.showSold && l.status === 'sold') return false;
    if (groups && !groups.has(l.groupId)) return false;
    if (within !== Infinity && (l.postedAt == null || now - l.postedAt > within)) return false;
    if ((f.hasPrice || priceFiltered) && l.price == null) return false;
    if (priceFiltered) {
      // ช่วงราคาของสินค้าซ้อนทับกับช่วงที่เลือก ถือว่าตรง
      const lo = l.priceMin ?? l.price!;
      const hi = l.priceMax ?? l.price!;
      if (f.min != null && hi < f.min) return false;
      if (f.max != null && lo > f.max) return false;
    }
    if (hits && !hits.has(l.id)) return false;
    return true;
  });

  const newest = (a: Listing, b: Listing) =>
    (b.postedAt ?? b.firstSeenAt) - (a.postedAt ?? a.firstSeenAt) || a.id.localeCompare(b.id);
  // รายการไม่มีราคาไปท้ายเสมอ
  const byPrice = (dir: 1 | -1) => (a: Listing, b: Listing) => {
    if (a.price == null && b.price == null) return newest(a, b);
    if (a.price == null) return 1;
    if (b.price == null) return -1;
    return (a.price - b.price) * dir || newest(a, b);
  };

  switch (f.sort) {
    case 'priceAsc':
      return out.sort(byPrice(1));
    case 'priceDesc':
      return out.sort(byPrice(-1));
    case 'relevance':
      return hits ? out.sort((a, b) => hits.get(a.id)! - hits.get(b.id)! || newest(a, b)) : out.sort(newest);
    default:
      return out.sort(newest);
  }
}
