import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import PhaseNote from '../../components/PhaseNote';
import { ButtonLink } from '../../components/Button';
import { TagIcon } from '../../components/Icons';
import { th } from '../../i18n/th';
import { ROUTES } from '../../routes';

export default function ListingsPage() {
  return (
    <>
      <PageHeader title={th.listings.title} subtitle={th.listings.subtitle} />
      <EmptyState title={th.listings.emptyTitle} body={th.listings.emptyBody} icon={<TagIcon width={24} height={24} />}>
        <ButtonLink to={ROUTES.groups}>{th.listings.emptyCtaGroups}</ButtonLink>
        <ButtonLink to={ROUTES.setup} variant="secondary">
          {th.listings.emptyCtaSetup}
        </ButtonLink>
      </EmptyState>
      <PhaseNote phase={3}>ช่องค้นหา ตัวกรอง (กลุ่ม ช่วงราคา ช่วงเวลา สถานะ) และการ์ดสินค้าพร้อมลิงก์ไปโพสต์</PhaseNote>
    </>
  );
}
