import { useEffect, useRef, useState } from 'react';
import { BOOKMARKLET_HREF } from '../../generated/bookmarklet';

/**
 * ปุ่มให้ลากไปที่แถบบุ๊กมาร์ก
 * ตั้ง href ผ่าน DOM โดยตรง เพราะ React ไม่ส่งเสริม javascript: URL ใน JSX
 * กดบนหน้านี้จะไม่ทำงาน (ต้องกดบนหน้ากลุ่ม Facebook) จึงแสดงคำแนะนำแทน
 */
export default function BookmarkletButton() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    ref.current?.setAttribute('href', BOOKMARKLET_HREF);
  }, []);

  return (
    <div className="flex flex-col items-center text-center">
      <a
        ref={ref}
        draggable
        onClick={(e) => {
          e.preventDefault();
          setHint(true);
        }}
        title="ลากปุ่มนี้ไปวางบนแถบบุ๊กมาร์ก"
        className="inline-flex cursor-grab items-center gap-2 rounded-full bg-accent px-6 py-3 text-lg font-bold text-accent-ink shadow-[0_0_0_4px_var(--color-tag)] active:cursor-grabbing"
      >
        <span aria-hidden className="grid h-7 w-7 place-items-center rounded-md bg-tag font-price text-base text-accent">
          ฿
        </span>
        ดึงสินค้า
      </a>
      <p className={`mt-3 text-sm thai-wrap ${hint ? 'font-semibold text-warn' : 'text-muted'}`} role={hint ? 'alert' : undefined}>
        {hint ? 'ลากปุ่มไปวางบนแถบบุ๊กมาร์ก อย่ากดบนหน้านี้' : 'ลากปุ่มนี้ไปวางบนแถบบุ๊กมาร์ก'}
      </p>
    </div>
  );
}
