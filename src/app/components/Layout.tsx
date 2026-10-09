import { NavLink, Outlet } from 'react-router-dom';
import { th } from '../i18n/th';
import { ROUTES } from '../routes';
import ThemeToggle from './ThemeToggle';
import { BookIcon, BookmarkIcon, GearIcon, TagIcon, UsersIcon } from './Icons';

const NAV = [
  { to: ROUTES.listings, label: th.nav.listings, Icon: TagIcon, end: true },
  { to: ROUTES.groups, label: th.nav.groups, Icon: UsersIcon, end: false },
  { to: ROUTES.setup, label: th.nav.setup, Icon: BookmarkIcon, end: false },
  { to: ROUTES.guide, label: th.nav.guide, Icon: BookIcon, end: false },
  { to: ROUTES.settings, label: th.nav.settings, Icon: GearIcon, end: false },
];

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[9px] bg-accent text-tag"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <TagIcon width={size * 0.56} height={size * 0.56} strokeWidth={2} />
    </span>
  );
}

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <NavLink to={ROUTES.listings} className="flex items-center gap-2.5">
            <BrandMark />
            <span className="leading-tight">
              <span className="block text-[17px] font-bold tracking-tight">{th.app.name}</span>
              <span className="hidden text-xs text-muted sm:block">{th.app.tagline}</span>
            </span>
          </NavLink>

          <nav aria-label="เมนูหลัก" className="ml-auto hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV.map(({ to, label, Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        isActive ? 'bg-ink text-paper' : 'text-muted hover:bg-sunken hover:text-ink'
                      }`
                    }
                  >
                    <Icon width={16} height={16} />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto md:ml-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:pb-12">
        <Outlet />
      </main>

      <footer className="hidden border-t border-line py-5 text-center text-xs text-muted md:block">
        {th.app.disclaimer}
      </footer>

      {/* แถบเมนูล่างสำหรับมือถือ */}
      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {NAV.map(({ to, label, Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                    isActive ? 'text-accent' : 'text-muted'
                  }`
                }
              >
                <Icon width={20} height={20} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
