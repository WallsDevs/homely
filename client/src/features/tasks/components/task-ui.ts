import type { IsoDate, Task, TaskMember } from '@homely/shared';
import { createContext, use } from 'react';

export type TaskFormDefaults = { assigneeId?: string | null; dueDate?: IsoDate };

export type TaskUI = {
  /** Hoy en la zona horaria del hogar. */
  today: IsoDate;
  me: TaskMember;
  isAdmin: boolean;
  /** TK-03/TK-04: el asignado o un admin. */
  canResolve: (task: Task) => boolean;
  toggle: (task: Task) => void;
  openDetail: (task: Task) => void;
  openCreate: (defaults?: TaskFormDefaults) => void;
  openEdit: (task: Task) => void;
};

export const TaskUIContext = createContext<TaskUI | null>(null);

export function useTaskUI(): TaskUI {
  const context = use(TaskUIContext);
  if (!context) throw new Error('useTaskUI debe usarse dentro de <TaskUIProvider>');
  return context;
}
