import { th } from '../i18n/th';
import { useTheme, type ThemeChoice } from '../hooks/useTheme';
import { MonitorIcon, MoonIcon, SunIcon } from './Icons';

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof SunIcon }[] = [
  { value: 'light', label: th.theme.light, Icon: SunIcon },
  { value: 'dark', label: th.theme.dark, Icon: MoonIcon },
  { value: 'system', label: th.theme.system, Icon: MonitorIcon },
];

export default function ThemeToggle() {
  const { choice, setChoice } = useTheme();
  return (
    <div role="radiogroup" aria-label={th.theme.label} className="flex rounded-full border border-line bg-surface p-0.5">
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = choice === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setChoice(value)}
            className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${
              active ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
            }`}
          >
            <Icon width={15} height={15} />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
