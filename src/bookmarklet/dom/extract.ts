// อ่านข้อมูลจากโพสต์ 1 ชิ้นบนหน้ากลุ่ม Facebook
import { parseGroupUrl } from '../../shared/parser/url';
import type { RawPost } from '../../shared/types';
import { POST_HREF, SEE_MORE, SEL, STORY_HREF, STRUCTURED_PRICE, TIME_TEXT } from './selectors';

/** element นี้อยู่ใน comment (article ซ้อนใน article ของโพสต์) หรือไม่ */
function inNested(el: Element, post: Element): boolean {
  const a = el.closest(SEL.article);
  return !!a && a !== post && post.contains(a);
}

function own<T extends Element>(post: Element, selector: string): T[] {
  return [...post.querySelectorAll<T>(selector)].filter((el) => !inNested(el, post));
}

const text = (el: Element | null | undefined) => ((el as HTMLElement | null)?.innerText ?? el?.textContent ?? '').trim();

/* --------------------------------------------------------------- group */

export interface GroupOnPage {
  id: string;
  url: string;
  name: string;
}

export function readGroup(loc: Location = location, doc: Document = document): GroupOnPage | null {
  const r = parseGroupUrl(loc.href);
  if (!r.ok) return null;
  const h1 = [...doc.querySelectorAll(SEL.groupTitle)].map(text).find((t) => t && t.length < 120);
  const fromTitle = doc.title.replace(/\s*[|\-–]\s*Facebook\s*$/i, '').replace(/^\(\d+\)\s*/, '').trim();
  return { id: r.id, url: r.url, name: h1 || fromTitle || '' };
}

/* --------------------------------------------------------------- posts */

/** โพสต์ระดับบนสุดที่อยู่บนหน้าตอนนี้ (ไม่รวม comment) */
export function findPosts(doc: Document = document): HTMLElement[] {
  const scope = doc.querySelector(SEL.feed) ?? doc.querySelector(SEL.main) ?? doc.body;
  const articles = [...scope.querySelectorAll<HTMLElement>(SEL.article)].filter(
    (a) => !a.parentElement?.closest(SEL.article),
  );
  if (articles.length) return articles;
  // บางเวอร์ชันไม่มี role=article → ใช้ลูกโดยตรงของ feed ที่มีลิงก์โพสต์
  const feed = doc.querySelector(SEL.feed);
  return feed
    ? ([...feed.children] as HTMLElement[]).filter((c) => [...c.querySelectorAll('a')].some((a) => POST_HREF.test(a.href)))
    : [];
}

/**
 * Facebook ใส่ URL จริงให้ลิงก์เวลาโพสต์เมื่อเอาเมาส์ชี้เท่านั้น
 * จำลองการชี้เมาส์ที่ลิงก์ในส่วนหัวของโพสต์ เพื่อให้ได้ลิงก์โพสต์
 */
export function primeLinks(post: HTMLElement): number {
  let n = 0;
  for (const a of own<HTMLAnchorElement>(post, 'a').slice(0, 25)) {
    const href = a.getAttribute('href');
    if (href && href !== '#' && !href.startsWith('javascript')) continue;
    for (const type of ['mouseover', 'mouseenter', 'pointerover', 'focus']) {
      a.dispatchEvent(new Event(type, { bubbles: type !== 'mouseenter' && type !== 'focus' }));
    }
    n++;
  }
  return n;
}

export function readPostLink(post: HTMLElement, groupId: string): { postId: string; postUrl: string; anchor: HTMLAnchorElement } | null {
  for (const a of own<HTMLAnchorElement>(post, 'a')) {
    const href = a.href || '';
    const m = href.match(POST_HREF);
    if (m) {
      const id = m[2];
      return { postId: id, postUrl: `https://www.facebook.com/groups/${m[1]}/posts/${id}/`, anchor: a };
    }
    const s = href.match(STORY_HREF);
    if (s) {
      const id = s[1];
      return { postId: id, postUrl: `https://www.facebook.com/groups/${encodeURIComponent(groupId)}/posts/${id}/`, anchor: a };
    }
  }
  return null;
}

/** กดปุ่ม "ดูเพิ่มเติม" ในตัวโพสต์ (ไม่แตะ comment) คืนจำนวนที่กด */
export function expandSeeMore(post: HTMLElement): number {
  let n = 0;
  for (const b of own<HTMLElement>(post, SEL.button)) {
    // ปุ่มที่เป็นลิงก์จะเปิดหน้าโพสต์แทนการขยายข้อความ → ไม่กด
    if (b.closest('a[href]') || b.hasAttribute('href')) continue;
    if (SEE_MORE.test(text(b))) {
      b.click();
      n++;
    }
  }
  return n;
}

export function readMessage(post: HTMLElement): string {
  const msg = own<HTMLElement>(post, SEL.message)[0];
  if (msg) return text(msg);
  // หาไม่เจอ → รวมข้อความ dir=auto ที่ไม่ใช่ส่วนหัว/ชื่อคน/comment
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const el of own<HTMLElement>(post, SEL.textBlock)) {
    if (el.closest('h2, h3, h4, a, [role="button"]')) continue;
    if (el.querySelector(SEL.textBlock)) continue; // เอาเฉพาะชั้นในสุด
    const t = text(el);
    if (t.length < 2 || seen.has(t)) continue;
    seen.add(t);
    parts.push(t);
  }
  return parts.join('\n');
}

export function readStructuredPrice(post: HTMLElement): string | undefined {
  const msg = own<HTMLElement>(post, SEL.message)[0];
  for (const el of own<HTMLElement>(post, 'span, div')) {
    if (el.children.length > 0) continue;
    if (msg?.contains(el)) continue;
    const t = text(el);
    if (STRUCTURED_PRICE.test(t)) return t;
  }
  return undefined;
}

export interface TimeRead {
  text?: string;
  /** อ่านจากลิงก์โพสต์ (น่าเชื่อถือ) หรือจากลิงก์อื่นในส่วนหัว (อาจผิด) */
  fromPermalink: boolean;
}

export function readTimeText(post: HTMLElement, linkAnchor?: HTMLAnchorElement): TimeRead {
  const fromEl = (el: Element | undefined | null) => {
    if (!el) return undefined;
    for (const t of [el.getAttribute('aria-label') ?? '', text(el)]) {
      const s = t.trim();
      if (s && s.length <= 40 && TIME_TEXT.test(s)) return s;
    }
    return undefined;
  };
  const direct = fromEl(linkAnchor);
  if (direct) return { text: direct, fromPermalink: true };
  // ลิงก์โพสต์อื่นๆ ที่ชี้ไปโพสต์เดียวกัน (Facebook มักมีหลายลิงก์)
  for (const a of own<HTMLAnchorElement>(post, 'a')) {
    if (a === linkAnchor || !(POST_HREF.test(a.href) || STORY_HREF.test(a.href))) continue;
    const t = fromEl(a);
    if (t) return { text: t, fromPermalink: true };
  }
  for (const el of own<HTMLElement>(post, 'a[aria-label], abbr, a[role="link"]').slice(0, 15)) {
    const t = fromEl(el);
    if (t) return { text: t, fromPermalink: false };
  }
  return { fromPermalink: false };
}

export function readAuthor(post: HTMLElement): string | undefined {
  const el = own<HTMLElement>(post, SEL.author)[0];
  const t = text(el);
  return t && t.length <= 80 ? t : undefined;
}

export type ExtractResult =
  | { ok: true; raw: RawPost; timeFromPermalink: boolean }
  | { ok: false; reason: 'noLink' | 'noText' };

/** อ่านโพสต์ 1 ชิ้น — ไม่สำเร็จถ้ายังหาลิงก์โพสต์/ข้อความไม่เจอ (อาจยังโหลดไม่เสร็จ ต้องลองใหม่) */
export function extractPost(post: HTMLElement, groupId: string, withAuthor: boolean): ExtractResult {
  const link = readPostLink(post, groupId);
  if (!link) return { ok: false, reason: 'noLink' };
  const message = readMessage(post);
  const structuredPrice = readStructuredPrice(post);
  if (!message && !structuredPrice) return { ok: false, reason: 'noText' };
  const time = readTimeText(post, link.anchor);
  return {
    ok: true,
    timeFromPermalink: time.fromPermalink,
    raw: {
      postId: link.postId,
      postUrl: link.postUrl,
      text: message,
      structuredPrice,
      timeText: time.text,
      authorName: withAuthor ? readAuthor(post) : undefined,
    },
  };
}
