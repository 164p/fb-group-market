// รวมตัวแยกข้อมูลทั้งหมด: RawPost (จาก bookmarklet) → Listing (เก็บในฐานข้อมูล)
import { PARSER_VERSION } from '../config';
import type { Listing, RawPost } from '../types';
import { parsePrice } from './price';
import { parseStatus } from './status';
import { parsePostedTime } from './time';
import { parseTitle } from './title';

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

export function parsePost(raw: RawPost, ctx: ParseContext): Listing {
  const text = raw.text.replace(/\r\n?/g, '\n').trim();
  const price = parsePrice(text, raw.structuredPrice);
  const title = parseTitle(text, raw.structuredTitle, price.span);

  return {
    id: `${ctx.groupId}_${raw.postId}`,
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
  };
}

/** parse ใหม่จาก rawText โดยคงค่าที่ผู้ใช้ตั้งและเวลาเดิมไว้ — ใช้เมื่อปรับปรุง parser */
export function reparseListing(l: Listing): Listing {
  const price = parsePrice(l.rawText);
  return {
    ...l,
    title: parseTitle(l.rawText, undefined, price.span),
    price: price.price,
    priceMin: price.priceMin,
    priceMax: price.priceMax,
    priceType: price.priceType,
    priceText: price.priceText,
    status: parseStatus(l.rawText),
    parserVersion: PARSER_VERSION,
  };
}
