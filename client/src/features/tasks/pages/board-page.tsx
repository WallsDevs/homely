import type { BoardColumn, IsoDate } from '@homely/shared';
import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import {
  Avatar,
  Badge,
  Button,
  Card,
  IconButton,
  PageHeader,
  ProgressBar,
  Skeleton,
  WeekPicker,
} from '@/shared/ui/index.ts';
import { useBoard } from '../api/tasks.ts';
import { TaskItem } from '../components/task-item.tsx';
import { useTaskUI } from '../components/task-ui.ts';

/** TK-07: la semana del hogar por miembro. Carrusel en móvil, columnas en escritorio. */
export function BoardPage() {
  const { today, isAdmin, openCreate } = useTaskUI();
  const [week, setWeek] = useState<IsoDate | undefined>(undefined);
  const board = useBoard(week);

  return (
    <>
      <div className="mb-2">
        <Link
          to="/tasks"
          className="inline-flex items-center gap-1 text-small text-fg-2 hover-pointer:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden /> Tareas
        </Link>
      </div>
      <PageHeader
        title="Tablero"
        subtitle="Las tareas de todo el hogar, por persona"
        action={
          isAdmin ? (
            <Button icon={<Plus className="size-4" />} onClick={() => openCreate()}>
              Nueva tarea
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5">
        {board.data ? (
          <WeekPicker
            weekStart={board.data.weekStart}
            weekEnd={board.data.weekEnd}
            today={today}
            onChange={setWeek}
          />
        ) : (
          <Skeleton className="h-10 w-56" />
        )}
      </div>

      {board.isPending ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="hidden h-64 md:block" />
        </div>
      ) : (
        <div
          className={
            // Móvil: carrusel horizontal con snap, un miembro por pantalla.
            '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 ' +
            // Tablet y escritorio: rejilla, sin scroll horizontal.
            'md:mx-0 md:grid md:snap-none md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]'
          }
        >
          {board.data?.columns.map((column) => (
            <Column
              key={column.member?.id ?? 'unassigned'}
              column={column}
              onAdd={
                isAdmin && column.member?.isActive
                  ? () =>
                      openCreate({
                        assigneeId: column.member?.id ?? null,
                        dueDate: board.data.weekStart > today ? board.data.weekStart : today,
                      })
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

function Column({ column, onAdd }: { column: BoardColumn; onAdd: (() => void) | undefined }) {
  const { member } = column;
  const ratio = column.total === 0 ? 0 : column.done / column.total;

  return (
    <Card className="flex w-[85%] shrink-0 snap-center flex-col p-0 md:w-auto md:p-0">
      <header className="flex flex-col gap-2.5 border-b border-line px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          {member ? (
            <Avatar name={member.displayName} color={member.color} size={32} />
          ) : (
            <span className="size-8 rounded-full border-2 border-dashed border-line" />
          )}
          <h2 className="min-w-0 flex-1 truncate text-h2">
            {member?.displayName ?? 'Sin asignar'}
          </h2>
          {member && !member.isActive && <Badge>Inactivo</Badge>}
          <span className="text-small text-fg-2 tabular">
            {column.done}/{column.total}
          </span>
          {onAdd && (
            <IconButton
              size="sm"
              aria-label={`Nueva tarea para ${member?.displayName ?? 'nadie'}`}
              icon={<Plus className="size-4" />}
              onClick={onAdd}
            />
          )}
        </div>
        <ProgressBar
          value={ratio}
          tone={ratio === 1 && column.total > 0 ? 'success' : 'accent'}
          label={`Progreso de ${member?.displayName ?? 'tareas sin asignar'}`}
        />
      </header>
      {column.tasks.length === 0 ? (
        <p className="px-4 py-6 text-center text-small text-fg-3">Sin tareas esta semana</p>
      ) : (
        <ul className="divide-y divide-line py-1">
          {column.tasks.map((task) => (
            <TaskItem key={task.id} task={task} showAssignee={false} />
          ))}
        </ul>
      )}
    </Card>
  );
}
