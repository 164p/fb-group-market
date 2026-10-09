import { describe, expect, it } from 'vitest';
import { buildSampleData } from '../../db/sample';
import { formatPrice, relativeTime } from '../../lib/format';
import { activeFilterCount, applyFilters, DEFAULT_FILTERS, parseFilters, serializeFilters, type Filters } from './filters';
import { buildSearchIndex, normalize } from './search';

const NOW = 1_760_000_000_000;
const { listings } = buildSampleData(NOW);
const run = (patch: Partial<Filters>, q?: string) => {
  const f = { ...DEFAULT_FILTERS, ...patch };
  const hits = q ? buildSearchIndex(listings).search(q) : undefined;
  return applyFilters(listings, f, NOW, hits);
};

describe('URL state', () => {
  it('round-trips non-default values and omits defaults', () => {
    const f: Filters = {
      ...DEFAULT_FILTERS,
      q: 'iphone',
      groups: ['a', 'b'],
      min: 1000,
      max: 5000,
      within: '7d',
      showSold: true,
      sort: 'priceAsc',
      view: 'list',
    };
    const p = serializeFilters(f);
    expect(parseFilters(p)).toEqual(f);
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe('');
  });

  it('ignores junk and swaps reversed price range', () => {
    const f = parseFilters(new URLSearchParams('min=9000&max=100&t=year&sort=x&view=table'));
    expect(f).toMatchObject({ min: 100, max: 9000, within: 'all', sort: 'newest', view: 'grid' });
    expect(parseFilters(new URLSearchParams('min=abc')).min).toBeNull();
  });

  it('counts active filters', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, min: 1, max: 2, groups: ['x'], q: 'not counted' })).toBe(2);
  });
});

describe('applyFilters', () => {
  it('hides sold by default and shows them on request', () => {
    const def = run({});
    expect(def.some((l) => l.status === 'sold')).toBe(false);
    expect(run({ showSold: true })).toHaveLength(listings.length);
  });

  it('sorts newest first by default', () => {
    const r = run({ showSold: true });
    for (let i = 1; i < r.length; i++) expect(r[i - 1].postedAt!).toBeGreaterThanOrEqual(r[i].postedAt!);
  });

  it('filters by price range with overlap and drops listings without price', () => {
    const r = run({ min: 1000, max: 5000, showSold: true });
    expect(r.length).toBeGreaterThan(0);
    for (const l of r) {
      expect(l.price).not.toBeNull();
      expect((l.priceMax ?? l.price!) >= 1000 && (l.priceMin ?? l.price!) <= 5000).toBe(true);
    }
    // เก้าอี้ช่วง 3,500–4,200 ต้องอยู่ในผล
    expect(r.some((l) => l.title.includes('Ergonomic'))).toBe(true);
  });

  it('sorts by price with no-price items last', () => {
    const asc = run({ sort: 'priceAsc' });
    const priced = asc.filter((l) => l.price != null);
    expect(asc.slice(0, priced.length)).toEqual(priced);
    for (let i = 1; i < priced.length; i++) expect(priced[i - 1].price!).toBeLessThanOrEqual(priced[i].price!);
    const desc = run({ sort: 'priceDesc', hasPrice: true });
    expect(desc[0].price).toBe(Math.max(...desc.map((l) => l.price!)));
  });

  it('filters by posted time window', () => {
    const r = run({ within: '24h', showSold: true });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((l) => NOW - l.postedAt! <= 86_400_000)).toBe(true);
  });

  it('filters by group, favorite and hidden', () => {
    const gid = listings[0].groupId;
    expect(run({ groups: [gid], showSold: true }).every((l) => l.groupId === gid)).toBe(true);

    const marked = listings.map((l, i) => ({ ...l, favorite: i < 3, hidden: i === 0 }));
    const f = { ...DEFAULT_FILTERS, showSold: true };
    expect(applyFilters(marked, f, NOW)).toHaveLength(listings.length - 1);
    expect(applyFilters(marked, { ...f, favOnly: true }, NOW)).toHaveLength(2);
    expect(applyFilters(marked, { ...f, favOnly: true, showHidden: true }, NOW)).toHaveLength(3);
  });
});

describe('search', () => {
  it('normalizes case, spaces and thousands separators', () => {
    expect(normalize('  iPhone   13  ราคา 12,900 ')).toBe('iphone 13 ราคา 12900');
  });

  it('matches Thai substrings without word segmentation', () => {
    const r = run({ showSold: true }, 'โต๊ะ');
    expect(r.length).toBeGreaterThanOrEqual(2);
    expect(r.every((l) => l.rawText.includes('โต๊ะ'))).toBe(true);
  });

  it('requires every term (AND) for exact matches', () => {
    const r = run({ showSold: true }, 'iphone 128');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((l) => /iphone/i.test(l.title) && l.rawText.includes('128'))).toBe(true);
  });

  it('tolerates small typos and ranks title matches first', () => {
    const r = run({ showSold: true, sort: 'relevance' }, 'ipohne');
    expect(r[0].title.toLowerCase()).toContain('iphone');
  });

  it('returns nothing for gibberish', () => {
    expect(run({ showSold: true }, 'zzqxj')).toHaveLength(0);
  });
});

describe('format', () => {
  it('formats price kinds', () => {
    expect(formatPrice({ price: 12900, priceMin: 12900, priceMax: 12900, priceType: 'fixed' }).main).toBe('12,900');
    expect(formatPrice({ price: 3850, priceMin: 3500, priceMax: 4200, priceType: 'range' }).main).toBe('3,500–4,200');
    expect(formatPrice({ price: 5900, priceMin: 5900, priceMax: 5900, priceType: 'negotiable' })).toMatchObject({
      main: '5,900',
      note: 'ต่อรองได้',
    });
    expect(formatPrice({ price: null, priceMin: null, priceMax: null, priceType: 'unknown' })).toMatchObject({ empty: true });
  });

  it('formats relative time in Thai', () => {
    expect(relativeTime(NOW - 20_000, NOW)).toBe('เมื่อสักครู่');
    expect(relativeTime(NOW - 3 * 3_600_000, NOW)).toContain('3');
    expect(relativeTime(null, NOW)).toBeNull();
  });
});
