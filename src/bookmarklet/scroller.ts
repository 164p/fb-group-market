// เลื่อนหน้าอัตโนมัติและเก็บโพสต์ทีละชิ้นระหว่างเลื่อน
// Facebook ลบโพสต์ที่เลื่อนผ่านไปแล้วออกจากหน้า จึงต้องเก็บระหว่างทาง ไม่ใช่เก็บตอนจบ
import { MAX_POSTS_PER_RUN } from '../shared/config';
import { parsePostedTime } from '../shared/parser/time';
import type { RawPost, StopMode, StopReason } from '../shared/types';
import { expandSeeMore, extractPost, findPosts, primeLinks } from './dom/extract';

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

export interface RunHooks {
  onBatch: (posts: RawPost[]) => void | Promise<void>;
  onProgress: (p: Progress) => void;
  shouldStop: () => boolean;
}

/** โพสต์ติดกันกี่ชิ้นที่เข้าเงื่อนไข ถึงจะหยุด (กันโพสต์ปักหมุดเก่าๆ ด้านบน) */
const STREAK = 3;
/**
 * ถือว่าหมดกลุ่มเมื่อ อยู่ท้ายหน้าแล้ว + ไม่มีโพสต์ใหม่ติดกันอย่างน้อยกี่รอบ และนานเท่าไร
 * (Facebook อาจใช้เวลาหลายวินาทีกว่าจะโหลดโพสต์ชุดถัดไป)
 */
const IDLE_ROUNDS = 5;
const IDLE_MS = 8_000;
/** อ่านโพสต์เดิมไม่สำเร็จได้กี่ครั้งก่อนข้าม */
const MAX_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = ([lo, hi]: readonly [number, number]) => lo + Math.random() * Math.max(0, hi - lo);

export async function collect(opts: RunOptions, hooks: RunHooks): Promise<{ stopReason: StopReason; scanned: number }> {
  const done = new WeakSet<Element>();
  const attempts = new WeakMap<Element, number>();
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
  let knownStreak = 0;
  let oldestTimeText: string | undefined;

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

    const fresh = findPosts().filter((p) => !done.has(p));
    if (fresh.length) {
      // ให้ Facebook ใส่ลิงก์โพสต์และขยายข้อความก่อนอ่าน
      for (const p of fresh) {
        primeLinks(p);
        expandSeeMore(p);
      }
      await sleep(250);
    }

    let progressed = false;
    for (const p of fresh) {
      const now = Date.now();
      const raw = extractPost(p, opts.groupId, opts.withAuthor);
      if (!raw) {
        const n = (attempts.get(p) ?? 0) + 1;
        attempts.set(p, n);
        if (n >= MAX_ATTEMPTS) done.add(p);
        continue;
      }
      done.add(p);
      if (seenIds.has(raw.postId)) continue;
      seenIds.add(raw.postId);
      scanned++;
      progressed = true;

      // เงื่อนไขหยุด: โพสต์เก่ากว่าที่กำหนด
      if (opts.stopMode === 'maxAge') {
        const at = parsePostedTime(raw.timeText, now);
        if (at != null && now - at > cutoffMs) {
          oldStreak++;
          if (oldStreak >= STREAK) return finish('maxAge');
          continue; // ไม่เก็บโพสต์ที่เก่าเกิน
        }
        if (at != null) oldStreak = 0;
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
    else window.scrollBy({ top: Math.round(window.innerHeight * (0.75 + Math.random() * 0.2)) });

    await flush();
    await sleep(jitter(opts.delayMs));
  }
}
