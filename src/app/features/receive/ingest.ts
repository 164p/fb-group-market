// รับข้อมูลจาก bookmarklet → แยกราคา/ชื่อ → บันทึก
// แยกจาก UI เพื่อทดสอบได้ด้วย fake-indexeddb
import { parsePost } from '../../../shared/parser';
import type { GroupInfo } from '../../../shared/protocol';
import { sanitizeGroup, sanitizePosts } from '../../../shared/sanitize';
import type { StopReason } from '../../../shared/types';
import type { Repos } from '../../db/repositories';

export interface IngestTotals {
  received: number;
  added: number;
  updated: number;
  withPrice: number;
}

export interface IngestSession {
  sessionId: string;
  group: GroupInfo;
  /** กลุ่มนี้ถูกสร้างใหม่ในรอบนี้ */
  groupCreated: boolean;
  knownIds: string[];
  storeAuthorName: boolean;
  totals: IngestTotals;
  /** ลำดับชุดที่รับแล้ว (กันรับซ้ำ) */
  seqs: Set<number>;
  stopReason?: StopReason;
}

export class Ingestor {
  private sessions = new Map<string, IngestSession>();
  /** ทำงานทีละคำสั่งตามลำดับข้อความที่เข้ามา */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private store: Repos,
    private now: () => number = Date.now,
  ) {}

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  get(sessionId: string) {
    return this.sessions.get(sessionId);
  }

  /** HELLO อาจมาซ้ำหลายครั้ง (bookmarklet ส่งซ้ำจนได้คำตอบ) → เริ่มรอบแค่ครั้งแรก */
  start(sessionId: string, rawGroup: unknown): Promise<IngestSession | null> {
    return this.enqueue(async () => {
      const existing = this.sessions.get(sessionId);
      if (existing) return existing;
      const group = sanitizeGroup(rawGroup);
      if (!group) return null;
      const groupCreated = await this.store.groups.ensure(group);
      await this.store.sessions.start(group.id, sessionId);
      const [known, settings] = await Promise.all([this.store.listings.knownPostIds(group.id), this.store.settings.get()]);
      const s: IngestSession = {
        sessionId,
        group,
        groupCreated,
        knownIds: [...known],
        storeAuthorName: settings.storeAuthorName,
        totals: { received: 0, added: 0, updated: 0, withPrice: 0 },
        seqs: new Set(),
      };
      this.sessions.set(sessionId, s);
      return s;
    });
  }

  batch(sessionId: string, seq: number, rawPosts: unknown): Promise<IngestSession | null> {
    return this.enqueue(async () => {
      const s = this.sessions.get(sessionId);
      if (!s) return null;
      if (s.seqs.has(seq)) return s;
      s.seqs.add(seq);
      const now = this.now();
      const listings = sanitizePosts(rawPosts, s.group.id).map((p) =>
        parsePost(p, { groupId: s.group.id, now, storeAuthorName: s.storeAuthorName }),
      );
      const res = await this.store.listings.upsertMany(listings);
      const withPrice = listings.filter((l) => l.price != null).length;
      s.totals.received += listings.length;
      s.totals.added += res.added;
      s.totals.updated += res.updated;
      s.totals.withPrice += withPrice;
      await this.store.sessions.addCounts(sessionId, { scanned: listings.length, added: res.added, updated: res.updated, withPrice });
      return s;
    });
  }

  /** ปิดรอบ คืนเลขชุดที่ใช้ตอบ DONE (= ชุดล่าสุดที่รับต่อเนื่องครบ + 1) */
  finish(sessionId: string, stopReason: StopReason): Promise<{ session: IngestSession | null; ackSeq: number }> {
    return this.enqueue(async () => {
      const s = this.sessions.get(sessionId);
      if (!s) return { session: null, ackSeq: -1 };
      let contiguous = 0;
      while (s.seqs.has(contiguous + 1)) contiguous++;
      if (!s.stopReason) {
        s.stopReason = stopReason;
        await this.store.sessions.finish(sessionId, stopReason);
      }
      return { session: s, ackSeq: contiguous + 1 };
    });
  }

  /** ทางสำรอง: นำเข้าข้อมูลที่คัดลอกมาทั้งก้อน */
  async importExport(payload: { group: unknown; posts: unknown; stopReason?: unknown }): Promise<IngestSession | null> {
    const id = `import-${this.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const s = await this.start(id, payload.group);
    if (!s) return null;
    const posts = Array.isArray(payload.posts) ? payload.posts : [];
    for (let i = 0; i < posts.length; i += 50) await this.batch(id, i / 50 + 1, posts.slice(i, i + 50));
    const REASONS: StopReason[] = ['maxPosts', 'maxAge', 'reachedKnown', 'noMore', 'user', 'error'];
    const reason = REASONS.includes(payload.stopReason as StopReason) ? (payload.stopReason as StopReason) : 'user';
    return (await this.finish(id, reason)).session;
  }
}
