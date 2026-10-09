import { afterAll, describe, expect, it } from 'vitest';
import { PARSER_VERSION } from '../config';
import { FIXTURES } from './__tests__/fixtures';
import { HOLDOUT } from './__tests__/holdout';
import { parsePost, parsePostedTime, parsePrice, parseStatus, parseTitle, reparseListing } from './index';

const results: { name: string; price: boolean; title: boolean }[] = [];

describe('fixtures (ราคา/ชื่อ/สถานะ)', () => {
  it('has at least 40 cases', () => expect(FIXTURES.length).toBeGreaterThanOrEqual(40));

  for (const f of FIXTURES) {
    it(f.name, () => {
      const p = parsePrice(f.text, f.structuredPrice);
      const title = parseTitle(f.text, f.structuredTitle, p.span);
      const priceOk =
        p.price === f.price &&
        p.priceType === f.type &&
        (!f.range || (p.priceMin === f.range[0] && p.priceMax === f.range[1]));
      results.push({ name: f.name, price: priceOk, title: title === f.title });

      expect({ price: p.price, type: p.priceType, range: f.range ? [p.priceMin, p.priceMax] : undefined }).toEqual({
        price: f.price,
        type: f.type,
        range: f.range,
      });
      expect(title).toBe(f.title);
      expect(parseStatus(f.text)).toBe(f.status ?? 'available');
    });
  }

  afterAll(() => {
    const n = results.length;
    const price = results.filter((r) => r.price).length;
    const title = results.filter((r) => r.title).length;
    console.log(`parser accuracy — price ${price}/${n} (${Math.round((price / n) * 100)}%), title ${title}/${n}`);
  });
});

describe('holdout (ไม่ได้ปรับ parser ตามชุดนี้)', () => {
  it('reaches at least 90% price accuracy on unseen posts', () => {
    const misses: string[] = [];
    let price = 0;
    let title = 0;
    for (const f of HOLDOUT) {
      const p = parsePrice(f.text, f.structuredPrice);
      const ok =
        p.price === f.price && p.priceType === f.type && (!f.range || (p.priceMin === f.range[0] && p.priceMax === f.range[1]));
      if (ok) price++;
      else misses.push(`${f.name}: got ${p.price} (${p.priceType}) want ${f.price} (${f.type})`);
      const t = parseTitle(f.text, f.structuredTitle, p.span);
      if (t === f.title) title++;
      else misses.push(`${f.name}: title "${t}" want "${f.title}"`);
    }
    console.log(`holdout — price ${price}/${HOLDOUT.length}, title ${title}/${HOLDOUT.length}\n  ${misses.join('\n  ')}`);
    expect(price / HOLDOUT.length).toBeGreaterThanOrEqual(0.9);
  });
});

describe('priceText', () => {
  it('keeps currency markers as written', () => {
    expect(parsePrice('ขาย 12,900.- ครับ').priceText).toBe('12,900.-');
    expect(parsePrice('ราคา ฿1,500').priceText).toBe('฿1,500');
    expect(parsePrice('ขาย 2,500 บาท').priceText).toBe('2,500 บาท');
  });
});

describe('parsePostedTime', () => {
  const now = new Date(2026, 9, 9, 12, 0).getTime(); // 9 ต.ค. 2026 12:00 เวลาเครื่อง
  const at = (y: number, m: number, d: number, h = 12, mi = 0) => new Date(y, m, d, h, mi).getTime();

  it.each([
    ['เมื่อสักครู่', now],
    ['Just now', now],
    ['5 นาที', now - 5 * 60_000],
    ['3 ชม.', now - 3 * 3_600_000],
    ['3h', now - 3 * 3_600_000],
    ['2 วัน', now - 2 * 86_400_000],
    ['2d', now - 2 * 86_400_000],
    ['1 สัปดาห์', now - 7 * 86_400_000],
    ['เมื่อวานนี้ เวลา 14:30 น.', at(2026, 9, 8, 14, 30)],
    ['Yesterday at 2:30 PM', at(2026, 9, 8, 14, 30)],
    ['5 ตุลาคม เวลา 10:15 น.', at(2026, 9, 5, 10, 15)],
    ['5 ต.ค.', at(2026, 9, 5)],
    ['October 5 at 10:15 AM', at(2026, 9, 5, 10, 15)],
    ['20 ธันวาคม', at(2025, 11, 20)], // อนาคต → ปีที่แล้ว
    ['3 มีนาคม 2567', at(2024, 2, 3)], // พ.ศ.
    ['Mar 3, 2024', at(2024, 2, 3)],
  ])('%s', (text, expected) => {
    expect(parsePostedTime(text, now)).toBe(expected);
  });

  it('returns null for unknown text', () => {
    expect(parsePostedTime('', now)).toBeNull();
    expect(parsePostedTime('แก้ไขแล้ว', now)).toBeNull();
    expect(parsePostedTime(undefined, now)).toBeNull();
  });
});

describe('parsePost', () => {
  const now = 1_760_000_000_000;
  const raw = {
    postId: '987',
    postUrl: 'https://www.facebook.com/groups/123/posts/987/',
    text: 'ขาย iPad Air 5 ราคา 14,000 บาท\r\nสภาพดี',
    authorName: 'สมชาย',
    timeText: '3 ชม.',
  };

  it('builds a full listing', () => {
    const l = parsePost(raw, { groupId: '123', now, storeAuthorName: false });
    expect(l).toMatchObject({
      id: '123_987',
      groupId: '123',
      title: 'iPad Air 5',
      price: 14000,
      priceType: 'fixed',
      status: 'available',
      authorName: null,
      postedAt: now - 3 * 3_600_000,
      postedAtText: '3 ชม.',
      rawText: 'ขาย iPad Air 5 ราคา 14,000 บาท\nสภาพดี',
      favorite: false,
      hidden: false,
    });
  });

  it('stores the author only when allowed', () => {
    expect(parsePost(raw, { groupId: '123', now, storeAuthorName: true }).authorName).toBe('สมชาย');
  });

  it('reparse keeps user flags and times', () => {
    const l = { ...parsePost(raw, { groupId: '123', now, storeAuthorName: false }), favorite: true, price: 1, parserVersion: 0 };
    const r = reparseListing(l);
    expect(r).toMatchObject({ favorite: true, price: 14000, firstSeenAt: now, parserVersion: PARSER_VERSION });
  });
});
