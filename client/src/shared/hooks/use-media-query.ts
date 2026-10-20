import { useSyncExternalStore } from 'react';

/** Suscripción a una media query. Para layout se prefieren las clases responsive de Tailwind;
 *  esto es solo para cuando cambia el comportamiento (p. ej. BottomSheet vs Dialog). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Breakpoints de docs/06-diseno-ui.md. */
export const useIsDesktop = () => useMediaQuery('(min-width: 64rem)');
export const useIsMobile = () => !useMediaQuery('(min-width: 48rem)');
