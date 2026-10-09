import PageHeader from '../../components/PageHeader';
import PhaseNote from '../../components/PhaseNote';
import { th } from '../../i18n/th';

const SECTIONS = [
  { title: 'การดึงข้อมูล', body: 'เงื่อนไขหยุดเริ่มต้น จำนวนโพสต์ต่อรอบ และจำนวนวันย้อนหลัง' },
  { title: 'สำรองข้อมูล', body: 'ส่งออกและนำเข้าไฟล์ JSON เพื่อย้ายข้อมูลไปเครื่องอื่น' },
  { title: 'ความเป็นส่วนตัว', body: 'เลือกไม่เก็บชื่อผู้โพสต์ และล้างข้อมูลทั้งหมด' },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader title={th.settings.title} subtitle={th.settings.subtitle} />
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {SECTIONS.map((s) => (
          <section key={s.title} className="flex items-center justify-between gap-4 p-5">
            <div>
              <h2 className="font-semibold">{s.title}</h2>
              <p className="text-sm text-muted thai-wrap">{s.body}</p>
            </div>
          </section>
        ))}
      </div>
      <PhaseNote phase={8}>ตัวเลือกทั้งหมดในหน้านี้จะใช้งานได้หลังมีฐานข้อมูล (เฟส 2) และหน้ารับข้อมูล (เฟส 7)</PhaseNote>
    </>
  );
}
