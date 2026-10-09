import { useEffect, useRef, useState } from 'react';
import { SearchIcon, XIcon } from '../../components/Icons';

/** ช่องค้นหา: อัปเดต URL หลังหยุดพิมพ์ 200ms · กด / เพื่อโฟกัส · Esc เพื่อล้าง */
export default function SearchBox({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [text, setText] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const last = useRef(value);

  // URL เปลี่ยนจากที่อื่น (เช่น ปุ่มย้อนกลับ) → อัปเดตช่อง
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => {
    if (text === last.current) return;
    const id = setTimeout(() => {
      last.current = text;
      onChange(text);
    }, 200);
    return () => clearTimeout(id);
  }, [text, onChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative">
      <SearchIcon
        width={20}
        height={20}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        ref={ref}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && text) {
            e.preventDefault();
            setText('');
          }
        }}
        placeholder="ค้นหาสินค้า เช่น iPhone 13, โต๊ะทำงาน, เลนส์ 50mm"
        aria-label="ค้นหาสินค้า"
        className="h-13 w-full rounded-xl border border-line bg-surface pl-12 pr-12 text-base placeholder:text-muted/80 focus:border-accent focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button
          type="button"
          onClick={() => {
            setText('');
            ref.current?.focus();
          }}
          aria-label="ล้างคำค้น"
          className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink"
        >
          <XIcon width={16} height={16} />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 font-mono text-xs text-muted md:block">
          /
        </kbd>
      )}
    </div>
  );
}
