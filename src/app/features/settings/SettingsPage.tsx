import { Link } from 'react-router-dom';
import { BOOKMARKLET_VERSION, PARSER_VERSION } from '../../../shared/config';
import PageHeader from '../../components/PageHeader';
import { BOOKMARKLET_SIZE } from '../../generated/bookmarklet';
import { th } from '../../i18n/th';
import { ROUTES } from '../../routes';
import { useAcceptedTermsAt } from '../guide/TermsGate';
import BackupSection from './BackupSection';
import DataSection from './DataSection';

export default function SettingsPage() {
  const accepted = useAcceptedTermsAt();
  return (
    <>
      <PageHeader title={th.settings.title} subtitle="ข้อมูลในเบราว์เซอร์ การสำรองข้อมูล และความเป็นส่วนตัว" />
      <div className="space-y-4">
        <DataSection />
        <BackupSection />

        <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="privacy-title">
          <h2 id="privacy-title" className="font-semibold">
            ความเป็นส่วนตัว
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted thai-wrap">
            <li>ไม่มีเซิร์ฟเวอร์กลาง ข้อมูลทั้งหมดอยู่ในเบราว์เซอร์นี้</li>
            <li>ไม่เก็บชื่อผู้โพสต์และรูปภาพ เก็บเฉพาะข้อความโพสต์และลิงก์</li>
            <li>ปุ่มดึงสินค้าจำรหัสโพสต์ที่เคยดึงไว้ในเบราว์เซอร์ เพื่อใช้กับ "หยุดเมื่อเจอโพสต์ที่เคยดึงแล้ว"</li>
          </ul>
          <p className="mt-3 text-sm">
            {accepted ? `ยอมรับข้อตกลงเมื่อ ${new Date(accepted).toLocaleDateString('th-TH', { dateStyle: 'long' })} · ` : ''}
            <Link to={ROUTES.guide} className="font-semibold text-accent hover:underline">
              อ่านข้อตกลง
            </Link>
          </p>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 text-sm" aria-labelledby="about-title">
          <h2 id="about-title" className="font-semibold">
            เกี่ยวกับ
          </h2>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-muted">
            <dt>ปุ่มดึงสินค้า</dt>
            <dd>เวอร์ชัน {BOOKMARKLET_VERSION} ({(BOOKMARKLET_SIZE / 1024).toFixed(0)} KB)</dd>
            <dt>ระบบอ่านราคา</dt>
            <dd>เวอร์ชัน {PARSER_VERSION}</dd>
            <dt>ซอร์สโค้ด</dt>
            <dd>
              <a href="https://github.com/164p/fb-group-market" target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
                github.com/164p/fb-group-market
              </a>
            </dd>
          </dl>
        </section>
      </div>
    </>
  );
}
