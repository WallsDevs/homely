import { NavLink } from 'react-router';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import { cn } from '@/shared/lib/cn.ts';

/** Subsecciones de Gastos: movimientos, metas y (admins) categorías. */
export function ExpensesNav() {
  const { isAdmin } = useHouseholdSession();
  const links = [
    { to: '/expenses', label: 'Movimientos' },
    { to: '/expenses/goals', label: 'Metas' },
    ...(isAdmin ? [{ to: '/expenses/categories', label: 'Categorías' }] : []),
  ];

  return (
    <nav aria-label="Secciones de gastos" className="mb-5 flex gap-1 border-b border-line">
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
