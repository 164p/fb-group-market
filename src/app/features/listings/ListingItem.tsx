import { memo } from 'react';
import type { Group, Listing } from '../../../shared/types';
import { EyeIcon, EyeOffIcon, ExternalIcon, StarIcon } from '../../components/Icons';
import { isSampleGroupId } from '../../db/sample';
import { relativeTime } from '../../lib/format';
import PriceTag from './PriceTag';

export interface ItemActions {
  onToggleFavorite: (l: Listing) => void;
  onToggleHidden: (l: Listing) => void;
}

interface Props extends ItemActions {
  listing: Listing;
  group?: Group;
  now: number;
}

/** ข้อความเนื้อหาโพสต์โดยตัดบรรทัดชื่อและบรรทัดราคาออก เหลือรายละเอียด */
function snippet(l: Listing): string {
  const norm = (s: string) => s.toLowerCase().replace(/#\S+/g, '').replace(/\s+/g, ' ').trim();
  const title = norm(l.title.replace(/…$/, ''));
  let titleDropped = false;
  return l.rawText
    .split('\n')
    .map((s) => s.trim())
    .filter((line) => {
      if (!line) return false;
      const n = norm(line);
      // บรรทัดแรกที่มีชื่อสินค้า (ชื่อถูกแยกจากบรรทัดนี้)
      if (!titleDropped && title && n.includes(title)) {
        titleDropped = true;
        // เก็บส่วนที่เหลือของบรรทัดถ้ายาวพอ เช่น "iPhone 13 ราคา 12,900 แบต 86%" → ตัดชื่อออก
        return false;
      }
      // บรรทัดที่มีแต่ราคา
      if (/^(ราคา|price|฿)/i.test(line) && line.length <= 24) return false;
      if (l.priceText && n === norm(l.priceText)) return false;
      return true;
    })
    .join(' ');
}

function PostLink({ listing, compact }: { listing: Listing; compact?: boolean }) {
  if (isSampleGroupId(listing.groupId)) {
    return (
      <span className="text-xs text-muted" title="สินค้าตัวอย่าง ไม่มีโพสต์จริงบน Facebook">
        โพสต์ตัวอย่าง
      </span>
    );
  }
  return (
    <a
      href={listing.postUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold text-accent hover:underline ${
        compact ? 'text-xs' : 'text-sm'
      }`}
    >
      ดูโพสต์บน Facebook
      <ExternalIcon width={14} height={14} />
      <span className="sr-only">(เปิดแท็บใหม่)</span>
    </a>
  );
}

function IconToggle({
  pressed,
  label,
  onClick,
  children,
}: {
  pressed: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink aria-pressed:text-ink"
    >
      {children}
    </button>
  );
}

function Actions({ listing, onToggleFavorite, onToggleHidden }: ItemActions & { listing: Listing }) {
  return (
    <div className="flex items-center">
      <IconToggle
        pressed={listing.favorite}
        label={listing.favorite ? 'เอาดาวออก' : 'ติดดาว'}
        onClick={() => onToggleFavorite(listing)}
      >
        <StarIcon width={17} height={17} filled={listing.favorite} className={listing.favorite ? 'text-warn' : ''} />
      </IconToggle>
      <IconToggle
        pressed={listing.hidden}
        label={listing.hidden ? 'เลิกซ่อน' : 'ซ่อนรายการนี้'}
        onClick={() => onToggleHidden(listing)}
      >
        {listing.hidden ? <EyeIcon width={17} height={17} /> : <EyeOffIcon width={17} height={17} />}
      </IconToggle>
    </div>
  );
}

function Meta({ listing, group, now }: { listing: Listing; group?: Group; now: number }) {
  const when = relativeTime(listing.postedAt, now);
  return (
    <p className="flex min-w-0 items-baseline gap-3 text-xs text-muted">
      {when && (
        <time dateTime={new Date(listing.postedAt!).toISOString()} className="shrink-0 font-medium text-ink">
          {when}
        </time>
      )}
      <span className="min-w-0 truncate" title={group?.name}>
        {group?.name ?? listing.groupId}
      </span>
    </p>
  );
}

export const ListingCard = memo(function ListingCard({ listing, group, now, ...actions }: Props) {
  const sold = listing.status === 'sold';
  const body = snippet(listing);
  return (
    <article
      className={`flex h-full flex-col rounded-xl border border-line bg-surface p-4 ${listing.hidden ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Meta listing={listing} group={group} now={now} />
        <div className="-mr-2 -mt-1.5 shrink-0">
          <Actions listing={listing} {...actions} />
        </div>
      </div>

      <h3 className="mt-1.5 line-clamp-2 text-[17px] font-semibold leading-snug thai-wrap">{listing.title}</h3>

      <div className="mt-3 flex items-center gap-2">
        <PriceTag listing={listing} />
        {sold && <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-paper">ขายแล้ว</span>}
      </div>

      {body && <p className="mt-3 line-clamp-2 text-sm text-muted thai-wrap">{body}</p>}

      <div className="mt-auto pt-4">
        <PostLink listing={listing} />
      </div>
    </article>
  );
});

export const ListingRow = memo(function ListingRow({ listing, group, now, ...actions }: Props) {
  const sold = listing.status === 'sold';
  return (
    <article
      className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-line px-1 py-3 sm:grid-cols-[1fr_auto_auto] ${
        listing.hidden ? 'opacity-60' : ''
      }`}
    >
      <div className="min-w-0">
        <h3 className="truncate font-semibold">
          {listing.title}
          {sold && <span className="ml-2 text-xs font-medium text-muted">ขายแล้ว</span>}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3">
          <Meta listing={listing} group={group} now={now} />
          <span className="sm:hidden">
            <PostLink listing={listing} compact />
          </span>
        </div>
      </div>
      <div className="row-span-2 sm:row-span-1">
        <PriceTag listing={listing} size="sm" />
      </div>
      <div className="hidden items-center gap-3 sm:flex">
        <PostLink listing={listing} compact />
        <Actions listing={listing} {...actions} />
      </div>
    </article>
  );
});
