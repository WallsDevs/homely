import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { secondaryNav } from '@/app/layouts/nav-items.ts';
import { ThemeSwitcher } from '@/app/layouts/theme-switcher.tsx';
import { Card, PageHeader } from '@/shared/ui/index.ts';

/** "Más" en móvil: destinos secundarios y preferencias. */
export function MorePage() {
  return (
    <>
      <PageHeader title="Más" />
      <div className="flex flex-col gap-4">
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
