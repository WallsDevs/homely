import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useMediaQuery } from '../hooks/use-media-query.ts';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'homely.theme';

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    document.documentElement.dataset['theme'] = resolved;
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Almacenamiento no disponible (modo privado): el tema vale para esta sesión.
    }
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext);
  if (!context) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return context;
}
