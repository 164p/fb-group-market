// การเลื่อนหน้าที่ทนต่อหน้าตา Facebook หลายแบบ
// - บางหน้าเลื่อนทั้งหน้าต่าง บางหน้าเลื่อนกล่องด้านใน → หากล่องที่เลื่อนได้จริง
// - ตรวจว่าเลื่อนได้จริงหรือไม่ ถ้าไม่ขยับให้ลองวิธีอื่น (เลื่อนโพสต์สุดท้ายเข้าจอ, ปิดหน้าต่างที่ล็อกการเลื่อน)
// - ไม่ถอยหลัง: จำตำแหน่งไกลสุดที่ไปถึงแล้ว

import { SEL } from './dom/selectors';

export interface ScrollStats {
  container: 'window' | 'inner';
  moves: number;
  stuck: number;
  fallbackIntoView: number;
  dialogsClosed: number;
  nudges: number;
  maxTop: number;
}

export function newScrollStats(): ScrollStats {
  return { container: 'window', moves: 0, stuck: 0, fallbackIntoView: 0, dialogsClosed: 0, nudges: 0, maxTop: 0 };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** กล่องที่เลื่อนได้ซึ่งครอบ feed อยู่ (null = เลื่อนทั้งหน้าต่าง) */
function innerScroller(): HTMLElement | null {
  const anchor = document.querySelector(SEL.feed) ?? document.querySelector(SEL.article);
  for (let el = anchor?.parentElement; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && el.scrollHeight > el.clientHeight + 100) return el;
  }
  return null;
}

const root = () => (document.scrollingElement ?? document.documentElement) as HTMLElement;

export class PageScroller {
  private highWater = 0;
  constructor(public stats: ScrollStats = newScrollStats()) {}

  private el(): HTMLElement | null {
    const inner = innerScroller();
    this.stats.container = inner ? 'inner' : 'window';
    return inner;
  }

  top(): number {
    const el = this.el();
    return el ? el.scrollTop : window.scrollY || root().scrollTop;
  }
  view(): number {
    const el = this.el();
    return el ? el.clientHeight : window.innerHeight;
  }
  height(): number {
    const el = this.el();
    return el ? el.scrollHeight : Math.max(root().scrollHeight, document.body?.scrollHeight ?? 0);
  }
  nearBottom(margin = 400): boolean {
    return this.top() + this.view() >= this.height() - margin;
  }

  private set(y: number) {
    const el = this.el();
    if (el) el.scrollTop = y;
    else {
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
      // บางหน้าห้าม window.scrollTo แต่ตั้งค่าโดยตรงได้
      if (Math.abs((window.scrollY || root().scrollTop) - y) > 2) root().scrollTop = y;
    }
    // แจ้ง Facebook ว่ามีการเลื่อน (ให้โหลดโพสต์ชุดถัดไป)
    (el ?? window).dispatchEvent(new Event('scroll'));
  }

  /** เลื่อนกลับไปยังจุดไกลสุดที่เคยไปถึง (หลังจากเลื่อนย้อนไปอ่านโพสต์) */
  restore() {
    if (this.top() < this.highWater - 2) this.set(this.highWater);
  }

  /** เลื่อนต่อไปข้างหน้า — คืนค่า true ถ้าขยับได้จริง */
  async advance(): Promise<boolean> {
    const before = Math.max(this.top(), this.highWater);
    const target = this.nearBottom() ? this.height() : before + Math.round(this.view() * (0.6 + Math.random() * 0.2));
    this.set(target);
    await sleep(80);
    let now = this.top();

    if (now <= before + 2 && !this.nearBottom(4)) {
      // เลื่อนไม่ได้ → อาจมีหน้าต่าง (dialog) ล็อกการเลื่อนอยู่ หรือกล่องที่เลื่อนเปลี่ยนไป
      this.stats.stuck++;
      if (closeModal()) this.stats.dialogsClosed++;
      const posts = document.querySelectorAll<HTMLElement>(SEL.article);
      const last = posts[posts.length - 1];
      if (last) {
        last.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior });
        this.stats.fallbackIntoView++;
      }
      await sleep(80);
      now = this.top();
    }

    const moved = now > before + 2;
    if (moved) this.stats.moves++;
    this.highWater = Math.max(this.highWater, now);
    this.stats.maxTop = Math.round(this.highWater);
    return moved;
  }

  /** อยู่ท้ายหน้าแล้วแต่ยังไม่โหลดเพิ่ม → ขยับขึ้นแล้วลงใหม่ เพื่อกระตุ้นให้ Facebook โหลดต่อ */
  async nudge() {
    this.stats.nudges++;
    const posts = document.querySelectorAll<HTMLElement>(SEL.article);
    this.set(Math.max(0, this.top() - this.view()));
    await sleep(400);
    posts[posts.length - 1]?.scrollIntoView({ block: 'end', behavior: 'instant' as ScrollBehavior });
    await sleep(150);
    this.set(this.height());
    this.highWater = Math.max(this.highWater, this.top());
  }
}

/** ปิดหน้าต่างแบบ modal ที่ล็อกการเลื่อน (เช่น เปิดโพสต์ขึ้นมาเพราะกด "ดูเพิ่มเติม") */
function closeModal(): boolean {
  const dlg = [...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"], [role="dialog"]')].find(
    (d) => d.getBoundingClientRect().height > window.innerHeight * 0.5 && !d.closest('#fbgm-panel'),
  );
  if (!dlg) return false;
  const close = dlg.querySelector<HTMLElement>('[aria-label="ปิด"], [aria-label="Close"], [aria-label="close"]');
  if (close) close.click();
  else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
  return true;
}
