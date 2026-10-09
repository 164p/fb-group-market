import type { Listing } from '../../../shared/types';
import { formatPrice } from '../../lib/format';

/**
 * ป้ายราคาแบบสติกเกอร์เหลือง — องค์ประกอบเด่นของหน้า
 * ขายแล้ว: ป้ายจางและขีดฆ่า · ไม่มีราคา: ป้ายเส้นประ
 */
export default function PriceTag({ listing, size = 'md' }: { listing: Listing; size?: 'md' | 'sm' }) {
  const p = formatPrice(listing);
  const sold = listing.status === 'sold';
  const big = size === 'md';

  if (p.empty) {
    return (
      <span
        className={`inline-flex items-center rounded-md border border-dashed border-line px-2.5 text-muted ${
          big ? 'h-9 text-sm' : 'h-7 text-xs'
        }`}
      >
        {p.main}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`relative inline-flex items-baseline gap-0.5 rounded-md bg-tag pl-5 pr-2.5 font-price font-bold text-tag-ink tabular-nums ${
          big ? 'h-9 -rotate-[1.5deg] text-[22px] leading-9' : 'h-7 text-[17px] leading-7'
        } ${sold ? 'opacity-45 line-through decoration-2' : ''}`}
        aria-label={`ราคา ${p.main} บาท${sold ? ' (ขายแล้ว)' : ''}`}
      >
        {/* รูร้อยเชือกของป้ายราคา */}
        <span
          aria-hidden
          className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-paper ring-1 ring-tag-ink/25"
        />
        <span className={`font-sans font-semibold ${big ? 'text-sm' : 'text-xs'}`}>฿</span>
        {p.main}
      </span>
      {p.note && !sold && <span className="text-xs font-medium text-muted">{p.note}</span>}
    </span>
  );
}
