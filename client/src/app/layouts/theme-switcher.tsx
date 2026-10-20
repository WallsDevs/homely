import { Monitor, Moon, Sun } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/shared/lib/cn.ts';
import { useTheme, type ThemePreference } from '@/shared/lib/theme.tsx';

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

/**
 * Selector segmentado de tema con radios nativos (teclado y lectores de pantalla gratis).
 * `compact` muestra solo la opción activa en el sidebar de tablet.
 */
export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  const name = useId();

  return (
    <fieldset
      className={cn(
        'grid grid-cols-3 gap-0.5 rounded-md bg-surface-2 p-0.5',
        compact && 'grid-cols-1 lg:grid-cols-3',
      )}
    >
      <legend className="sr-only">Tema</legend>
      {options.map(({ value, label, icon: Icon }) => {
        const selected = preference === value;
        return (
          <label
            key={value}
            title={label}
            className={cn(
              'flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[5px] text-small transition-colors',
              'has-focus-visible:ring-2 has-focus-visible:ring-accent',
              selected ? 'bg-surface text-fg shadow-sm' : 'text-fg-3 hover-pointer:text-fg',
              compact && !selected && 'hidden lg:flex',
            )}
          >
            <input
              type="radio"
              name={name}
              value={value}
              checked={selected}
              onChange={() => setPreference(value)}
              className="sr-only"
            />
            <Icon className="size-4" aria-hidden />
            <span className={cn(compact && 'sr-only lg:not-sr-only')}>{label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
