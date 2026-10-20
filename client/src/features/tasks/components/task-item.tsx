import type { Task } from '@homely/shared';
import { Repeat } from 'lucide-react';
import { cn } from '@/shared/lib/cn.ts';
import { dueLabel } from '@/shared/lib/format-date.ts';
import { Badge } from '@/shared/ui/index.ts';
import { TaskCheck } from './task-check.tsx';
import { useTaskUI } from './task-ui.ts';

type TaskItemProps = {
  task: Task;
  /** En el tablero la columna ya dice de quién es. */
  showAssignee?: boolean;
  showDue?: boolean;
};

export function TaskItem({ task, showAssignee = true, showDue = true }: TaskItemProps) {
  const { today, canResolve, toggle, openDetail } = useTaskUI();
  const done = task.status === 'DONE';
  const skipped = task.status === 'SKIPPED';
  const due = dueLabel(task.dueDate, today);

  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      {skipped ? (
        <span
          aria-hidden
          className="size-7 shrink-0 rounded-full border-2 border-dashed border-line"
        />
      ) : (
        <TaskCheck
          checked={done}
          disabled={!canResolve(task)}
          label={done ? `Marcar «${task.title}» como pendiente` : `Completar «${task.title}»`}
          onChange={() => toggle(task)}
        />
      )}

      <button
        type="button"
        onClick={() => openDetail(task)}
        className="flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left"
      >
        <span
          className={cn(
            'truncate font-medium transition-colors',
            (done || skipped) && 'text-fg-3 line-through',
          )}
        >
          {task.title}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-small text-fg-3">
          {showAssignee &&
            (task.assignee ? (
              <>
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: task.assignee.color }}
                />
                <span className="truncate">{task.assignee.displayName}</span>
              </>
            ) : (
              <span>Sin asignar</span>
            ))}
          {showAssignee && showDue && <span aria-hidden>·</span>}
          {showDue && (
            <span className={cn('shrink-0', task.isOverdue && 'font-medium text-danger')}>
              {task.isOverdue ? `Vencida · ${due}` : due}
            </span>
          )}
          {task.origin === 'PLAN' && (
            <Repeat className="size-3.5 shrink-0" aria-label="Viene de un plan" />
          )}
        </span>
      </button>

      {skipped && <Badge>Omitida</Badge>}
      {!skipped && !done && task.priority === 'HIGH' && <Badge tone="warning">Alta</Badge>}
    </li>
  );
}
