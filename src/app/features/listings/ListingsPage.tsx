import { useLiveQuery } from 'dexie-react-hooks';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import PhaseNote from '../../components/PhaseNote';
import { ButtonLink } from '../../components/Button';
import { TagIcon } from '../../components/Icons';
import { db } from '../../db';
import { useDataStats } from '../../hooks/useData';
import { th } from '../../i18n/th';
import { ROUTES } from '../../routes';

const baht = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });

/** ตารางย่อ 10 รายการล่าสุด — ใช้ตรวจข้อมูลชั่วคราว จะถูกแทนด้วยการ์ดสินค้าในเฟส 3 */
function LatestPreview() {
  const latest = useLiveQuery(() => db.listings.orderBy('postedAt').reverse().limit(10).toArray(), []);
  if (!latest) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-sunken text-left text-xs text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">สินค้า (10 รายการล่าสุด)</th>
            <th className="px-4 py-2 text-right font-medium">ราคา (บาท)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {latest.map((l) => (
            <tr key={l.id}>
              <td className="px-4 py-2.5 thai-wrap">
                {l.title}
                {l.status === 'sold' && <span className="ml-2 text-xs text-muted">· ขายแล้ว</span>}
              </td>
              <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                {l.priceType === 'range' && l.priceMin != null && l.priceMax != null
                  ? `${baht.format(l.priceMin)}–${baht.format(l.priceMax)}`
                  : l.price != null
                    ? baht.format(l.price)
                    : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ListingsPage() {
  const stats = useDataStats();
  const hasData = !!stats && stats.listings > 0;

  return (
    <>
      <PageHeader
        title={th.listings.title}
        subtitle={hasData ? th.listings.summary(stats.listings, stats.groups) : th.listings.subtitle}
        actions={
          hasData && stats.sampleGroups > 0 ? (
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold">{th.listings.sampleBadge}</span>
          ) : undefined
        }
      />

      {stats === undefined ? null : hasData ? (
        <LatestPreview />
      ) : (
        <EmptyState title={th.listings.emptyTitle} body={th.listings.emptyBody} icon={<TagIcon width={24} height={24} />}>
          <ButtonLink to={ROUTES.groups}>{th.listings.emptyCtaGroups}</ButtonLink>
          <ButtonLink to={ROUTES.setup} variant="secondary">
            {th.listings.emptyCtaSetup}
          </ButtonLink>
        </EmptyState>
      )}

      <PhaseNote phase={3}>ช่องค้นหา ตัวกรอง (กลุ่ม ช่วงราคา ช่วงเวลา สถานะ) และการ์ดสินค้าพร้อมลิงก์ไปโพสต์</PhaseNote>
    </>
  );
}
