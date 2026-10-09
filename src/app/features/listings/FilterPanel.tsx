import { useEffect, useState, type ReactNode } from 'react';
import type { Group } from '../../../shared/types';
import { formatBaht } from '../../lib/format';
import { PRICE_PRESETS, WITHIN_OPTIONS, type Filters } from './filters';

interface Props {
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  groups: Group[];
  /** จำนวนสินค้าต่อกลุ่ม (ทั้งหมด ไม่สนตัวกรอง) */
  groupCounts: Map<string, number>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `fp-${title}`;
  return (
    <div role="group" aria-labelledby={id} className="border-b border-line py-5 first:pt-0 last:border-0">
      <h2 id={id} className="mb-3 text-sm font-semibold">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 rounded border-line accent-[var(--color-accent)]"
      />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

/** ช่องตัวเลขราคา: รับ "1,500" ได้ · ส่งค่าเมื่อหยุดพิมพ์ 400ms หรือ blur/Enter */
function PriceInput({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number | null;
  onCommit: (v: number | null) => void;
}) {
  const [text, setText] = useState(value == null ? '' : formatBaht(value));
  useEffect(() => setText(value == null ? '' : formatBaht(value)), [value]);

  const commit = () => {
    const n = text.trim() === '' ? null : Number(text.replace(/[^\d]/g, ''));
    const next = n == null || Number.isNaN(n) ? null : n;
    if (next !== value) onCommit(next);
  };
  useEffect(() => {
    const id = setTimeout(commit, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">฿</span>
        <input
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          placeholder="—"
          className="h-10 w-full rounded-lg border border-line bg-surface pl-7 pr-2 text-sm tabular-nums focus:border-accent focus:outline-none"
        />
      </span>
    </label>
  );
}

export default function FilterPanel({ filters: f, update, groups, groupCounts }: Props) {
  const toggleGroup = (id: string, on: boolean) =>
    update({ groups: on ? [...f.groups, id] : f.groups.filter((g) => g !== id) });

  return (
    <div>
      {groups.length > 0 && (
        <Section title="กลุ่ม">
          <div className="max-h-64 overflow-y-auto pr-1">
            {groups.map((g) => (
              <Check key={g.id} checked={f.groups.includes(g.id)} onChange={(on) => toggleGroup(g.id, on)}>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate" title={g.name}>
                    {g.name}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">{groupCounts.get(g.id) ?? 0}</span>
                </span>
              </Check>
            ))}
          </div>
        </Section>
      )}

      <Section title="ราคา (บาท)">
        <div className="flex items-end gap-2">
          <PriceInput label="ต่ำสุด" value={f.min} onCommit={(min) => update({ min })} />
          <span className="pb-2.5 text-muted">–</span>
          <PriceInput label="สูงสุด" value={f.max} onCommit={(max) => update({ max })} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRICE_PRESETS.map((p) => {
            const active = f.min === p.min && f.max === p.max;
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={active}
                onClick={() => update(active ? { min: null, max: null } : { min: p.min, max: p.max })}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="mt-2">
          <Check checked={f.hasPrice} onChange={(hasPrice) => update({ hasPrice })}>
            เฉพาะรายการที่ระบุราคา
          </Check>
        </div>
      </Section>

      <Section title="โพสต์ภายใน">
        <div className="grid grid-cols-5 rounded-lg bg-sunken p-0.5" role="radiogroup" aria-label="โพสต์ภายใน">
          {WITHIN_OPTIONS.map((o) => {
            const active = f.within === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ within: o.value })}
                className={`rounded-md px-1 py-1.5 text-xs font-medium transition-colors ${
                  active ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--color-line)]' : 'text-muted hover:text-ink'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="แสดงผล">
        <Check checked={f.showSold} onChange={(showSold) => update({ showSold })}>
          รวมรายการที่ขายแล้ว
        </Check>
        <Check checked={f.favOnly} onChange={(favOnly) => update({ favOnly })}>
          เฉพาะที่ติดดาว
        </Check>
        <Check checked={f.showHidden} onChange={(showHidden) => update({ showHidden })}>
          แสดงรายการที่ซ่อนไว้
        </Check>
      </Section>
    </div>
  );
}
