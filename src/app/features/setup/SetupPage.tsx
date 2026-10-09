import PageHeader from '../../components/PageHeader';
import { th } from '../../i18n/th';
import BookmarkletButton from './BookmarkletButton';

const TIPS = [
  'ตั้งการเรียงโพสต์ของกลุ่มเป็น "โพสต์ใหม่" ก่อนกด ปุ่ม "เปิดกลุ่มเพื่อดึงข้อมูล" ในหน้ากลุ่มของเราทำให้อัตโนมัติ',
  'เปิดแท็บ Facebook ค้างไว้จนเสร็จ ถ้าสลับไปแท็บอื่น การเลื่อนหน้าจะช้าลง',
  'ระบบเลื่อนหน้าแบบมีจังหวะเพื่อไม่ให้ Facebook มองว่าผิดปกติ ประมาณ 1–3 นาทีต่อ 100 โพสต์',
  'ใช้ได้บนคอมพิวเตอร์ (Chrome, Edge, Firefox) บนมือถือใช้ดูรายการสินค้าได้ แต่ดึงข้อมูลไม่ได้',
];

export default function SetupPage() {
  return (
    <>
      <PageHeader title={th.setup.title} subtitle={th.setup.subtitle} />

      <div className="grid gap-6 md:grid-cols-[1fr_340px]">
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

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-accent bg-accent-soft p-8">
          <BookmarkletButton />
        </div>
      </div>

      <section className="mt-8" aria-labelledby="tips">
        <h2 id="tips" className="mb-3 font-semibold">
          ควรรู้ก่อนใช้
        </h2>
        <ul className="space-y-2 text-sm text-muted thai-wrap">
          {TIPS.map((t) => (
            <li key={t} className="flex gap-2">
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      <details className="mt-8 rounded-2xl border border-line bg-surface p-5 text-sm">
        <summary className="cursor-pointer font-semibold">ไม่เห็นแถบบุ๊กมาร์ก / ลากไม่ได้</summary>
        <div className="mt-3 space-y-2 text-muted thai-wrap">
          <p>Chrome / Edge: กด Ctrl+Shift+B (Mac: ⌘+Shift+B) เพื่อแสดงแถบบุ๊กมาร์ก</p>
          <p>Firefox: คลิกขวาที่แถบด้านบน แล้วเลือก "แถบเครื่องมือที่คั่นหน้า"</p>
          <p>ลากไม่ได้: คลิกขวาที่ปุ่ม "ดึงสินค้า" แล้วเลือก "คัดลอกที่อยู่ลิงก์" จากนั้นสร้างบุ๊กมาร์กใหม่และวางลิงก์นั้นในช่อง URL</p>
        </div>
      </details>
    </>
  );
}
