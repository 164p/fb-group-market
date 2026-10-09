import PageHeader from '../../components/PageHeader';
import PhaseNote from '../../components/PhaseNote';
import { BookmarkIcon } from '../../components/Icons';
import { th } from '../../i18n/th';

export default function SetupPage() {
  return (
    <>
      <PageHeader title={th.setup.title} subtitle={th.setup.subtitle} />

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <ol className="space-y-3">
          {th.setup.steps.map((step, i) => (
            <li key={step} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-mono text-sm text-paper">
                {i + 1}
              </span>
              <span className="pt-1 thai-wrap">{step}</span>
            </li>
          ))}
        </ol>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface p-6 text-center">
          <span
            aria-disabled
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-sunken px-5 py-2.5 font-semibold text-muted"
          >
            <BookmarkIcon width={18} height={18} />
            ดึงสินค้า
          </span>
          <p className="mt-3 text-sm text-muted thai-wrap">{th.setup.buttonPending}</p>
        </div>
      </div>

      <PhaseNote phase={6}>ปุ่ม bookmarklet ของจริง พร้อมภาพประกอบทีละขั้น</PhaseNote>
    </>
  );
}
