import type { IsoDate, Task } from '@homely/shared';
import { fromDbDate } from '../../lib/dates.ts';
import type { TaskRow } from './tasks.repository.ts';

/** `today` es el día actual en la zona del hogar; define si una pendiente está vencida. */
export function toTask(row: TaskRow, today: IsoDate): Task {
  const dueDate = fromDbDate(row.dueDate);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    origin: row.origin,
    planId: row.planId,
    dueDate,
    assignee: row.assignee,
    completedBy: row.completedBy,
    completedAt: row.completedAt?.toISOString() ?? null,
    isOverdue: row.status === 'PENDING' && dueDate < today,
    createdAt: row.createdAt.toISOString(),
  };
}
