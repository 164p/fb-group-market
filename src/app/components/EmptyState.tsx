import type { ReactNode } from 'react';
import { InboxIcon } from './Icons';

export default function EmptyState({
  title,
  body,
  icon,
  children,
}: {
  title: string;
  body?: string;
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-sunken text-muted">
        {icon ?? <InboxIcon width={24} height={24} />}
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      {body && <p className="mt-1 max-w-md text-muted thai-wrap">{body}</p>}
      {children && <div className="mt-6 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
