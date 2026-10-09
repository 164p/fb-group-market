// แผงควบคุมลอยมุมจอบนหน้า Facebook — อยู่ใน Shadow DOM เพื่อไม่ให้สไตล์ปนกับ Facebook
import type { StopMode } from '../shared/types';

export interface Prefs {
  stopMode: StopMode;
  maxPosts: number;
  maxAgeDays: number;
}

export type PanelState =
  | { kind: 'setup' }
  | { kind: 'connecting' }
  | { kind: 'running'; collected: number; scanned: number; oldest?: string; direct: boolean; paused?: boolean }
  | { kind: 'handoff'; collected: number; note?: string }
  | { kind: 'done'; title: string; body: string; fallback?: boolean; receiveUrl?: string }
  | { kind: 'error'; title: string; body: string; link?: { href: string; label: string } };

const CSS = `
:host{all:initial}
*{box-sizing:border-box;font-family:'IBM Plex Sans Thai',system-ui,-apple-system,'Segoe UI',sans-serif}
.p{position:fixed;right:20px;bottom:20px;z-index:2147483647;width:320px;background:#fff;color:#16201b;border:1px solid #d8dcd2;border-radius:16px;box-shadow:0 12px 40px rgba(22,32,27,.22);font-size:14px;line-height:1.5;overflow:hidden}
.h{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#0f6b57;color:#fff}
.tag{display:grid;place-items:center;width:26px;height:26px;border-radius:7px;background:#ffd60a;color:#0f6b57;font-weight:700;font-size:15px;flex:none}
.h b{font-size:15px;flex:1}
.x{background:none;border:0;color:#fff;font-size:20px;line-height:1;cursor:pointer;padding:2px 6px;border-radius:6px}
.x:hover{background:rgba(255,255,255,.15)}
.b{padding:14px}
.g{font-weight:600;margin:0 0 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.muted{color:#5b6862;font-size:13px;margin:0}
label.o{display:flex;align-items:center;gap:8px;padding:7px 0;cursor:pointer}
label.o input[type=radio]{accent-color:#0f6b57;margin:0}
input.n{width:64px;padding:4px 6px;border:1px solid #d8dcd2;border-radius:8px;font-size:14px;text-align:right}
input.n:disabled{opacity:.45}
.btn{display:block;width:100%;margin-top:12px;padding:10px;border:0;border-radius:999px;background:#0f6b57;color:#fff;font-size:15px;font-weight:600;cursor:pointer}
.btn:hover{filter:brightness(1.1)}
.btn.s{background:#fff;color:#16201b;border:1px solid #d8dcd2}
.btn.s:hover{background:#f2f3ee;filter:none}
.big{font-size:34px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}
.row{display:flex;gap:16px;align-items:baseline;margin:4px 0 8px}
.bar{height:6px;border-radius:99px;background:#e8eae2;overflow:hidden;margin:6px 0 10px}
.bar i{display:block;height:100%;background:#0f6b57;width:30%;animation:m 1.2s ease-in-out infinite}
@keyframes m{0%{transform:translateX(-100%)}100%{transform:translateX(340%)}}
@media (prefers-reduced-motion:reduce){.bar i{animation:none;width:100%;opacity:.4}}
.link{background:none;border:0;padding:0;color:#5b6862;font-size:13px;text-decoration:underline;cursor:pointer}
.warn{background:#fff6dc;border-radius:10px;padding:8px 10px;font-size:13px;margin-top:10px}
a{color:#0f6b57;font-weight:600}
`;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | number> = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false) continue;
    if (k === 'class') el.className = String(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export class Panel {
  private host = document.createElement('div');
  private root: ShadowRoot;
  private body: HTMLElement;
  onStart: (p: Prefs) => void = () => {};
  onStop: () => void = () => {};
  onClose: () => void = () => {};
  onCopy: () => void = () => {};
  onHandoff: () => void = () => {};
  onCopyReport: () => void = () => {};
  /** มีรายงานวิเคราะห์ให้คัดลอก (หลังดึงเสร็จ) */
  reportAvailable = false;

  constructor(private groupName: string, private prefs: Prefs) {
    this.host.id = 'fbgm-panel';
    this.root = this.host.attachShadow({ mode: 'open' });
    this.root.append(h('style', {}, CSS));
    const close = h('button', { class: 'x', 'aria-label': 'ปิด', title: 'ปิด' }, '×');
    close.addEventListener('click', () => this.onClose());
    this.body = h('div', { class: 'b' });
    this.root.append(
      h('div', { class: 'p', role: 'dialog', 'aria-label': 'ดึงสินค้าจากกลุ่ม' }, h('div', { class: 'h' }, h('span', { class: 'tag' }, '฿'), h('b', {}, 'ดึงสินค้า'), close), this.body),
    );
    document.body.append(this.host);
  }

  remove() {
    this.host.remove();
  }

  render(s: PanelState) {
    const nodes = this.view(s);
    if (this.reportAvailable && (s.kind === 'handoff' || s.kind === 'done' || s.kind === 'error')) {
      const rep = h('button', { class: 'link' }, 'คัดลอกรายงานวิเคราะห์');
      rep.addEventListener('click', () => this.onCopyReport());
      nodes.push(h('p', { class: 'muted', style: 'margin-top:12px;text-align:center;font-size:12px' }, 'ได้โพสต์น้อยหรือผิดปกติ? ', rep));
    }
    this.body.replaceChildren(h('p', { class: 'g', title: this.groupName }, this.groupName || 'กลุ่มนี้'), ...nodes);
  }

  private view(s: PanelState): Node[] {
    switch (s.kind) {
      case 'setup':
        return this.setupView();
      case 'connecting':
        return [h('div', { class: 'bar' }, h('i')), h('p', { class: 'muted' }, 'กำลังเชื่อมต่อกับหน้ารับข้อมูล…')];
      case 'running': {
        const stop = h('button', { class: 'btn s' }, 'หยุด');
        stop.addEventListener('click', () => this.onStop());
        const nodes: Node[] = [
          h('div', { class: 'row' }, h('span', { class: 'big' }, String(s.collected)), h('span', { class: 'muted' }, 'โพสต์')),
          h('div', { class: 'bar' }, h('i')),
          h('p', { class: 'muted' }, s.oldest ? `อ่านถึงโพสต์: ${s.oldest}` : 'กำลังเลื่อนหน้าและอ่านโพสต์…'),
        ];
        if (s.paused)
          nodes.push(h('div', { class: 'warn' }, 'หยุดชั่วคราว — กลับมาที่แท็บนี้ Facebook จะโหลดโพสต์เพิ่มเฉพาะตอนที่แท็บนี้แสดงอยู่บนจอ'));
        if (!s.direct) nodes.push(h('p', { class: 'muted', style: 'margin-top:6px' }, 'เมื่อเสร็จ กดปุ่ม "ส่งเข้าเว็บ" เพื่อดูสินค้า'));
        nodes.push(h('p', { class: 'muted', style: 'margin-top:8px' }, 'ระบบเลื่อนหน้าให้เอง ไม่ต้องเลื่อนเอง — เปิดแท็บนี้ค้างไว้บนจอจนเสร็จ (สลับไปแท็บอื่นได้แต่จะหยุดชั่วคราว)'), stop);
        return nodes;
      }
      case 'handoff': {
        const send = h('button', { class: 'btn' }, 'ส่งเข้าเว็บ');
        send.addEventListener('click', () => this.onHandoff());
        const copy = h('button', { class: 'link' }, 'คัดลอกข้อมูลแทน');
        copy.addEventListener('click', () => this.onCopy());
        return [
          h('div', { class: 'row' }, h('span', { class: 'big' }, String(s.collected)), h('span', { class: 'muted' }, 'โพสต์พร้อมส่ง')),
          h('p', { class: 'muted' }, s.note ?? 'กดปุ่มเพื่อเปิดเว็บในแท็บใหม่พร้อมข้อมูล'),
          send,
          h('p', { style: 'margin-top:10px;text-align:center' }, copy),
        ];
      }
      case 'done': {
        const nodes: Node[] = [h('p', { style: 'font-weight:600;margin:0 0 4px' }, s.title), h('p', { class: 'muted' }, s.body)];
        if (s.fallback) {
          const copy = h('button', { class: 'btn' }, 'คัดลอกข้อมูล');
          copy.addEventListener('click', () => this.onCopy());
          nodes.push(copy);
          if (s.receiveUrl)
            nodes.push(h('p', { class: 'muted', style: 'margin-top:10px' }, 'จากนั้นเปิด ', h('a', { href: s.receiveUrl, target: '_blank', rel: 'noopener' }, 'หน้ารับข้อมูล'), ' แล้ววาง'));
        } else {
          const close = h('button', { class: 'btn s' }, 'ปิด');
          close.addEventListener('click', () => this.onClose());
          nodes.push(close);
        }
        return nodes;
      }
      case 'error': {
        const nodes: Node[] = [h('p', { style: 'font-weight:600;margin:0 0 4px' }, s.title), h('p', { class: 'muted' }, s.body)];
        if (s.link) nodes.push(h('p', { style: 'margin-top:10px' }, h('a', { href: s.link.href, target: '_blank', rel: 'noopener' }, s.link.label)));
        return nodes;
      }
    }
  }

  private setupView(): Node[] {
    const p = { ...this.prefs };
    const num = (value: number, min: number, max: number, on: (v: number) => void) => {
      const i = h('input', { class: 'n', type: 'number', min, max, value, inputmode: 'numeric' });
      i.addEventListener('input', () => {
        const v = Math.round(Number(i.value));
        if (Number.isFinite(v)) on(Math.min(max, Math.max(min, v)));
      });
      return i;
    };
    const opt = (mode: StopMode, ...label: (Node | string)[]) => {
      const r = h('input', { type: 'radio', name: 'mode', value: mode, checked: p.stopMode === mode });
      r.addEventListener('change', () => {
        p.stopMode = mode;
        sync();
      });
      return h('label', { class: 'o' }, r, ...label);
    };
    const posts = num(p.maxPosts, 10, 500, (v) => (p.maxPosts = v));
    const days = num(p.maxAgeDays, 1, 90, (v) => (p.maxAgeDays = v));
    const sync = () => {
      posts.disabled = p.stopMode !== 'maxPosts';
      days.disabled = p.stopMode !== 'maxAge';
    };
    sync();
    const start = h('button', { class: 'btn' }, 'เริ่มดึงสินค้า');
    start.addEventListener('click', () => this.onStart(p));
    return [
      h('p', { class: 'muted', style: 'margin-bottom:4px' }, 'หยุดเมื่อ'),
      opt('maxPosts', 'ครบ ', posts, ' โพสต์'),
      opt('maxAge', 'ย้อนหลัง ', days, ' วัน'),
      opt('reachedKnown', 'เจอโพสต์ที่เคยดึงแล้ว'),
      start,
      h('p', { class: 'muted', style: 'margin-top:10px' }, 'ระบบจะเลื่อนหน้าให้เองแบบมีจังหวะ ใช้เวลาประมาณ 1–3 นาทีต่อ 100 โพสต์'),
    ];
  }
}
