import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Virtuoso, VirtuosoGrid } from 'react-virtuoso';
import type { Listing } from '../../../shared/types';
import EmptyState from '../../components/EmptyState';
import { Button, ButtonLink } from '../../components/Button';
import { GridIcon, ListIcon, SearchIcon, SlidersIcon, TagIcon } from '../../components/Icons';
import { db, store } from '../../db';
import { useGroups } from '../../hooks/useData';
import { th } from '../../i18n/th';
import { ROUTES } from '../../routes';
import ActiveChips from './ActiveChips';
import FilterDrawer from './FilterDrawer';
import FilterPanel from './FilterPanel';
import { ListingCard, ListingRow } from './ListingItem';
import SearchBox from './SearchBox';
import { activeFilterCount, applyFilters, SORT_OPTIONS, type SortKey } from './filters';
import { buildSearchIndex } from './search';
import { useListingFilters } from './useListingFilters';

/** เวลาปัจจุบันที่อัปเดตทุกนาที — ใช้กับ "3 ชั่วโมงที่ผ่านมา" และตัวกรองช่วงเวลา */
function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** แถบแจ้งเตือนเล็กด้านล่าง พร้อมปุ่มเลิกทำ */
function UndoToast({ message, onUndo, onDone }: { message: string; onUndo: () => void; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 5000);
    return () => clearTimeout(id);
  }, [message, onDone]);
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-md items-center justify-between gap-4 rounded-xl bg-ink px-4 py-3 text-sm text-paper md:bottom-6"
    >
      <span>{message}</span>
      <button type="button" onClick={onUndo} className="font-semibold text-tag hover:underline">
        เลิกทำ
      </button>
    </div>
  );
}

export default function ListingsPage() {
  const { filters, update, resetFilters } = useListingFilters();
  const listings = useLiveQuery(() => db.listings.toArray(), []);
  const groups = useGroups() ?? [];
  const now = useNow();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<{ id: string; title: string } | null>(null);

  const index = useMemo(() => buildSearchIndex(listings ?? []), [listings]);
  const hits = useMemo(() => (filters.q.trim() ? index.search(filters.q) : undefined), [index, filters.q]);
  const results = useMemo(
    () => (listings ? applyFilters(listings, filters, now, hits) : []),
    [listings, filters, now, hits],
  );

  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);
  const groupCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of listings ?? []) m.set(l.groupId, (m.get(l.groupId) ?? 0) + 1);
    return m;
  }, [listings]);

  // เลือก "ตรงคำค้นที่สุด" แต่ไม่มีคำค้น → แจ้งในตัวเลือก (ผลเรียงตามใหม่สุด)
  const sortOptions = SORT_OPTIONS.filter((o) => o.value !== 'relevance' || filters.q.trim() || filters.sort === 'relevance');

  const onToggleFavorite = useCallback((l: Listing) => void store.listings.setFavorite(l.id, !l.favorite), []);
  const onToggleHidden = useCallback((l: Listing) => {
    void store.listings.setHidden(l.id, !l.hidden);
    if (!l.hidden) setToast({ id: l.id, title: l.title });
  }, []);
  const clearToast = useCallback(() => setToast(null), []);

  const onSearch = useCallback(
    (q: string) => {
      // เริ่มค้นหาจากหน้าเปล่า → เรียงตามความตรงให้อัตโนมัติ, ล้างคำค้น → กลับไปใหม่สุด
      if (q.trim() && !filters.q.trim() && filters.sort === 'newest') update({ q, sort: 'relevance' });
      else if (!q.trim() && filters.sort === 'relevance') update({ q, sort: 'newest' });
      else update({ q });
    },
    [filters.q, filters.sort, update],
  );

  const resultsTop = useRef<HTMLDivElement>(null);
  const isSample = groups.length > 0 && groups.every((g) => g.isSample);
  const nFilters = activeFilterCount(filters);
  const itemProps = { now, onToggleFavorite, onToggleHidden };

  if (listings === undefined) return null;

  if (listings.length === 0) {
    return (
      <>
        <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-[28px]">{th.listings.title}</h1>
        <EmptyState title={th.listings.emptyTitle} body={th.listings.emptyBody} icon={<TagIcon width={24} height={24} />}>
          <ButtonLink to={ROUTES.setup}>{th.listings.emptyCtaSetup}</ButtonLink>
          <ButtonLink to={ROUTES.groups} variant="secondary">
            {th.listings.emptyCtaGroups}
          </ButtonLink>
        </EmptyState>
      </>
    );
  }

  const panel = <FilterPanel filters={filters} update={update} groups={groups} groupCounts={groupCounts} />;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{th.listings.title}</h1>
        <p className="text-sm text-muted">
          {th.listings.summary(listings.length, groups.length)}
          {isSample && (
            <span className="ml-2 rounded-full bg-tag px-2 py-0.5 text-xs font-semibold text-tag-ink">
              {th.listings.sampleBadge}
            </span>
          )}
        </p>
      </div>

      <SearchBox value={filters.q} onChange={onSearch} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block" aria-label="ตัวกรอง">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pb-6 pr-1">{panel}</div>
        </aside>

        <section aria-label="ผลลัพธ์" className="min-w-0">
          <div ref={resultsTop} className="mb-4 flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm" aria-live="polite">
              <span className="font-semibold tabular-nums">{results.length.toLocaleString('th-TH')}</span>{' '}
              <span className="text-muted">รายการ</span>
            </p>

            <Button variant="secondary" className="lg:hidden" onClick={() => setDrawerOpen(true)}>
              <SlidersIcon width={16} height={16} />
              ตัวกรอง
              {nFilters > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs text-accent-ink">
                  {nFilters}
                </span>
              )}
            </Button>

            <label className="sr-only" htmlFor="sort">
              เรียงตาม
            </label>
            <select
              id="sort"
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as SortKey })}
              className="h-9 rounded-full border border-line bg-surface px-3 text-sm font-medium focus:border-accent focus:outline-none"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <div className="hidden rounded-full border border-line bg-surface p-0.5 sm:flex" role="radiogroup" aria-label="มุมมอง">
              {(
                [
                  { v: 'grid', label: 'การ์ด', Icon: GridIcon },
                  { v: 'list', label: 'รายการ', Icon: ListIcon },
                ] as const
              ).map(({ v, label, Icon }) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={filters.view === v}
                  aria-label={label}
                  title={label}
                  onClick={() => update({ view: v })}
                  className={`grid h-8 w-8 place-items-center rounded-full ${
                    filters.view === v ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Icon width={16} height={16} />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <ActiveChips filters={filters} update={update} reset={resetFilters} groups={groups} />
          </div>

          {results.length === 0 ? (
            <EmptyState
              title={filters.q.trim() ? `ไม่พบ "${filters.q.trim()}"` : 'ไม่มีรายการตรงกับตัวกรอง'}
              body={
                nFilters > 0
                  ? 'ลองเอาตัวกรองบางตัวออก หรือรวมรายการที่ขายแล้ว'
                  : 'ลองใช้คำที่สั้นลง หรือสะกดแบบอื่น เช่น ไอโฟน / iPhone'
              }
              icon={<SearchIcon width={24} height={24} />}
            >
              {nFilters > 0 && <Button onClick={resetFilters}>ล้างตัวกรอง</Button>}
              {filters.q.trim() && (
                <Button variant="secondary" onClick={() => onSearch('')}>
                  ล้างคำค้น
                </Button>
              )}
            </EmptyState>
          ) : filters.view === 'grid' ? (
            <VirtuosoGrid
              useWindowScroll
              data={results}
              computeItemKey={(_, l) => l.id}
              listClassName="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              itemContent={(_, l) => <ListingCard listing={l} group={groupById.get(l.groupId)} {...itemProps} />}
            />
          ) : (
            <Virtuoso
              useWindowScroll
              data={results}
              computeItemKey={(_, l) => l.id}
              className="border-t border-line"
              itemContent={(_, l) => <ListingRow listing={l} group={groupById.get(l.groupId)} {...itemProps} />}
            />
          )}
        </section>
      </div>

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} resultCount={results.length}>
        {panel}
      </FilterDrawer>

      {toast && (
        <UndoToast
          message="ซ่อนรายการแล้ว"
          onUndo={() => {
            void store.listings.setHidden(toast.id, false);
            setToast(null);
          }}
          onDone={clearToast}
        />
      )}
    </>
  );
}
