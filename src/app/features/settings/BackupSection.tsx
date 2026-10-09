import { useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { db, store } from '../../db';
import { backupFileName, exportBackup, importBackup } from '../../db/backup';
import { useDataStats } from '../../hooks/useData';

export default function BackupSection() {
  const stats = useDataStats();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function download() {
    setBusy(true);
    setMsg(null);
    try {
      const data = await exportBackup(db);
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName();
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg({ ok: true, text: `ส่งออกแล้ว ${data.listings.length.toLocaleString('th-TH')} รายการ จาก ${data.groups.length} กลุ่ม` });
    } finally {
      setBusy(false);
    }
  }

  async function restore(f: File) {
    setBusy(true);
    setMsg(null);
    try {
      const data = JSON.parse(await f.text());
      const r = await importBackup(db, store, data);
      setMsg({ ok: true, text: `นำเข้าแล้ว ${r.listings.toLocaleString('th-TH')} รายการ จาก ${r.groups} กลุ่ม (ข้อมูลเดิมยังอยู่ครบ)` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof SyntaxError ? 'อ่านไฟล์ไม่ได้ ต้องเป็นไฟล์ .json ที่ส่งออกจากหน้านี้' : (e as Error).message });
    } finally {
      setBusy(false);
      if (file.current) file.current.value = '';
    }
  }

  const nothing = !!stats && stats.realGroups === 0;

  return (
    <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="backup-title">
      <h2 id="backup-title" className="font-semibold">
        สำรองและย้ายข้อมูล
      </h2>
      <p className="text-sm text-muted thai-wrap">
        ข้อมูลอยู่ในเบราว์เซอร์นี้เท่านั้น ส่งออกเป็นไฟล์เพื่อเก็บสำรอง หรือนำไปใช้บนคอมเครื่องอื่น ไม่รวมข้อมูลตัวอย่าง
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={download} disabled={busy || nothing}>
          ส่งออกไฟล์สำรอง
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => file.current?.click()}>
          นำเข้าไฟล์สำรอง
        </Button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="เลือกไฟล์สำรอง"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void restore(f);
          }}
        />
      </div>
      <p role="status" aria-live="polite" className={`mt-3 min-h-5 text-sm ${msg?.ok === false ? 'text-warn' : 'text-good'}`}>
        {msg?.text}
      </p>
    </section>
  );
}
