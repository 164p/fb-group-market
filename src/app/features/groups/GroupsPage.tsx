import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import PhaseNote from '../../components/PhaseNote';
import { UsersIcon } from '../../components/Icons';
import { th } from '../../i18n/th';

export default function GroupsPage() {
  return (
    <>
      <PageHeader title={th.groups.title} subtitle={th.groups.subtitle} />
      <EmptyState title={th.groups.emptyTitle} body={th.groups.emptyBody} icon={<UsersIcon width={24} height={24} />} />
      <PhaseNote phase={4}>ฟอร์มแปะลิงก์กลุ่ม ตรวจรูปแบบลิงก์ กันเพิ่มซ้ำ และปุ่มเปิดกลุ่มแบบเรียงโพสต์ใหม่</PhaseNote>
    </>
  );
}
