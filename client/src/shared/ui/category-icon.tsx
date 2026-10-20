import type { CategoryIcon as CategoryIconName } from '@homely/shared';
import { CATEGORY_ICON_COMPONENTS } from '../lib/category-icons.ts';
import { cn } from '../lib/cn.ts';

type CategoryIconProps = {
  icon: CategoryIconName;
  color: string;
  size?: 'sm' | 'md';
  className?: string;
};

/** Icono de la categoría sobre un círculo suave de su color (decorativo: el nombre va al lado). */
export function CategoryIcon({ icon, color, size = 'md', className }: CategoryIconProps) {
  const Icon = CATEGORY_ICON_COMPONENTS[icon];
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        size === 'md' ? 'size-10' : 'size-7',
        className,
      )}
      // Color de la categoría al 12 % de opacidad como fondo; el trazo en el color pleno.
      style={{ backgroundColor: `${color}1f`, color }}
    >
      <Icon className={size === 'md' ? 'size-5' : 'size-4'} strokeWidth={1.75} />
    </span>
  );
}
