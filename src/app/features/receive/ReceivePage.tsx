import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MIN_BOOKMARKLET_VERSION } from '../../../shared/config';
import { isBridgeMessage, isExportPayload, isTrustedFacebookOrigin, type BridgeMessage } from '../../../shared/protocol';
import type { StopReason } from '../../../shared/types';
import { BrandMark } from '../../components/Layout';
import { CheckIcon } from '../../components/Icons';
import { store } from '../../db';
import { th } from '../../i18n/th';
import { ROUTES } from '../../routes';
import { Ingestor, type IngestSession } from './ingest';

type View =
  | { kind: 'waiting' }
  | { kind: 'receiving'; session: IngestSession }
  | { kind: 'done'; session: IngestSession; stopReason: StopReason; imported?: boolean }
  | { kind: 'error'; title: string; body: string };

const STOP_TEXT: Record<StopReason, string> = {
  maxPosts: 'ครบจำนวนที่ตั้งไว้',
  maxAge: 'ถึงโพสต์ที่เก่ากว่าที่ตั้งไว้',
  reachedKnown: 'เจอโพสต์ที่เคยดึงแล้ว',
  noMore: 'ไม่มีโพสต์โหลดเพิ่มแล้ว',
  user: 'หยุดตามที่กด',
  error: 'เกิดข้อผิดพลาดระหว่างดึง',
};

const nf = (n: number) => n.toLocaleString('th-TH');

function Stat({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="rounded-xl bg-sunken px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`font-price tabular-nums ${strong ? 'text-3xl font-bold' : 'text-xl font-semibold'}`}>{nf(value)}</dd>
    </div>
  );
}

function Totals({ s }: { s: IngestSession }) {
  return (
    <dl className="mt-4 grid grid-cols-3 gap-2">
      <Stat label="สินค้าใหม่" value={s.totals.added} strong />
      <Stat label="อัปเดต" value={s.totals.updated} />
      <Stat label="มีราคา" value={s.totals.withPrice} />
    </dl>
  );
}

/** ช่องวางข้อมูลที่คัดลอกจากแผงบน Facebook (ใช้เมื่อส่งตรงไม่ได้) */
function PasteBox({ autoFocus, onImport }: { autoFocus: boolean; onImport: (text: string) => Promise<string | null> }) {
  const [open, setOpen] = useState(autoFocus);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open && autoFocus) ref.current?.focus();
  }, [open, autoFocus]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-6 text-sm font-semibold text-accent hover:underline">
        มีข้อมูลที่คัดลอกมาแล้ว? วางที่นี่
      </button>
    );
  }
  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface p-4">
      <label htmlFor="paste" className="font-semibold">
        วางข้อมูลที่คัดลอกมา
      </label>
      <p className="text-sm text-muted thai-wrap">กด "คัดลอกข้อมูล" ในแผงบน Facebook แล้ววางที่นี่ (Ctrl+V หรือ ⌘+V)</p>
      <textarea
        id="paste"
        ref={ref}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        rows={4}
        spellCheck={false}
        className="mt-2 w-full rounded-lg border border-line bg-paper p-2 font-mono text-xs focus:border-accent focus:outline-none"
        placeholder='{"v":1,"type":"EXPORT",...}'
      />
      {error && (
        <p role="alert" className="mt-1 text-sm text-warn">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={!text.trim() || busy}
        onClick={async () => {
          setBusy(true);
          setError(await onImport(text));
          setBusy(false);
        }}
        className="mt-2 h-10 w-full rounded-full bg-accent font-semibold text-accent-ink disabled:opacity-50"
      >
        นำเข้าข้อมูล
      </button>
    </div>
  );
}

/** หน้าต่างที่ bookmarklet เปิดเพื่อส่งข้อมูลเข้ามา — ใช้ layout ย่อ เพราะมักเปิดเป็นหน้าต่างเล็ก */
export default function ReceivePage() {
  const [params] = useSearchParams();
  const expectedSession = params.get('s');
  const pasteMode = params.get('paste') === '1';
  const [view, setView] = useState<View>({ kind: 'waiting' });
  const ingestor = useRef(new Ingestor(store));
  // กันข้อความที่มาช้าหลังจบรอบแล้วไปเขียนทับหน้าสรุป
  const finished = useRef(new Set<string>());

  useEffect(() => {
    const ing = ingestor.current;
    const onMessage = async (e: MessageEvent) => {
      if (!isTrustedFacebookOrigin(e.origin) || !isBridgeMessage(e.data)) return;
      const m = e.data;
      if (expectedSession && m.sessionId !== expectedSession) return;
      const reply = (ack: Omit<Extract<BridgeMessage, { type: 'ACK' }>, 'v' | 'type' | 'sessionId'>) =>
        (e.source as Window | null)?.postMessage({ v: 1, type: 'ACK', sessionId: m.sessionId, ...ack }, e.origin);

      if (m.type === 'HELLO') {
        if (m.bookmarkletVersion < MIN_BOOKMARKLET_VERSION) {
          reply({ seq: 0, minBookmarkletVersion: MIN_BOOKMARKLET_VERSION });
          setView({ kind: 'error', title: 'ปุ่มดึงสินค้าเป็นเวอร์ชันเก่า', body: 'ลบบุ๊กมาร์กเดิม แล้วลากปุ่มใหม่จากหน้าติดตั้ง' });
          return;
        }
        const s = await ing.start(m.sessionId, m.group);
        if (!s) {
          setView({ kind: 'error', title: 'อ่านข้อมูลกลุ่มไม่ได้', body: 'ลองเปิดหน้าแรกของกลุ่มแล้วกดปุ่มดึงสินค้าใหม่' });
          return;
        }
        reply({ seq: 0, knownIds: s.knownIds, storeAuthorName: s.storeAuthorName, minBookmarkletVersion: MIN_BOOKMARKLET_VERSION });
        if (!finished.current.has(m.sessionId)) setView({ kind: 'receiving', session: { ...s } });
      } else if (m.type === 'BATCH') {
        const s = await ing.batch(m.sessionId, m.seq, m.posts);
        if (!s) return;
        reply({ seq: m.seq });
        if (!finished.current.has(m.sessionId)) setView({ kind: 'receiving', session: { ...s, totals: { ...s.totals } } });
      } else if (m.type === 'DONE') {
        const { session, ackSeq } = await ing.finish(m.sessionId, m.stopReason);
        if (!session) return;
        reply({ seq: ackSeq });
        finished.current.add(m.sessionId);
        setView({ kind: 'done', session: { ...session, totals: { ...session.totals } }, stopReason: m.stopReason });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [expectedSession]);

  const importText = useCallback(async (text: string): Promise<string | null> => {
    let data: unknown;
    try {
      data = JSON.parse(text.trim());
    } catch {
      return 'ข้อมูลไม่ถูกต้อง ต้องเป็นข้อความที่คัดลอกจากปุ่ม "คัดลอกข้อมูล" ทั้งหมด';
    }
    if (!isExportPayload(data)) return 'ข้อมูลไม่ถูกต้อง ต้องเป็นข้อความที่คัดลอกจากปุ่ม "คัดลอกข้อมูล" ทั้งหมด';
    const s = await ingestor.current.importExport(data);
    if (!s) return 'อ่านข้อมูลกลุ่มไม่ได้';
    setView({ kind: 'done', session: s, stopReason: s.stopReason ?? data.stopReason, imported: true });
    return null;
  }, []);

  // วางที่ไหนก็ได้ในหน้า (ระหว่างรอ) → นำเข้าทันทีถ้าเป็นข้อมูลที่คัดลอกมา
  useEffect(() => {
    if (view.kind !== 'waiting') return;
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      const text = e.clipboardData?.getData('text') ?? '';
      if (text.includes('"EXPORT"')) {
        e.preventDefault();
        void importText(text);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [view.kind, importText]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
      <Link to={ROUTES.listings} target="_blank" className="mb-6 flex items-center gap-2.5">
        <BrandMark size={28} />
        <span className="font-bold">{th.app.name}</span>
      </Link>

      {view.kind === 'waiting' && (
        <>
          <h1 className="text-2xl font-bold tracking-tight">{th.receive.title}</h1>
          <p className="mt-1 text-muted thai-wrap">{th.receive.subtitle}</p>
          {!pasteMode && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-surface p-5" role="status">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
              </span>
              <span>{th.receive.waiting}</span>
            </div>
          )}
          <PasteBox autoFocus={pasteMode} onImport={importText} />
        </>
      )}

      {view.kind === 'receiving' && (
        <section aria-live="polite">
          <p className="text-sm text-muted">กำลังรับข้อมูลจาก</p>
          <h1 className="truncate text-xl font-bold" title={view.session.group.name}>
            {view.session.group.name || view.session.group.id}
          </h1>
          <Totals s={view.session} />
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
            <div className="h-full w-1/3 animate-[slide_1.2s_ease-in-out_infinite] rounded-full bg-accent motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-40" />
          </div>
          <p className="mt-3 text-sm text-muted thai-wrap">อย่าปิดหน้าต่างนี้ ระบบบน Facebook กำลังเลื่อนหน้าและส่งโพสต์มาเรื่อยๆ</p>
        </section>
      )}

      {view.kind === 'done' && (
        <section aria-live="polite">
          <div className="flex items-center gap-2 text-good">
            <CheckIcon width={22} height={22} />
            <span className="font-semibold">{view.imported ? 'นำเข้าข้อมูลแล้ว' : 'รับข้อมูลครบแล้ว'}</span>
          </div>
          <h1 className="mt-1 truncate text-xl font-bold" title={view.session.group.name}>
            {view.session.group.name || view.session.group.id}
          </h1>
          {view.session.groupCreated && <p className="text-sm text-muted">เพิ่มกลุ่มนี้ในรายการกลุ่มของคุณแล้ว</p>}
          <Totals s={view.session} />
          <p className="mt-3 text-sm text-muted thai-wrap">
            ได้ {nf(view.session.totals.received)} โพสต์ · หยุดเพราะ{STOP_TEXT[view.stopReason]}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              to={`/?g=${encodeURIComponent(view.session.group.id)}`}
              target="_blank"
              className="flex h-11 items-center justify-center rounded-full bg-accent font-semibold text-accent-ink hover:brightness-110"
            >
              ดูสินค้าจากกลุ่มนี้
            </Link>
            <button
              type="button"
              onClick={() => window.close()}
              className="h-11 rounded-full border border-line font-semibold hover:bg-sunken"
            >
              ปิดหน้าต่างนี้
            </button>
          </div>
        </section>
      )}

      {view.kind === 'error' && (
        <section role="alert">
          <h1 className="text-xl font-bold">{view.title}</h1>
          <p className="mt-1 text-muted thai-wrap">{view.body}</p>
          <Link to={ROUTES.setup} target="_blank" className="mt-4 inline-block font-semibold text-accent hover:underline">
            ไปหน้าติดตั้ง
          </Link>
        </section>
      )}
    </div>
  );
}
