import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '../lib/cn.ts';

type StatTileProps = {
  label: string;
  value: string;
  /** Variación respecto al periodo anterior, ya formateada (p. ej. "+5 %"). */
  delta?: { text: string; direction: 'up' | 'down' | 'flat'; positiveIsGood?: boolean };
};

export function StatTile({ label, value, delta }: StatTileProps) {
  const good =
    delta &&
    delta.direction !== 'flat' &&
    (delta.direction === 'up') === (delta.positiveIsGood ?? true);
  const Icon =
    delta?.direction === 'up' ? ArrowUpRight : delta?.direction === 'down' ? ArrowDownRight : Minus;

  return (
    <div className="flex flex-col gap-1 rounded-md border border-line bg-surface p-4">
      <span className="text-caption text-fg-3 uppercase">{label}</span>
      <span className="text-h1 tabular">{value}</span>
      {delta && (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 text-small tabular',
            delta.direction === 'flat' ? 'text-fg-3' : good ? 'text-success' : 'text-danger',
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {delta.text}
        </span>
      )}
    </div>
  );
}
