// ส่งข้อมูลจากหน้า Facebook ไปเว็บแอป
// ทางหลัก: เปิดหน้าต่าง #/receive แล้วส่งด้วย postMessage (ตรวจ origin ทั้งสองฝั่ง)
// ทางสำรอง: ถ้าหน้าต่างเปิดไม่ได้/ติดต่อไม่ได้ ให้ผู้ใช้คัดลอก JSON ไปวางในหน้า #/receive
import { isBridgeMessage, type BridgeMessage, type ExportPayload, type GroupInfo } from '../shared/protocol';
import type { RawPost, StopReason } from '../shared/types';

type Ack = Extract<BridgeMessage, { type: 'ACK' }>;

export interface HelloResult {
  ok: boolean;
  knownIds: Set<string>;
  storeAuthorName: boolean;
  minBookmarkletVersion: number;
}

const HELLO_TIMEOUT_MS = 6_000;

export class Bridge {
  readonly sessionId = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).toString();
  private win: Window | null = null;
  private seq = 0;
  private lastAck = -1;
  private waiters: ((a: Ack) => void)[] = [];
  /** ทุกโพสต์ในรอบนี้ — ใช้สร้างข้อมูลสำรองถ้าส่งตรงไม่สำเร็จ */
  readonly all: RawPost[] = [];
  direct = false;

  constructor(
    private appUrl: string,
    private appOrigin: string,
    private group: GroupInfo,
    private bookmarkletVersion: number,
  ) {
    window.addEventListener('message', this.onMessage);
  }

  private onMessage = (e: MessageEvent) => {
    if (e.origin !== this.appOrigin || !isBridgeMessage(e.data)) return;
    const m = e.data;
    if (m.sessionId !== this.sessionId || m.type !== 'ACK') return;
    this.lastAck = Math.max(this.lastAck, m.seq);
    const ws = this.waiters;
    this.waiters = [];
    ws.forEach((w) => w(m));
  };

  /** ต้องเรียกตรงใน handler ของการคลิก ไม่อย่างนั้นเบราว์เซอร์จะบล็อกหน้าต่าง */
  openWindow(): boolean {
    const url = `${this.appUrl}#/receive?s=${encodeURIComponent(this.sessionId)}`;
    try {
      this.win = window.open(url, 'fbgm-receive', 'popup,width=460,height=680');
    } catch {
      this.win = null;
    }
    return !!this.win;
  }

  get windowClosed(): boolean {
    return !this.win || this.win.closed;
  }

  private post(msg: BridgeMessage) {
    try {
      this.win?.postMessage(msg, this.appOrigin);
    } catch {
      /* หน้าต่างถูกตัดการเชื่อมต่อ (เช่น COOP) */
    }
  }

  /** ส่ง HELLO ซ้ำจนกว่าหน้ารับข้อมูลจะตอบ (หน้าอาจยังโหลดไม่เสร็จ) */
  async hello(): Promise<HelloResult> {
    const fail: HelloResult = { ok: false, knownIds: new Set(), storeAuthorName: false, minBookmarkletVersion: 0 };
    if (!this.win) return fail;
    const answered = new Promise<Ack>((resolve) => this.waiters.push(resolve));
    const msg: BridgeMessage = { v: 1, type: 'HELLO', sessionId: this.sessionId, bookmarkletVersion: this.bookmarkletVersion, group: this.group };
    const timer = setInterval(() => this.post(msg), 400);
    this.post(msg);
    const ack = await Promise.race([answered, new Promise<null>((r) => setTimeout(() => r(null), HELLO_TIMEOUT_MS))]);
    clearInterval(timer);
    if (!ack) return fail;
    this.direct = true;
    return {
      ok: true,
      knownIds: new Set(ack.knownIds ?? []),
      storeAuthorName: !!ack.storeAuthorName,
      minBookmarkletVersion: ack.minBookmarkletVersion ?? 0,
    };
  }

  send(posts: RawPost[]) {
    this.all.push(...posts);
    if (!this.direct) return;
    this.seq++;
    this.post({ v: 1, type: 'BATCH', sessionId: this.sessionId, seq: this.seq, posts });
  }

  /** ส่ง DONE แล้วรอ ACK ของชุดสุดท้าย — คืน true ถ้าหน้ารับข้อมูลได้ครบ */
  async done(stopReason: StopReason, scanned: number): Promise<boolean> {
    if (!this.direct) return false;
    const target = this.seq + 1;
    const msg: BridgeMessage = { v: 1, type: 'DONE', sessionId: this.sessionId, stopReason, scanned };
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      this.post(msg);
      if (this.lastAck >= target) return true;
      await new Promise((r) => setTimeout(r, 400));
    }
    return this.lastAck >= target;
  }

  exportPayload(stopReason: StopReason, scanned: number): ExportPayload {
    return { v: 1, type: 'EXPORT', bookmarkletVersion: this.bookmarkletVersion, group: this.group, stopReason, scanned, posts: this.all };
  }

  receiveUrl(paste = false): string {
    return `${this.appUrl}#/receive${paste ? '?paste=1' : ''}`;
  }

  /** ลิงก์หน้ารับข้อมูลพร้อมข้อมูลทั้งรอบ (บีบอัดแล้ว) ในส่วน # */
  handoffUrl(encoded: string): string {
    return `${this.appUrl}#/receive?d=${encoded}`;
  }

  /** พาหน้าต่างที่เปิดไว้ไปที่ url — คืน false ถ้าหน้าต่างถูกตัดการเชื่อมต่อ/ปิดไปแล้ว */
  navigate(url: string): boolean {
    if (this.windowClosed) return false;
    try {
      this.win!.location.href = url;
      return true;
    } catch {
      return false;
    }
  }

  dispose() {
    window.removeEventListener('message', this.onMessage);
  }
}

/** คัดลอกข้อความ — ลอง Clipboard API ก่อน แล้วค่อยใช้วิธีเก่า */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}
