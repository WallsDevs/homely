import { clsx, type ClassValue } from 'clsx';

/** Une clases condicionales. Los componentes se diseñan sin conflictos de utilidades. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
