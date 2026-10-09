// รวมตัวแยกข้อมูลทั้งหมด: RawPost (จาก bookmarklet) → Listing (เก็บในฐานข้อมูล)
import { PARSER_VERSION } from '../config';
import type { Listing, RawPost } from '../types';
import { splitItems } from './items';
import { parsePrice } from './price';
import { parseStatus } from './status';
import { parsePostedTime } from './time';
import { parseTitle } from './title';

export { splitItems } from './items';
export { parsePrice } from './price';
export { parseStatus } from './status';
export { parsePostedTime } from './time';
export { parseTitle } from './title';
export * from './url';

export interface ParseContext {
  groupId: string;
  now: number;
  storeAuthorName: boolean;
}

/** prefix ของ id ทุกแถวที่มาจากโพสต์เดียวกัน: `${groupId}_${postId}` และ `${groupId}_${postId}_${n}` */
export const postKey = (groupId: string, postId: string) => `${groupId}_${postId}`;

/** โพสต์ขายรายการเดียว → Listing 1 แถว */
export function parsePost(raw: RawPost, ctx: ParseContext): Listing {
  const text = raw.text.replace(/\r\n?/g, '\n').trim();
  const price = parsePrice(text, raw.structuredPrice);
  const title = parseTitle(text, raw.structuredTitle, price.span);

  return {
    id: postKey(ctx.groupId, raw.postId),
    groupId: ctx.groupId,
    postId: raw.postId,
    postUrl: raw.postUrl,
    title,
    rawText: text,
    price: price.price,
    priceMin: price.priceMin,
    priceMax: price.priceMax,
    priceType: price.priceType,
    priceText: price.priceText,
    currency: 'THB',
    status: parseStatus(text),
    authorName: ctx.storeAuthorName ? (raw.authorName?.trim() || null) : null,
    postedAt: parsePostedTime(raw.timeText, ctx.now),
    postedAtText: raw.timeText?.trim() || null,
    firstSeenAt: ctx.now,
    lastSeenAt: ctx.now,
    favorite: false,
    hidden: false,
    parserVersion: PARSER_VERSION,
    ...(raw.structuredPrice ? { structuredPrice: raw.structuredPrice } : {}),
  };
}

/**
 * โพสต์ → Listing 1 แถว หรือหลายแถวถ้าโพสต์ขายหลายรายการ
 * (โพสต์ขายแบบมีฟอร์มของ Facebook ถือเป็นรายการเดียวเสมอ)
 */
export function parsePostListings(raw: RawPost, ctx: ParseContext): Listing[] {
  const single = parsePost(raw, ctx);
  if (raw.structuredPrice || raw.structuredTitle) return [single];
  const split = splitItems(single.rawText);
  if (!split) return [single];
  const n = split.items.length;
  return split.items.map((it, i) => ({
    ...single,
    id: `${single.id}_${i}`,
    title: it.title,
    price: it.price.price,
    priceMin: it.price.priceMin,
    priceMax: it.price.priceMax,
    priceType: it.price.priceType,
    priceText: it.price.priceText,
    status: it.sold ? 'sold' : 'available',
    itemIndex: i,
    itemCount: n,
    itemText: it.text,
    ...(it.note ? { itemNote: it.note } : {}),
    ...(split.postTitle ? { postTitle: split.postTitle } : {}),
  }));
}

/**
 * แยกข้อมูลใหม่จาก rawText ของโพสต์ที่เก็บไว้ (ใช้เมื่อปรับปรุง parser)
 * คงเวลา/ชื่อผู้โพสต์เดิม และดาว/การซ่อนของแถวที่ id ตรงกัน
 */
export function reparsePost(rows: Listing[]): Listing[] {
  const base = rows[0];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const fresh = parsePostListings(
    {
      postId: base.postId,
      postUrl: base.postUrl,
      text: base.rawText,
      structuredPrice: base.structuredPrice,
      timeText: base.postedAtText ?? undefined,
      authorName: base.authorName ?? undefined,
    },
    { groupId: base.groupId, now: base.firstSeenAt, storeAuthorName: base.authorName != null },
  );
  // ถ้าเคยเป็นแถวเดียวแล้วถูกแยก → ดาว/ซ่อนของแถวเดิมใช้กับทุกรายการ
  const legacy = byId.get(postKey(base.groupId, base.postId));
  return fresh.map((l) => {
    const old = byId.get(l.id) ?? legacy ?? base;
    return {
      ...l,
      postedAt: base.postedAt,
      firstSeenAt: Math.min(...rows.map((r) => r.firstSeenAt)),
      lastSeenAt: Math.max(...rows.map((r) => r.lastSeenAt)),
      favorite: old.favorite,
      hidden: old.hidden,
    };
  });
}

/** @deprecated ใช้ reparsePost — คงไว้สำหรับโพสต์แถวเดียว */
export function reparseListing(l: Listing): Listing {
  return reparsePost([l])[0];
}
