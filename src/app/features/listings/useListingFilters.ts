import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_FILTERS, parseFilters, serializeFilters, type Filters } from './filters';

/** อ่าน/เขียนตัวกรองจาก URL (#/?q=...&min=...) */
export function useListingFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);

  const update = useCallback(
    (patch: Partial<Filters>) => setParams(serializeFilters({ ...parseFilters(params), ...patch }), { replace: true }),
    [params, setParams],
  );

  /** ล้างตัวกรองทั้งหมด แต่คงคำค้น การเรียง และมุมมองไว้ */
  const resetFilters = useCallback(() => {
    const cur = parseFilters(params);
    setParams(serializeFilters({ ...DEFAULT_FILTERS, q: cur.q, sort: cur.sort, view: cur.view }), { replace: true });
  }, [params, setParams]);

  return { filters, update, resetFilters };
}
