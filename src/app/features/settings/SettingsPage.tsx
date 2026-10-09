import PageHeader from '../../components/PageHeader';
import PhaseNote from '../../components/PhaseNote';
import { th } from '../../i18n/th';
import DataSection from './DataSection';

const UPCOMING = [
  { title: 'การดึงข้อมูล', body: 'เงื่อนไขหยุดเริ่มต้น จำนวนโพสต์ต่อรอบ และจำนวนวันย้อนหลัง' },
  { title: 'สำรองข้อมูล', body: 'ส่งออกและนำเข้าไฟล์ JSON เพื่อย้ายข้อมูลไปเครื่องอื่น' },
  { title: 'ความเป็นส่วนตัว', body: 'เลือกไม่เก็บชื่อผู้โพสต์' },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader title={th.settings.title} subtitle={th.settings.subtitle} />
      <div className="space-y-4">
        <DataSection />
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface opacity-70">
          {UPCOMING.map((s) => (
            <section key={s.title} className="p-5">
              <h2 className="font-semibold">{s.title}</h2>
              <p className="text-sm text-muted thai-wrap">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
      <PhaseNote phase={8}>การตั้งค่าการดึงข้อมูล การสำรองข้อมูล และความเป็นส่วนตัว</PhaseNote>
    </>
  );
}
