import { useEffect, useRef, type ReactNode } from 'react';

/** กล่องยืนยันการกระทำที่ย้อนกลับไม่ได้ */
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
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
      onClose={onCancel}
      aria-labelledby="confirm-title"
      className="m-auto w-[min(92vw,420px)] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/40"
    >
      <div className="p-5">
        <h2 id="confirm-title" className="text-lg font-semibold thai-wrap">
          {title}
        </h2>
        {children && <div className="mt-2 text-sm text-muted thai-wrap">{children}</div>}
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <button type="button" onClick={onCancel} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-sunken">
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={onConfirm}
          autoFocus
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper hover:opacity-90"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
