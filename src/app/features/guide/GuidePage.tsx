import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { store } from '../../db';
import { th } from '../../i18n/th';
import { ROUTES } from '../../routes';
import { TERMS } from './terms';
import { useAcceptedTermsAt } from './TermsGate';

const TOC = [
  { id: 'start', label: 'เริ่มใช้งาน' },
  { id: 'collect', label: 'ดึงสินค้าจากกลุ่ม' },
  { id: 'browse', label: 'ค้นหาและกรอง' },
  { id: 'parsing', label: 'ระบบอ่านราคา' },
  { id: 'limits', label: 'ข้อจำกัด' },
  { id: 'faq', label: 'คำถามพบบ่อย' },
  { id: 'terms', label: 'ข้อตกลงและความเป็นส่วนตัว' },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 border-t border-line pt-8">
      <h2 id={`${id}-h`} className="mb-3 text-xl font-bold">
        {title}
      </h2>
      <div className="space-y-3 leading-relaxed thai-wrap">{children}</div>
    </section>
  );
}

const FAQ: [string, ReactNode][] = [
  [
    'กดปุ่มแล้วขึ้น "ไม่พบโพสต์"',
    'ตรวจว่าอยู่หน้าแรกของกลุ่ม (ที่อยู่ขึ้นต้นด้วย facebook.com/groups/) และเห็นโพสต์อย่างน้อยหนึ่งโพสต์บนจอ ถ้ายังไม่ได้ Facebook อาจเปลี่ยนหน้าตา แจ้งผู้พัฒนาได้',
  ],
  [
    'กด "ส่งเข้าเว็บ" แล้วไม่มีแท็บใหม่',
    'เบราว์เซอร์บล็อกป๊อปอัป ให้กดอนุญาตป๊อปอัปสำหรับ facebook.com (มักมีไอคอนที่แถบที่อยู่) หรือกด "คัดลอกข้อมูลแทน" แล้ววางในหน้ารับข้อมูล',
  ],
  ['ราคาหรือชื่อสินค้าผิด', 'กด "ดูโพสต์บน Facebook" เพื่อเช็กต้นฉบับ เมื่อมีการปรับปรุงระบบอ่านราคา รายการเดิมจะถูกอ่านใหม่ให้อัตโนมัติ'],
  ['ดึงกลุ่มเดิมซ้ำ จะได้สินค้าซ้ำไหม', 'ไม่ซ้ำ ระบบอัปเดตโพสต์เดิม เช่น ราคาที่เปลี่ยน หรือสถานะขายแล้ว และคงดาว/การซ่อนที่คุณตั้งไว้'],
  ['ย้ายไปใช้คอมเครื่องอื่น', 'หน้าตั้งค่า → "ส่งออกไฟล์สำรอง" แล้วนำไฟล์ไป "นำเข้าไฟล์สำรอง" บนเครื่องใหม่'],
  ['ใช้บนมือถือได้ไหม', 'ดูรายการสินค้าบนมือถือได้ แต่การดึงสินค้าต้องทำบนคอมพิวเตอร์ เพราะเบราว์เซอร์มือถือใช้บุ๊กมาร์กแบบนี้ได้จำกัด'],
  ['ปุ่มดึงสินค้าบอกว่าเป็นเวอร์ชันเก่า', 'ลบบุ๊กมาร์กเดิม แล้วลากปุ่มใหม่จากหน้าติดตั้ง'],
];

export default function GuidePage() {
  const accepted = useAcceptedTermsAt();

  return (
    <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
      <nav aria-label="สารบัญ" className="hidden lg:block">
        <ul className="sticky top-24 space-y-1 text-sm">
          {TOC.map((t) => (
            <li key={t.id}>
              <a href={`#${t.id}`} onClick={(e) => {
                e.preventDefault();
                document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth' });
              }} className="block rounded-md px-2 py-1 text-muted hover:bg-sunken hover:text-ink">
                {t.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <article className="max-w-2xl space-y-8">
        <PageHeader title={th.guide.title} subtitle={th.guide.subtitle} />

        {accepted === null && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent-soft p-4">
            <p className="text-sm">อ่านข้อตกลงด้านล่างแล้ว กดยอมรับเพื่อเริ่มใช้งาน</p>
            <button
              type="button"
              onClick={() => void store.settings.update({ acceptedTermsAt: Date.now() })}
              className="h-10 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink"
            >
              ยอมรับข้อตกลง
            </button>
          </div>
        )}

        <Section id="start" title="เริ่มใช้งาน">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              ไปที่ <Link to={ROUTES.setup} className="font-semibold text-accent hover:underline">หน้าติดตั้ง</Link> แล้วลากปุ่ม
              "ดึงสินค้า" ไปไว้ที่แถบบุ๊กมาร์กของเบราว์เซอร์ (ทำครั้งเดียว)
            </li>
            <li>เปิดกลุ่มซื้อขายบน Facebook ที่คุณเป็นสมาชิก</li>
            <li>กดบุ๊กมาร์ก "ดึงสินค้า" เลือกว่าจะหยุดเมื่อไร แล้วกด "เริ่มดึงสินค้า"</li>
            <li>เมื่อเสร็จ กด "ส่งเข้าเว็บ" สินค้าจะขึ้นในหน้าสินค้าทันที และกลุ่มจะถูกเพิ่มให้อัตโนมัติ</li>
          </ol>
        </Section>

        <Section id="collect" title="ดึงสินค้าจากกลุ่ม">
          <p>ปุ่มจะเลื่อนหน้าให้เองแบบมีจังหวะ กด "ดูเพิ่มเติม" ให้ และเก็บโพสต์ไปเรื่อยๆ ระหว่างเลื่อน ใช้เวลาประมาณ 1–3 นาทีต่อ 100 โพสต์ เปิดแท็บ Facebook ค้างไว้จนเสร็จ</p>
          <p className="font-semibold">เลือกว่าจะหยุดเมื่อไร</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><b>ครบ N โพสต์</b> — เหมาะกับการดึงครั้งแรก</li>
            <li><b>ย้อนหลัง N วัน</b> — ไม่นับโพสต์ปักหมุดเก่าด้านบน</li>
            <li><b>เจอโพสต์ที่เคยดึงแล้ว</b> — เร็วที่สุดสำหรับการเช็กของใหม่เป็นประจำ</li>
          </ul>
          <p className="text-sm text-muted">ระบบจำกัดสูงสุด 500 โพสต์ต่อรอบ เพื่อไม่ให้ Facebook มองว่าผิดปกติ</p>
        </Section>

        <Section id="browse" title="ค้นหาและกรอง">
          <ul className="list-disc space-y-1 pl-5">
            <li>พิมพ์ได้ทั้งไทยและอังกฤษ หลายคำต้องมีครบทุกคำ ถ้าสะกดผิดเล็กน้อยระบบจะลองหาใกล้เคียงให้ (กด <kbd className="rounded border border-line px-1 font-mono text-xs">/</kbd> เพื่อค้นหา)</li>
            <li>กรองตามกลุ่ม ช่วงราคา ช่วงเวลาโพสต์ และเลือกแสดงรายการที่ขายแล้ว ติดดาว หรือซ่อนไว้</li>
            <li>ตัวกรองอยู่ในลิงก์ บุ๊กมาร์กมุมมองที่ใช้บ่อยไว้ได้</li>
            <li>กดดาวเพื่อเก็บรายการที่สนใจ กดซ่อนเพื่อไม่ต้องเห็นอีก</li>
          </ul>
        </Section>

        <Section id="parsing" title="ระบบอ่านราคา">
          <p>ระบบอ่านชื่อสินค้าและราคาจากข้อความโพสต์ เข้าใจรูปแบบที่พบบ่อย เช่น 12,900.- · ฿1,500 · 5.5k · 2 หมื่น · 500-800 บาท · 970รวมส่ง และไม่สับสนกับเบอร์โทร ความจุ GB ขนาดนิ้ว หรือราคาเต็มที่ซื้อมา</p>
          <p>โพสต์ที่ขายหลายอย่างในโพสต์เดียวจะถูกแยกเป็นหลายรายการ แต่ละรายการมีราคาของตัวเอง และบอกว่ามาจากโพสต์ไหน</p>
          <p className="text-sm text-muted">ระบบอ่านจากข้อความ จึงอาจพลาดได้ โดยเฉพาะราคาที่อยู่ในรูปภาพ เช็กกับโพสต์ต้นฉบับก่อนตัดสินใจซื้อเสมอ</p>
        </Section>

        <Section id="limits" title="ข้อจำกัด">
          <ul className="list-disc space-y-1 pl-5">
            <li>ดึงได้เฉพาะกลุ่มที่คุณเป็นสมาชิกและเห็นโพสต์อยู่แล้ว</li>
            <li>ไม่อัปเดตเอง ต้องเปิดกลุ่มแล้วกดปุ่มทุกครั้งที่อยากได้ของใหม่</li>
            <li>ไม่เก็บรูปภาพ และไม่อ่านราคาที่อยู่ในรูป</li>
            <li>ถ้า Facebook เปลี่ยนหน้าตา ปุ่มอาจใช้ไม่ได้ชั่วคราวจนกว่าจะมีการอัปเดต</li>
          </ul>
        </Section>

        <Section id="faq" title="คำถามพบบ่อย">
          <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-4 py-3">
                <summary className="cursor-pointer font-semibold marker:text-muted">{q}</summary>
                <p className="mt-2 text-sm text-muted">{a}</p>
              </details>
            ))}
          </div>
        </Section>

        <Section id="terms" title="ข้อตกลงและความเป็นส่วนตัว">
          <ol className="space-y-3">
            {TERMS.map((t, i) => (
              <li key={t.title} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sunken text-xs font-semibold">{i + 1}</span>
                <div>
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-sm text-muted">{t.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted">
            ซื้อขายอย่างระวัง: ตรวจสอบประวัติผู้ขาย หลีกเลี่ยงการโอนเงินก่อนเห็นสินค้า และใช้ระบบคนกลางเมื่อทำได้
          </p>
          {accepted ? (
            <p className="text-sm text-good">คุณยอมรับข้อตกลงแล้วเมื่อ {new Date(accepted).toLocaleDateString('th-TH', { dateStyle: 'long' })}</p>
          ) : null}
        </Section>
      </article>
    </div>
  );
}
