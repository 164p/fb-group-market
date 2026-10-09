import { useId, useMemo, useState } from 'react';
import { GROUP_URL_ERRORS, parseGroupUrl } from '../../../shared/parser/url';
import type { Group } from '../../../shared/types';
import { CheckIcon, PlusIcon } from '../../components/Icons';
import { defaultGroupName, store } from '../../db';

/**
 * ฟอร์มแปะลิงก์กลุ่ม
 * - แสดงรหัสกลุ่มที่อ่านได้ทันทีที่ลิงก์ถูกต้อง
 * - แสดงข้อผิดพลาดเมื่อกดเพิ่ม หรือหลังแปะลิงก์ (ไม่เตือนระหว่างพิมพ์)
 * - กลุ่มซ้ำ: แจ้งและชี้ไปที่กลุ่มเดิม
 */
export default function AddGroupForm({
  groups,
  onAdded,
  onDuplicate,
}: {
  groups: Group[];
  onAdded: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const [text, setText] = useState('');
  const [showError, setShowError] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputId = useId();
  const msgId = useId();

  const parsed = useMemo(() => parseGroupUrl(text), [text]);
  const existing = parsed.ok ? groups.find((g) => g.id === parsed.id) : undefined;

  async function submit() {
    if (!parsed.ok) {
      setShowError(true);
      return;
    }
    if (existing) {
      onDuplicate(existing.id);
      setShowError(true);
      return;
    }
    setBusy(true);
    try {
      const added = await store.groups.add({ id: parsed.id, url: parsed.url, name: defaultGroupName(parsed.id) });
      if (added) {
        setText('');
        setShowError(false);
        onAdded(parsed.id);
      } else {
        onDuplicate(parsed.id);
      }
    } finally {
      setBusy(false);
    }
  }

  let message: { tone: 'ok' | 'error' | 'hint'; text: string };
  if (parsed.ok && existing) message = { tone: 'error', text: `มีกลุ่มนี้แล้ว: ${existing.name}` };
  else if (parsed.ok) message = { tone: 'ok', text: `รหัสกลุ่ม ${parsed.id}` };
  else if (showError && text.trim()) message = { tone: 'error', text: GROUP_URL_ERRORS[parsed.reason] };
  else if (showError) message = { tone: 'error', text: GROUP_URL_ERRORS.empty };
  else
    message = {
      tone: 'hint',
      text: 'ไม่บังคับ — ใช้เมื่ออยากเก็บรายชื่อกลุ่มไว้เปิดดึงข้อมูลภายหลัง กลุ่มที่ดึงข้อมูลแล้วจะเพิ่มเองอัตโนมัติ',
    };

  const invalid = message.tone === 'error';

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="rounded-2xl border border-line bg-surface p-5"
    >
      <label htmlFor={inputId} className="mb-2 block font-semibold">
        เพิ่มกลุ่มไว้ล่วงหน้าด้วยลิงก์
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={inputId}
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setShowError(false);
          }}
          onPaste={() => setTimeout(() => setShowError(true), 0)}
          placeholder="https://www.facebook.com/groups/…"
          aria-invalid={invalid}
          aria-describedby={msgId}
          className={`h-11 w-full min-w-0 shrink-0 rounded-xl border bg-paper px-4 focus:outline-none sm:w-auto sm:flex-1 ${
            invalid ? 'border-warn' : 'border-line focus:border-accent'
          }`}
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-5 font-semibold hover:bg-sunken disabled:opacity-60"
        >
          <PlusIcon width={18} height={18} />
          เพิ่มกลุ่ม
        </button>
      </div>
      <p
        id={msgId}
        role={invalid ? 'alert' : undefined}
        className={`mt-2 flex items-start gap-1.5 text-sm thai-wrap ${
          message.tone === 'error' ? 'text-warn' : message.tone === 'ok' ? 'text-good' : 'text-muted'
        }`}
      >
        {message.tone === 'ok' && <CheckIcon width={16} height={16} className="mt-0.5 shrink-0" />}
        {message.text}
      </p>
    </form>
  );
}
