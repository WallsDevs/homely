import {
  CalendarSync,
  ChartColumn,
  CircleCheckBig,
  House,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = { to: string; label: string; icon: LucideIcon };

/** Destinos principales: barra inferior en móvil, primeros ítems del sidebar. */
export const primaryNav: NavItem[] = [
  { to: '/', label: 'Inicio', icon: House },
  { to: '/tasks', label: 'Tareas', icon: CircleCheckBig },
  { to: '/expenses', label: 'Gastos', icon: Wallet },
  { to: '/reports', label: 'Reportes', icon: ChartColumn },
];

/** Destinos secundarios: en móvil viven dentro de "Más". */
export const secondaryNav: NavItem[] = [
  { to: '/plans', label: 'Planes', icon: CalendarSync },
  { to: '/members', label: 'Miembros', icon: Users },
  { to: '/settings', label: 'Ajustes', icon: Settings },
];
