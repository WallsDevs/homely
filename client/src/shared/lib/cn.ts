import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/*
 * tailwind-merge resuelve conflictos: en `cn('p-4', 'p-0')` gana la última. Sin él, ambas clases
 * conviven y gana la que Tailwind genere después, que no siempre es la que se quiso.
 * Se le enseñan los tamaños de texto propios (globals.css) para que no los confunda con colores:
 * si no, `text-small text-fg-2` perdería una de las dos.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['display', 'h1', 'h2', 'body', 'small', 'caption'],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
