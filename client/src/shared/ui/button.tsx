import { LoaderCircle } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn.ts';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = ComponentProps<'button'> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
};

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover-pointer:brightness-110',
  secondary: 'border border-line bg-surface text-fg hover-pointer:bg-surface-2',
  ghost: 'text-fg-2 hover-pointer:bg-surface-2 hover-pointer:text-fg',
  danger: 'bg-danger text-canvas hover-pointer:brightness-110',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-small',
  md: 'h-10 gap-2 px-4 text-body',
  lg: 'h-12 gap-2 px-5 text-body',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap select-none',
        'transition-[background-color,color,filter,transform] duration-150 active:scale-[0.98]',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

type IconButtonProps = Omit<ComponentProps<'button'>, 'aria-label' | 'children'> & {
  'aria-label': string;
  icon: ReactNode;
  size?: 'sm' | 'md';
};

export function IconButton({
  icon,
  size = 'md',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md text-fg-2 transition-colors duration-150',
        'active:bg-surface-2 hover-pointer:bg-surface-2 hover-pointer:text-fg',
        'disabled:pointer-events-none disabled:opacity-50',
        size === 'md' ? 'size-10' : 'size-8',
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
