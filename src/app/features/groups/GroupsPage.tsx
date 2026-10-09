import { useEffect, useState } from 'react';
import type { Group } from '../../../shared/types';
import ConfirmDialog from '../../components/ConfirmDialog';
import PageHeader from '../../components/PageHeader';
import { store } from '../../db';
import { removeSampleData } from '../../db/sample';
import { useGroups } from '../../hooks/useData';
import { th } from '../../i18n/th';
import AddGroupForm from './AddGroupForm';
import GroupRow from './GroupRow';

export default function GroupsPage() {
  const groups = useGroups();
  const [highlight, setHighlight] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Group | null>(null);
  const now = Date.now();

  // ไฮไลต์กลุ่มที่เพิ่งเพิ่มหรือที่ซ้ำ 2.5 วินาที
  useEffect(() => {
    if (!highlight) return;
    const id = setTimeout(() => setHighlight(null), 2500);
    return () => clearTimeout(id);
  }, [highlight]);

  if (!groups) return null;
  const mine = groups.filter((g) => !g.isSample).reverse();
  const samples = groups.filter((g) => g.isSample);

  const list = (items: Group[]) => (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {items.map((g) => (
        <GroupRow key={g.id} group={g} now={now} highlight={highlight === g.id} onDelete={setToDelete} />
      ))}
    </ul>
  );

  return (
    <>
      <PageHeader title={th.groups.title} subtitle={th.groups.subtitle} />

      <AddGroupForm groups={groups} onAdded={setHighlight} onDuplicate={setHighlight} />

      <section className="mt-8" aria-labelledby="my-groups">
        <h2 id="my-groups" className="mb-3 font-semibold">
          กลุ่มของคุณ <span className="font-normal text-muted">({mine.length})</span>
        </h2>
        {mine.length > 0 ? (
          list(mine)
        ) : (
          <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-muted thai-wrap">
            ยังไม่มีกลุ่ม แปะลิงก์กลุ่มด้านบนเพื่อเริ่มต้น
          </p>
        )}
      </section>

      {samples.length > 0 && (
        <section className="mt-8" aria-labelledby="sample-groups">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 id="sample-groups" className="font-semibold">
              กลุ่มตัวอย่าง <span className="font-normal text-muted">({samples.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => void removeSampleData(store)}
              className="text-sm font-semibold text-accent hover:underline"
            >
              ลบข้อมูลตัวอย่าง
            </button>
          </div>
          {list(samples)}
        </section>
      )}

      <section className="mt-10 rounded-2xl bg-sunken p-5 text-sm thai-wrap" aria-labelledby="how-to">
        <h2 id="how-to" className="mb-2 font-semibold">
          ดึงสินค้าจากกลุ่มอย่างไร
        </h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>เพิ่มกลุ่มด้วยลิงก์ด้านบน</li>
          <li>กด "เปิดกลุ่มเพื่อดึงข้อมูล" ระบบจะเปิดกลุ่มแบบเรียงโพสต์ใหม่สุด</li>
          <li>บนหน้ากลุ่ม กดบุ๊กมาร์ก "ดึงสินค้า" ที่ติดตั้งไว้ (พร้อมใช้ในเฟสถัดไป)</li>
        </ol>
      </section>

      <ConfirmDialog
        open={!!toDelete}
        title={`ลบกลุ่ม "${toDelete?.name ?? ''}"?`}
        confirmLabel="ลบกลุ่ม"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) void store.groups.remove(toDelete.id);
          setToDelete(null);
        }}
      >
        {toDelete && toDelete.listingCount > 0
          ? `สินค้า ${toDelete.listingCount.toLocaleString('th-TH')} รายการจากกลุ่มนี้จะถูกลบด้วย ย้อนกลับไม่ได้`
          : 'ย้อนกลับไม่ได้'}
      </ConfirmDialog>
    </>
  );
}
