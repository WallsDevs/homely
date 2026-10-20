import { Plus } from 'lucide-react';
import { NavLink } from 'react-router';
import { cn } from '@/shared/lib/cn.ts';
import { Button } from '@/shared/ui/index.ts';
import { primaryNav, secondaryNav, type NavItem } from './nav-items.ts';
import { ThemeSwitcher } from './theme-switcher.tsx';

type SidebarProps = { onQuickAction: () => void };

/** Tablet (md): columna de iconos de 64 px. Escritorio (lg): 240 px con texto y acciones rápidas. */
export function Sidebar({ onQuickAction }: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-16 shrink-0 flex-col border-r border-line bg-surface md:flex lg:w-60">
      <div className="flex h-16 items-center gap-2.5 px-4 lg:px-5">
        <img src="/favicon.svg" alt="" className="size-8" />
        <span className="hidden text-h2 lg:inline">Homely</span>
      </div>

      <div className="hidden px-3 pb-2 lg:block">
        <Button fullWidth icon={<Plus className="size-4" />} onClick={onQuickAction}>
          Crear
        </Button>
      </div>

      <nav aria-label="Principal" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
        <NavGroup items={primaryNav} />
        <NavGroup items={secondaryNav} />
      </nav>

      <div className="border-t border-line p-3">
        <ThemeSwitcher compact />
      </div>
    </aside>
  );
}

function NavGroup({ items }: { items: NavItem[] }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={to === '/'}
            title={label}
            className={({ isActive }) =>
              cn(
                'flex h-10 items-center justify-center gap-3 rounded-md px-3 text-body transition-colors lg:justify-start',
                isActive
                  ? 'bg-surface-2 font-medium text-fg'
                  : 'text-fg-2 hover-pointer:bg-surface-2 hover-pointer:text-fg',
              )
            }
          >
            <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="sr-only lg:not-sr-only">{label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
