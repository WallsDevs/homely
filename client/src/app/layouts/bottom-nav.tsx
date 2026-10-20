import { Ellipsis } from 'lucide-react';
import { NavLink } from 'react-router';
import { cn } from '@/shared/lib/cn.ts';
import { primaryNav, type NavItem } from './nav-items.ts';

const items: NavItem[] = [...primaryNav, { to: '/more', label: 'Más', icon: Ellipsis }];

/** Navegación principal en móvil (< md). Fija abajo, respetando la safe area de iOS. */
export function BottomNav() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-safe backdrop-blur-md md:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                  isActive ? 'text-fg' : 'text-fg-3',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="size-6" strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
