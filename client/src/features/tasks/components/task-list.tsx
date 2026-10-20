import type { Task } from '@homely/shared';
import type { ReactNode } from 'react';
import { dayHeading } from '@/shared/lib/format-date.ts';
import { Card, Skeleton } from '@/shared/ui/index.ts';
import { TaskItem } from './task-item.tsx';
import { useTaskUI } from './task-ui.ts';

type TaskListProps = {
  tasks: Task[] | undefined;
  empty: ReactNode;
  /** Agrupa por día con un encabezado («Hoy», «Jueves 23»). */
  groupByDay?: boolean;
  showAssignee?: boolean;
};

export function TaskList({ tasks, empty, groupByDay = false, showAssignee = true }: TaskListProps) {
  const { today } = useTaskUI();

  if (!tasks) return <TaskListSkeleton />;
  if (tasks.length === 0) return <Card>{empty}</Card>;

  if (!groupByDay) {
    return (
      <Card className="p-0 md:p-0">
        <ul className="divide-y divide-line py-1">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} showAssignee={showAssignee} />
          ))}
        </ul>
      </Card>
    );
  }

  const days = new Map<string, Task[]>();
  for (const task of tasks) days.set(task.dueDate, [...(days.get(task.dueDate) ?? []), task]);
  return (
    <div className="flex flex-col gap-5">
      {[...days].map(([day, items]) => (
        <section key={day}>
          <h2 className="mb-2 px-1 text-caption text-fg-3 uppercase">{dayHeading(day, today)}</h2>
          <Card className="p-0 md:p-0">
            <ul className="divide-y divide-line py-1">
              {items.map((task) => (
                <TaskItem key={task.id} task={task} showAssignee={showAssignee} showDue={false} />
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}

export function TaskListSkeleton() {
  return (
    <Card className="flex flex-col gap-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-7 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </Card>
  );
}
