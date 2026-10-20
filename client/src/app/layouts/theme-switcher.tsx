import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '@/shared/lib/theme.tsx';
import { IconButton, SegmentedControl, type SegmentOption } from '@/shared/ui/index.ts';

const options: SegmentOption<ThemePreference>[] = [
  { value: 'light', label: 'Claro', icon: <Sun /> },
  { value: 'dark', label: 'Oscuro', icon: <Moon /> },
  { value: 'system', label: 'Sistema', icon: <Monitor /> },
];

/** Selector de tema con etiquetas (Ajustes, "Más") o solo iconos (sidebar de escritorio). */
export function ThemeSwitcher({ iconsOnly = false }: { iconsOnly?: boolean }) {
  const { preference, setPreference } = useTheme();
  return (
    <SegmentedControl
      label="Tema"
      options={options}
      value={preference}
      onChange={setPreference}
      iconsOnly={iconsOnly}
    />
  );
}

const order: ThemePreference[] = ['light', 'dark', 'system'];

/** Un solo botón que rota entre temas, para el sidebar estrecho de tablet. */
export function ThemeCycleButton() {
  const { preference, setPreference } = useTheme();
  const current = options.find((option) => option.value === preference) ?? options[2];
  const next = order[(order.indexOf(preference) + 1) % order.length] ?? 'system';

  return (
    <IconButton
      aria-label={`Tema: ${current?.label ?? ''}. Cambiar`}
      title={`Tema: ${current?.label ?? ''}`}
      icon={<span className="[&>svg]:size-5">{current?.icon}</span>}
      onClick={() => setPreference(next)}
    />
  );
}
