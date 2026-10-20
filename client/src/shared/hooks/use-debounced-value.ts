import { useEffect, useState } from 'react';

/** Devuelve `value` cuando deja de cambiar durante `delay` ms (búsquedas mientras se escribe). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
