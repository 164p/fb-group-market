import { useState } from 'react';
import { Button } from '../../components/Button';
import { store } from '../../db';
import { isSampleGroupId, removeSampleData, seedSampleData } from '../../db/sample';
import { reparseListing } from '../../../shared/parser';
import { useDataStats } from '../../hooks/useData';
import { th } from '../../i18n/th';

const t = th.settings.data;

export default function DataSection() {
  const stats = useDataStats();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage(done);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="data-title">
      <h2 id="data-title" className="font-semibold">
        {t.title}
      </h2>
      <p className="text-sm text-muted thai-wrap">{t.body}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:max-w-sm">
        {[
          { label: t.listings, value: stats?.listings },
          { label: t.groups, value: stats?.groups },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-sunken px-4 py-3">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="font-mono text-2xl font-medium tabular-nums">{s.value ?? '–'}</dd>
          </div>
        ))}
      </dl>

      {!!stats?.sampleGroups && <p className="mt-3 text-sm text-muted">{t.sampleNote(stats.sampleGroups)}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="secondary" disabled={busy} onClick={() => run(() => seedSampleData(store), t.doneReseed)}>
          {t.reseed}
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !stats?.sampleGroups}
          onClick={() => run(() => removeSampleData(store), t.doneRemoveSample)}
        >
          {t.removeSample}
        </Button>
        <Button
          variant="secondary"
          disabled={busy || !stats?.realGroups}
          title="ใช้ตัวแยกราคาและชื่อสินค้าเวอร์ชันล่าสุดกับโพสต์ที่เก็บไว้แล้ว"
          onClick={async () => {
            setBusy(true);
            setMessage(null);
            try {
              const n = await store.listings.reparseAll(reparseListing, isSampleGroupId);
              setMessage(n ? `อัปเดตแล้ว ${n.toLocaleString('th-TH')} รายการ` : 'ข้อมูลเป็นปัจจุบันแล้ว');
            } finally {
              setBusy(false);
            }
          }}
        >
          แยกราคาและชื่อใหม่
        </Button>
        <Button
          variant="danger"
          disabled={busy || !stats?.groups}
          onClick={() => {
            if (window.confirm(t.confirmClearAll)) void run(() => store.clearAllData(), t.doneClearAll);
          }}
        >
          {t.clearAll}
        </Button>
      </div>

      <p role="status" aria-live="polite" className="mt-3 min-h-5 text-sm text-good">
        {message}
      </p>
    </section>
  );
}
