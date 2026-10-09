import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { chronologicalGroupUrl } from '../../../shared/parser/url';
import type { Group } from '../../../shared/types';
import { ExternalIcon, PencilIcon, TrashIcon } from '../../components/Icons';
import { store } from '../../db';
import { relativeTime } from '../../lib/format';

export default function GroupRow({
  group,
  highlight,
  now,
  onDelete,
}: {
  group: Group;
  highlight: boolean;
  now: number;
  onDelete: (g: Group) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const rowRef = useRef<HTMLLIElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (highlight) rowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlight]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const save = async () => {
    const n = name.trim();
    if (n && n !== group.name) await store.groups.rename(group.id, n);
    else setName(group.name);
    setEditing(false);
  };

  const synced = relativeTime(group.lastSyncedAt ?? null, now);
  // แสดงชื่อกลุ่มภาษาไทยให้อ่านได้ แทนรหัส %E0%B8...
  const displayUrl = `facebook.com/groups/${group.id}`;

  return (
    <li
      ref={rowRef}
      className={`flex flex-col gap-4 px-5 py-4 transition-colors sm:flex-row sm:items-center ${
        highlight ? 'bg-accent-soft' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void save()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save();
              if (e.key === 'Escape') {
                setName(group.name);
                setEditing(false);
              }
            }}
            aria-label="ชื่อกลุ่ม"
            maxLength={100}
            className="h-9 w-full rounded-lg border border-accent bg-paper px-3 font-semibold focus:outline-none"
          />
        ) : (
          <div className="flex items-center gap-1">
            <h3 className="truncate font-semibold" title={group.name}>
              {group.name}
            </h3>
            {!group.isSample && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label={`เปลี่ยนชื่อกลุ่ม ${group.name}`}
                title="เปลี่ยนชื่อ"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink"
              >
                <PencilIcon width={14} height={14} />
              </button>
            )}
          </div>
        )}
        <p className="truncate text-xs text-muted">{displayUrl}</p>
        <p className="mt-1.5 flex flex-wrap gap-x-4 text-sm">
          <span>
            <span className="font-semibold tabular-nums">{group.listingCount.toLocaleString('th-TH')}</span>{' '}
            <span className="text-muted">รายการ</span>
          </span>
          <span className="text-muted">{synced ? `ดึงล่าสุด ${synced}` : 'ยังไม่เคยดึงข้อมูล'}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {group.isSample ? (
          <span className="text-xs text-muted">กลุ่มตัวอย่าง ไม่มีบน Facebook</span>
        ) : (
          <a
            href={chronologicalGroupUrl(group.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink hover:brightness-110"
          >
            เปิดกลุ่มเพื่อดึงข้อมูล
            <ExternalIcon width={14} height={14} />
            <span className="sr-only">(เปิดแท็บใหม่)</span>
          </a>
        )}
        {group.listingCount > 0 && (
          <Link
            to={`/?g=${encodeURIComponent(group.id)}`}
            className="inline-flex h-9 items-center rounded-full border border-line px-4 text-sm font-semibold hover:bg-sunken"
          >
            ดูสินค้า
          </Link>
        )}
        <button
          type="button"
          onClick={() => onDelete(group)}
          aria-label={`ลบกลุ่ม ${group.name}`}
          title="ลบกลุ่ม"
          className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink"
        >
          <TrashIcon width={17} height={17} />
        </button>
      </div>
    </li>
  );
}
