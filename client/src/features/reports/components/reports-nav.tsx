import { NavLink } from 'react-router';
import { cn } from '@/shared/lib/cn.ts';

const links = [
  { to: '/reports', label: 'Semana' },
  { to: '/reports/history', label: 'Historial' },
];

export function ReportsNav() {
  return (
    <nav aria-label="Secciones de reportes" className="mb-5 flex gap-1 border-b border-line">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end
          className={({ isActive }) =>
            cn(
              '-mb-px border-b-2 px-3 py-2.5 text-body transition-colors',
              isActive
                ? 'border-accent font-medium text-fg'
                : 'border-transparent text-fg-3 hover-pointer:text-fg',
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
