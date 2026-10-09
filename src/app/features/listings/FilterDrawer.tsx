import { useEffect, useRef, type ReactNode } from 'react';
import { XIcon } from '../../components/Icons';

/** แผงตัวกรองแบบเลื่อนขึ้นจากล่างจอ สำหรับมือถือ */
export default function FilterDrawer({
  open,
  onClose,
  resultCount,
  children,
}: {
  open: boolean;
  onClose: () => void;
  resultCount: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label="ตัวกรอง"
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-2xl bg-paper p-0 text-ink backdrop:bg-black/40"
    >
      <div className="flex max-h-[88dvh] flex-col">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-semibold">ตัวกรอง</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-sunken"
          >
            <XIcon width={18} height={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5">{open && children}</div>
        <div className="border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-full bg-accent font-semibold text-accent-ink"
          >
            ดู {resultCount.toLocaleString('th-TH')} รายการ
          </button>
        </div>
      </div>
    </dialog>
  );
}
