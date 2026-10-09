// เลื่อนหน้าอัตโนมัติและเก็บโพสต์ทีละชิ้นระหว่างเลื่อน
//
// พฤติกรรมของ Facebook ที่ต้องรับมือ:
// - โพสต์ที่อยู่ไกลจากจอเป็น "กล่องว่าง" จนกว่าจะเลื่อนเข้าใกล้ → อ่านเฉพาะโพสต์ที่อยู่ในจอ/ใกล้จอ
// - โพสต์ที่เลื่อนผ่านไปแล้วถูกลบออกจากหน้า → เก็บระหว่างทาง ไม่ใช่ตอนจบ
// - ด้านบนกลุ่มมักมีโพสต์แนะนำ/ปักหมุดเก่าๆ → ไม่ให้ทำให้หยุดเร็ว
import { MAX_POSTS_PER_RUN } from '../shared/config';
import { parsePostedTime } from '../shared/parser/time';
import type { RawPost, StopMode, StopReason } from '../shared/types';
import { expandSeeMore, extractPost, findPosts, primeLinks } from './dom/extract';
import { SEL } from './dom/selectors';

export interface RunOptions {
  groupId: string;
  stopMode: StopMode;
  maxPosts: number;
  maxAgeDays: number;
  /** หน่วงระหว่างการเลื่อนแต่ละครั้ง [ต่ำสุด, สูงสุด] ms */
  delayMs: readonly [number, number];
  knownIds: Set<string>;
  withAuthor: boolean;
  /** ส่งโพสต์ออกทีละชุด */
  batchSize?: number;
}

export interface Progress {
  scanned: number;
  collected: number;
  oldestTimeText?: string;
}

/** สถิติสำหรับวิเคราะห์ปัญหา (ไม่มีข้อความโพสต์) */
export interface Diagnostics {
  feedFound: boolean;
  articlesSeen: number;
  extracted: number;
  failedNoLink: number;
  failedNoText: number;
  skippedAfterRetries: number;
  rescrolled: number;
  timeParsed: number;
  timeUnparsed: number;
  timeFromOtherLink: number;
  oldSkipped: number;
  duplicates: number;
  rounds: number;
  sampleTimeTexts: string[];
  unparsedTimeTexts: string[];
}

export interface RunHooks {
  onBatch: (posts: RawPost[]) => void | Promise<void>;
  onProgress: (p: Progress) => void;
  shouldStop: () => boolean;
}

/** โพสต์ติดกันกี่ชิ้นที่เข้าเงื่อนไข ถึงจะหยุด */
const STREAK = 3;
/** โพสต์เก่าช่วงแรกๆ (แนะนำ/ปักหมุด) ไม่นับ จนกว่าจะเจอโพสต์ในช่วงเวลา หรืออ่านไปแล้วเท่านี้ */
const OLD_GRACE_POSTS = 12;
/**
 * ถือว่าหมดกลุ่มเมื่อ อยู่ท้ายหน้าแล้ว + ไม่มีโพสต์ใหม่ติดกันอย่างน้อยกี่รอบ และนานเท่าไร
 * (Facebook อาจใช้เวลาหลายวินาทีกว่าจะโหลดโพสต์ชุดถัดไป)
 */
const IDLE_ROUNDS = 5;
const IDLE_MS = 8_000;
/** อ่านโพสต์ที่อยู่ในจอไม่สำเร็จได้กี่ครั้งก่อนข้าม */
const MAX_ATTEMPTS = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = ([lo, hi]: readonly [number, number]) => lo + Math.random() * Math.max(0, hi - lo);

/** ตำแหน่งของโพสต์เทียบกับจอ: above = เลื่อนผ่านไปแล้ว, near = ในจอหรือใกล้, below = ยังไม่ถึง */
function where(el: Element): 'above' | 'near' | 'below' {
  const r = el.getBoundingClientRect();
  const h = window.innerHeight;
  if (r.bottom < -h * 0.25) return 'above';
  if (r.top > h * 1.25) return 'below';
  return 'near';
}

export function newDiagnostics(): Diagnostics {
  return {
    feedFound: false,
    articlesSeen: 0,
    extracted: 0,
    failedNoLink: 0,
    failedNoText: 0,
    skippedAfterRetries: 0,
    rescrolled: 0,
    timeParsed: 0,
    timeUnparsed: 0,
    timeFromOtherLink: 0,
    oldSkipped: 0,
    duplicates: 0,
    rounds: 0,
    sampleTimeTexts: [],
    unparsedTimeTexts: [],
  };
}

export async function collect(
  opts: RunOptions,
  hooks: RunHooks,
  diag: Diagnostics = newDiagnostics(),
): Promise<{ stopReason: StopReason; scanned: number }> {
  const done = new WeakSet<Element>();
  const seenEls = new WeakSet<Element>();
  const attempts = new WeakMap<Element, number>();
  const rescued = new WeakSet<Element>();
  const seenIds = new Set<string>();
  const batchSize = opts.batchSize ?? 10;
  const limit = Math.min(opts.maxPosts, MAX_POSTS_PER_RUN);
  const cutoffMs = opts.maxAgeDays * 86_400_000;

  let pending: RawPost[] = [];
  let collected = 0;
  let scanned = 0;
  let idle = 0;
  let idleSince = Date.now();
  let oldStreak = 0;
  let seenRecent = false;
  let knownStreak = 0;
  let oldestTimeText: string | undefined;

  diag.feedFound = !!document.querySelector(SEL.feed);

  const flush = async () => {
    if (!pending.length) return;
    const out = pending;
    pending = [];
    await hooks.onBatch(out);
  };

  const finish = async (stopReason: StopReason) => {
    await flush();
    hooks.onProgress({ scanned, collected, oldestTimeText });
    return { stopReason, scanned };
  };

  for (;;) {
    if (hooks.shouldStop()) return finish('user');
    diag.rounds++;

    const all = findPosts().filter((p) => !done.has(p));
    for (const p of all) {
      if (!seenEls.has(p)) {
        seenEls.add(p);
        diag.articlesSeen++;
      }
    }
    // อ่านเฉพาะโพสต์ที่อยู่ในจอ/ใกล้จอ และโพสต์ที่เลื่อนผ่านไปแล้วแต่ยังอ่านไม่ได้
    const ready = all.filter((p) => where(p) !== 'below');
    if (ready.length) {
      for (const p of ready) {
        primeLinks(p);
        expandSeeMore(p);
      }
      await sleep(300);
    }

    let progressed = false;
    for (const p of ready) {
      if (!p.isConnected) continue;
      let res = extractPost(p, opts.groupId, opts.withAuthor);
      if (!res.ok) {
        const pos = where(p);
        if (pos === 'near') {
          const n = (attempts.get(p) ?? 0) + 1;
          attempts.set(p, n);
          if (n >= MAX_ATTEMPTS) {
            done.add(p);
            diag.skippedAfterRetries++;
            if (res.reason === 'noLink') diag.failedNoLink++;
            else diag.failedNoText++;
          }
        } else if (pos === 'above' && !rescued.has(p)) {
          // เลื่อนผ่านไปก่อนอ่านได้ → เลื่อนกลับไปให้โหลดแล้วลองอีกครั้ง (ครั้งเดียว)
          rescued.add(p);
          diag.rescrolled++;
          p.scrollIntoView({ block: 'center' });
          primeLinks(p);
          expandSeeMore(p);
          await sleep(700);
          const again = extractPost(p, opts.groupId, opts.withAuthor);
          if (!again.ok) {
            done.add(p);
            diag.skippedAfterRetries++;
            if (again.reason === 'noLink') diag.failedNoLink++;
            else diag.failedNoText++;
            continue;
          }
          res = again;
        } else if (pos === 'above') {
          done.add(p);
          continue;
        }
        if (!res.ok) continue;
      }

      done.add(p);
      const { raw, timeFromPermalink } = res;
      diag.extracted++;
      if (seenIds.has(raw.postId)) {
        diag.duplicates++;
        continue;
      }
      seenIds.add(raw.postId);
      scanned++;
      progressed = true;

      const now = Date.now();
      const at = parsePostedTime(raw.timeText, now);
      if (raw.timeText && diag.sampleTimeTexts.length < 8) diag.sampleTimeTexts.push(raw.timeText);
      if (at != null) diag.timeParsed++;
      else {
        diag.timeUnparsed++;
        if (raw.timeText && diag.unparsedTimeTexts.length < 8) diag.unparsedTimeTexts.push(raw.timeText);
      }
      if (!timeFromPermalink && raw.timeText) diag.timeFromOtherLink++;

      // เงื่อนไขหยุด: โพสต์เก่ากว่าที่กำหนด — ใช้เฉพาะเวลาที่อ่านจากลิงก์โพสต์ (เชื่อถือได้)
      if (opts.stopMode === 'maxAge' && at != null && timeFromPermalink) {
        const old = now - at > cutoffMs;
        if (!old) {
          seenRecent = true;
          oldStreak = 0;
        } else {
          diag.oldSkipped++;
          // โพสต์เก่าช่วงต้น (แนะนำ/ปักหมุด) ไม่นับเป็นเหตุให้หยุด
          if (seenRecent || scanned > OLD_GRACE_POSTS) oldStreak++;
          if (oldStreak >= STREAK) return finish('maxAge');
          continue; // ไม่เก็บโพสต์ที่เก่าเกิน
        }
      }

      // เงื่อนไขหยุด: เจอโพสต์ที่เคยดึงแล้ว (ยังส่งไปเพื่ออัปเดตสถานะ เช่น ขายแล้ว)
      if (opts.knownIds.has(raw.postId)) knownStreak++;
      else knownStreak = 0;

      pending.push(raw);
      collected++;
      if (raw.timeText) oldestTimeText = raw.timeText;
      if (pending.length >= batchSize) await flush();
      hooks.onProgress({ scanned, collected, oldestTimeText });

      if (opts.stopMode === 'reachedKnown' && knownStreak >= STREAK) return finish('reachedKnown');
      // ครบจำนวนที่ตั้ง หรือถึงเพดานความปลอดภัยต่อรอบ (ใช้กับทุกโหมด)
      if (collected >= limit) return finish('maxPosts');
    }

    // เลื่อนลงประมาณหนึ่งหน้าจอ ถ้าใกล้ท้ายหน้าให้ไปท้ายสุดเพื่อให้ Facebook โหลดเพิ่ม
    const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 400;

    if (progressed || !nearBottom) {
      idle = 0;
      idleSince = Date.now();
    } else {
      idle++;
      if (idle >= IDLE_ROUNDS && Date.now() - idleSince >= IDLE_MS) return finish('noMore');
    }

    if (nearBottom) window.scrollTo({ top: document.documentElement.scrollHeight });
    else window.scrollBy({ top: Math.round(window.innerHeight * (0.6 + Math.random() * 0.2)) });

    await flush();
    await sleep(jitter(opts.delayMs));
  }
}
