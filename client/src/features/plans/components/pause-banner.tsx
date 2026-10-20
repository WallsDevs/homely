import { ChevronRight, PlaneTakeoff } from 'lucide-react';
import { Link } from 'react-router';
import { useTaskUI } from '@/features/tasks/components/task-ui.ts';
import { dueLabel } from '@/shared/lib/format-date.ts';
import { pauseScopeLabel, usePauses } from '../api/pauses.ts';

/** PL-12: aviso discreto en el Inicio mientras hay una pausa en curso. */
export function ActivePauseBanner() {
  const { today } = useTaskUI();
  const pauses = usePauses();
  const active = pauses.data?.filter((pause) => pause.status === 'ACTIVE') ?? [];
  if (active.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {active.map((pause) => {
        const until = dueLabel(pause.endsOn, today).toLowerCase();
        const text =
          pause.scope === 'HOUSEHOLD'
            ? `Planes en pausa hasta ${until}`
            : pause.scope === 'MEMBER'
              ? `Los planes de ${pauseScopeLabel(pause)} están en pausa hasta ${until}`
              : `«${pauseScopeLabel(pause)}» en pausa hasta ${until}`;
        return (
          <Link
            key={pause.id}
            to="/plans"
            className="flex items-center gap-3 rounded-md border border-info/30 bg-info-soft px-4 py-3 text-info"
          >
            <PlaneTakeoff className="size-5 shrink-0" aria-hidden />
            <span className="flex-1 text-body font-medium">
              {text}
              {pause.reason && <span className="font-normal"> · {pause.reason}</span>}
            </span>
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        );
      })}
    </div>
  );
}
