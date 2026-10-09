import PageHeader from '../../components/PageHeader';
import PhaseNote from '../../components/PhaseNote';
import { th } from '../../i18n/th';

const FACTS = [
  {
    title: 'ข้อมูลอยู่ในเครื่องคุณเท่านั้น',
    body: 'ไม่มีเซิร์ฟเวอร์กลาง รายการสินค้าเก็บในเบราว์เซอร์ที่คุณใช้ ล้างข้อมูลเบราว์เซอร์แล้วข้อมูลจะหาย',
  },
  {
    title: 'อ่านเฉพาะสิ่งที่คุณเห็นได้',
    body: 'ปุ่มดึงข้อมูลอ่านโพสต์จากหน้ากลุ่มที่คุณเปิดอยู่และเป็นสมาชิก ไม่ใช้รหัสผ่านหรือ API ของ Facebook',
  },
  {
    title: 'ไม่เกี่ยวข้องกับ Meta',
    body: 'เครื่องมือนี้ไม่ได้รับการรับรองจาก Meta การเก็บข้อมูลอัตโนมัติอาจขัดข้อตกลงของ Facebook ผู้ใช้รับผิดชอบการใช้งานเอง',
  },
];

export default function GuidePage() {
  return (
    <>
      <PageHeader title={th.guide.title} subtitle={th.guide.subtitle} />
      <div className="grid gap-4 md:grid-cols-3">
        {FACTS.map((f) => (
          <section key={f.title} className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-1.5 text-sm text-muted thai-wrap">{f.body}</p>
          </section>
        ))}
      </div>
      <PhaseNote phase={8}>วิธีใช้ทีละขั้น คำถามพบบ่อย และหน้าต่างยอมรับข้อตกลงเมื่อเปิดใช้ครั้งแรก</PhaseNote>
    </>
  );
}
