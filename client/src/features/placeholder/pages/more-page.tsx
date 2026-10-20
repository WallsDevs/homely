import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { secondaryNav } from '@/app/layouts/nav-items.ts';
import { ThemeSwitcher } from '@/app/layouts/theme-switcher.tsx';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import { Avatar, Badge, Card, PageHeader } from '@/shared/ui/index.ts';

/** "Más" en móvil: perfil, destinos secundarios y preferencias. */
export function MorePage() {
  const { membership, household, isAdmin } = useHouseholdSession();

  return (
    <>
      <PageHeader title="Más" />
      <div className="flex flex-col gap-4">
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-md border border-line bg-surface p-4 active:bg-surface-2"
        >
          <Avatar name={membership.displayName} color={membership.color} size={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{membership.displayName}</span>
            <span className="block truncate text-small text-fg-3">{household.name}</span>
          </span>
          {isAdmin && <Badge tone="accent">Admin</Badge>}
          <ChevronRight className="size-4 text-fg-3" aria-hidden />
        </Link>

        <Card className="p-0 md:p-0">
          <ul className="divide-y divide-line">
            {secondaryNav.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link to={to} className="flex h-14 items-center gap-3 px-4 active:bg-surface-2">
                  <Icon className="size-5 text-fg-2" strokeWidth={1.75} aria-hidden />
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="size-4 text-fg-3" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 text-caption text-fg-3 uppercase">Apariencia</h2>
          <ThemeSwitcher />
        </Card>
      </div>
    </>
  );
}
