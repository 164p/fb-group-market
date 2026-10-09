import type { Group } from '../../../shared/types';
import { XIcon } from '../../components/Icons';
import { formatBaht } from '../../lib/format';
import { WITHIN_OPTIONS, type Filters } from './filters';

interface Chip {
  key: string;
  label: string;
  clear: Partial<Filters>;
}

function priceLabel(min: number | null, max: number | null) {
  if (min != null && max != null) return `฿${formatBaht(min)}–${formatBaht(max)}`;
  if (min != null) return `฿${formatBaht(min)} ขึ้นไป`;
  return `ไม่เกิน ฿${formatBaht(max!)}`;
}

/** แถบตัวกรองที่ใช้อยู่ กดเพื่อเอาออกทีละตัว */
export default function ActiveChips({
  filters: f,
  update,
  reset,
  groups,
}: {
  filters: Filters;
  update: (p: Partial<Filters>) => void;
  reset: () => void;
  groups: Group[];
}) {
  const name = new Map(groups.map((g) => [g.id, g.name]));
  const chips: Chip[] = [
    ...f.groups.map((id) => ({
      key: `g-${id}`,
      label: name.get(id) ?? id,
      clear: { groups: f.groups.filter((g) => g !== id) },
    })),
    ...(f.min != null || f.max != null
      ? [{ key: 'price', label: priceLabel(f.min, f.max), clear: { min: null, max: null } }]
      : []),
    ...(f.hasPrice ? [{ key: 'hasPrice', label: 'ระบุราคา', clear: { hasPrice: false } }] : []),
    ...(f.within !== 'all'
      ? [
          {
            key: 'within',
            label: `ภายใน ${WITHIN_OPTIONS.find((o) => o.value === f.within)!.label}`,
            clear: { within: 'all' as const },
          },
        ]
      : []),
    ...(f.showSold ? [{ key: 'sold', label: 'รวมที่ขายแล้ว', clear: { showSold: false } }] : []),
    ...(f.favOnly ? [{ key: 'fav', label: 'ติดดาว', clear: { favOnly: false } }] : []),
    ...(f.showHidden ? [{ key: 'hidden', label: 'รวมที่ซ่อนไว้', clear: { showHidden: false } }] : []),
  ];

  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-1.5" aria-label="ตัวกรองที่ใช้อยู่">
      {chips.map((c) => (
        <li key={c.key}>
          <button
            type="button"
            onClick={() => update(c.clear)}
            className="inline-flex max-w-60 items-center gap-1 rounded-full bg-accent-soft py-1 pl-3 pr-2 text-xs font-medium text-ink hover:bg-sunken"
            aria-label={`เอาตัวกรอง ${c.label} ออก`}
          >
            <span className="truncate">{c.label}</span>
            <XIcon width={13} height={13} className="shrink-0" />
          </button>
        </li>
      ))}
      {chips.length > 1 && (
        <li>
          <button type="button" onClick={reset} className="px-2 py-1 text-xs font-semibold text-accent hover:underline">
            ล้างตัวกรอง
          </button>
        </li>
      )}
    </ul>
  );
}
