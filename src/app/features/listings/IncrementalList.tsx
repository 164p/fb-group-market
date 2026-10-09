import { useEffect, useRef, useState, type ReactNode } from 'react';

const PAGE = 48;

/**
 * แสดงรายการทีละชุด แล้วต่อชุดถัดไปเมื่อเลื่อนใกล้ท้าย
 * ใช้แทน virtual list เพราะการ์ดสูงไม่เท่ากัน (virtual grid ทำให้หน้ากระตุกเวลาเลื่อน)
 * จำนวนที่แสดงรีเซ็ตเฉพาะเมื่อ resetKey เปลี่ยน (เปลี่ยนตัวกรอง/คำค้น) ไม่ใช่ตอนกดดาว/ซ่อน
 */
export default function IncrementalList<T>({
  items,
  resetKey,
  className,
  getKey,
  render,
}: {
  items: T[];
  resetKey: string;
  className?: string;
  getKey: (item: T) => string;
  render: (item: T) => ReactNode;
}) {
  const [count, setCount] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => setCount(PAGE), [resetKey]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setCount((c) => c + PAGE);
      },
      { rootMargin: '1200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [count >= items.length]);

  const shown = items.slice(0, count);
  return (
    <>
      <div className={className}>
        {shown.map((it) => (
          <div key={getKey(it)} className="[contain-intrinsic-size:auto_240px] [content-visibility:auto]">
            {render(it)}
          </div>
        ))}
      </div>
      {count < items.length && <div ref={sentinel} aria-hidden className="h-px" />}
    </>
  );
}
