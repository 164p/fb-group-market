import { Link } from 'react-router-dom';
import { BrandMark } from '../../components/Layout';
import PhaseNote from '../../components/PhaseNote';
import { th } from '../../i18n/th';
import { ROUTES } from '../../routes';

/** หน้าต่างที่ bookmarklet เปิดเพื่อส่งข้อมูลเข้ามา — ใช้ layout ย่อ เพราะมักเปิดเป็นหน้าต่างเล็ก */
export default function ReceivePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 py-6">
      <Link to={ROUTES.listings} className="mb-8 flex items-center gap-2.5">
        <BrandMark size={28} />
        <span className="font-bold">{th.app.name}</span>
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">{th.receive.title}</h1>
      <p className="mt-1 text-muted thai-wrap">{th.receive.subtitle}</p>

      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-surface p-5" role="status">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
        </span>
        <span>{th.receive.waiting}</span>
      </div>

      <PhaseNote phase={7}>รับข้อมูลผ่าน postMessage แสดงความคืบหน้า และช่องวางข้อมูลสำรองจากคลิปบอร์ด</PhaseNote>
    </div>
  );
}
