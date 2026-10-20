/** Categorías que se siembran al crear un hogar (EX-04). `icon` es un nombre de lucide. */
export const DEFAULT_CATEGORIES = [
  { name: 'Comida', color: '#7D9B5B', icon: 'shopping-cart' },
  { name: 'Comida fuera', color: '#E07A5F', icon: 'utensils' },
  { name: 'Transporte', color: '#5B8DEF', icon: 'fuel' },
  { name: 'Limpieza', color: '#4FA3A5', icon: 'spray-can' },
  { name: 'Mascotas', color: '#D4A942', icon: 'paw-print' },
  { name: 'Servicios', color: '#8E7CC3', icon: 'plug' },
  { name: 'Salud', color: '#C86B9B', icon: 'heart-pulse' },
  { name: 'Ocio', color: '#A47A5A', icon: 'popcorn' },
  { name: 'Otros', color: '#8A8A85', icon: 'ellipsis' },
] as const;
