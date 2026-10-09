import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useLocation } from 'react-router-dom';
import { db, store } from '../../db';
import { ROUTES } from '../../routes';
import { TERMS } from './terms';

/** การตั้งค่า acceptedTermsAt (null = ยังไม่ยอมรับ, undefined = กำลังโหลด) */
export function useAcceptedTermsAt(): number | null | undefined {
  return useLiveQuery(async () => {
    const row = await db.settings.get('acceptedTermsAt');
    return typeof row?.value === 'number' ? row.value : null;
  }, []);
}

/**
 * หน้าต่างยอมรับข้อตกลงเมื่อเปิดเว็บครั้งแรก
 * ไม่แสดงในหน้าคู่มือ (ให้อ่านฉบับเต็มได้) และหน้ารับข้อมูล (ไม่ขวางการนำเข้า)
 */
export default function TermsGate() {
  const accepted = useAcceptedTermsAt();
  const { pathname } = useLocation();
  const [checked, setChecked] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const show = accepted === null && pathname !== ROUTES.guide;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (show && !d.open) d.showModal();
    if (!show && d.open) d.close();
  }, [show]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="terms-title"
      onCancel={(e) => e.preventDefault()}
      className="m-auto max-h-[90dvh] w-[min(94vw,520px)] overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
    >
      <div className="p-6">
        <h2 id="terms-title" className="text-xl font-bold">
          ก่อนเริ่มใช้ตลาดกลุ่ม
        </h2>
        <p className="mt-1 text-sm text-muted">อ่านสั้นๆ 5 ข้อ ใช้เวลาไม่ถึงนาที</p>
        <ol className="mt-4 space-y-3">
          {TERMS.map((t, i) => (
            <li key={t.title} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sunken text-xs font-semibold">{i + 1}</span>
              <div>
                <p className="font-semibold leading-snug">{t.title}</p>
                <p className="text-sm text-muted thai-wrap">{t.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-sunken p-3 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
          />
          <span>ฉันเข้าใจและยอมรับข้อตกลงข้างต้น</span>
        </label>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Link to={ROUTES.guide} className="text-sm font-semibold text-accent hover:underline">
            อ่านคู่มือฉบับเต็ม
          </Link>
          <button
            type="button"
            disabled={!checked}
            onClick={() => void store.settings.update({ acceptedTermsAt: Date.now() })}
            className="h-11 rounded-full bg-accent px-6 font-semibold text-accent-ink disabled:opacity-40"
          >
            เริ่มใช้งาน
          </button>
        </div>
      </div>
    </dialog>
  );
}
