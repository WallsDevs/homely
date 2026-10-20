import { cn } from '../lib/cn.ts';
import { initials } from '../lib/initials.ts';

type AvatarProps = {
  name: string;
  color: string;
  size?: 24 | 32 | 40;
  className?: string;
};

const sizes = { 24: 'size-6 text-[10px]', 32: 'size-8 text-caption', 40: 'size-10 text-small' };

export function Avatar({ name, color, size = 32, className }: AvatarProps) {
  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none',
        sizes[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      <span aria-hidden>{initials(name)}</span>
      <span className="sr-only">{name}</span>
    </span>
  );
}
