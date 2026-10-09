import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import PhaseNote from '../../components/PhaseNote';
import { UsersIcon } from '../../components/Icons';
import { useGroups } from '../../hooks/useData';
import { th } from '../../i18n/th';

export default function GroupsPage() {
  const groups = useGroups();

  return (
    <>
      <PageHeader title={th.groups.title} subtitle={th.groups.subtitle} />
      {groups === undefined ? null : groups.length === 0 ? (
        <EmptyState title={th.groups.emptyTitle} body={th.groups.emptyBody} icon={<UsersIcon width={24} height={24} />} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {groups.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{g.name}</p>
                <p className="truncate text-xs text-muted">{g.url}</p>
              </div>
              <span className="shrink-0 font-mono text-sm tabular-nums text-muted">{g.listingCount} รายการ</span>
            </li>
          ))}
        </ul>
      )}
      <PhaseNote phase={4}>ฟอร์มแปะลิงก์กลุ่ม ตรวจรูปแบบลิงก์ กันเพิ่มซ้ำ และปุ่มเปิดกลุ่มแบบเรียงโพสต์ใหม่</PhaseNote>
    </>
  );
}
