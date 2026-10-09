import { th } from '../i18n/th';

/** ป้ายบอกว่าส่วนนี้จะเสร็จในเฟสไหน — ลบออกเมื่อฟีเจอร์เสร็จ */
export default function PhaseNote({ phase, children }: { phase: number; children: string }) {
  return (
    <p className="mt-6 flex items-start gap-2 rounded-xl bg-accent-soft px-4 py-3 text-sm thai-wrap">
      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-ink">
        {th.common.comingSoon} · เฟส {phase}
      </span>
      <span>{children}</span>
    </p>
  );
}
