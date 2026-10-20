import type { Task } from '@homely/shared';
import { Ban, Check, Pencil, Repeat, RotateCcw, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { errorMessage } from '@/shared/lib/api-client.ts';
import { dayHeading } from '@/shared/lib/format-date.ts';
import { Avatar, Badge, Button, Sheet, useToast, type BadgeTone } from '@/shared/ui/index.ts';
import { useDeleteTask, useSkipTask } from '../api/tasks.ts';
import { useTaskUI } from './task-ui.ts';

type TaskDetailSheetProps = { task: Task | null; onClose: () => void };

const priorityLabel = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta' } as const;

export function TaskDetailSheet({ task, onClose }: TaskDetailSheetProps) {
  return (
    <Sheet open={task !== null} onClose={onClose} title={task?.title ?? ''}>
      {task && <TaskDetail key={task.id} task={task} onClose={onClose} />}
    </Sheet>
  );
}

function statusBadge(task: Task): { label: string; tone: BadgeTone } {
  if (task.status === 'DONE') return { label: 'Hecha', tone: 'success' };
  if (task.status === 'SKIPPED') return { label: 'Omitida', tone: 'neutral' };
  if (task.isOverdue) return { label: 'Vencida', tone: 'danger' };
  return { label: 'Pendiente', tone: 'accent' };
}

function TaskDetail({ task, onClose }: { task: Task; onClose: () => void }) {
  const { today, isAdmin, canResolve, toggle, openEdit } = useTaskUI();
  const skip = useSkipTask();
  const remove = useDeleteTask();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const badge = statusBadge(task);
  const onError = (error: unknown) => toast.show({ message: errorMessage(error), tone: 'danger' });

  return (
    <div className="flex flex-col gap-5 pb-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={badge.tone}>{badge.label}</Badge>
        {task.priority === 'HIGH' && <Badge tone="warning">Prioridad alta</Badge>}
        {task.origin === 'PLAN' && (
          <Badge>
            <Repeat className="size-3" aria-hidden /> Plan
          </Badge>
        )}
      </div>

      <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-3 text-body">
        <dt className="text-fg-3">Responsable</dt>
        <dd className="flex items-center gap-2">
          {task.assignee ? (
            <>
              <Avatar name={task.assignee.displayName} color={task.assignee.color} size={24} />
              {task.assignee.displayName}
            </>
          ) : (
            <span className="text-fg-2">Sin asignar</span>
          )}
        </dd>
        <dt className="text-fg-3">Fecha</dt>
        <dd className={task.isOverdue ? 'text-danger' : undefined}>
          {dayHeading(task.dueDate, today)}
        </dd>
        <dt className="text-fg-3">Prioridad</dt>
        <dd>{priorityLabel[task.priority]}</dd>
        {task.completedBy && task.completedAt && (
          <>
            <dt className="text-fg-3">Completada</dt>
            <dd>
              por {task.completedBy.displayName},{' '}
              {new Date(task.completedAt).toLocaleString('es', {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </dd>
          </>
        )}
      </dl>

      {task.description && (
        <p className="rounded-md bg-surface-2 px-3 py-2.5 text-body whitespace-pre-line text-fg-2">
          {task.description}
        </p>
      )}

      {canResolve(task) && task.status !== 'SKIPPED' && (
        <Button
          size="lg"
          fullWidth
          variant={task.status === 'DONE' ? 'secondary' : 'primary'}
          icon={
            task.status === 'DONE' ? <RotateCcw className="size-4" /> : <Check className="size-4" />
          }
          onClick={() => {
            toggle(task);
            onClose();
          }}
        >
          {task.status === 'DONE' ? 'Marcar como pendiente' : 'Marcar como hecha'}
        </Button>
      )}

      {isAdmin && (
        <div className="-mx-2 flex flex-col border-t border-line pt-2">
          <Action icon={<Pencil />} label="Editar" onClick={() => openEdit(task)} />
          {task.status !== 'SKIPPED' && (
            <Action
              icon={<Ban />}
              label="Omitir esta vez"
              hint="No cuenta como incumplida en los reportes"
              onClick={() =>
                skip.mutate(task.id, {
                  onSuccess: () => {
                    onClose();
                    toast.show({ message: 'Tarea omitida' });
                  },
                  onError,
                })
              }
            />
          )}
          <Action
            icon={<Trash2 />}
            label={confirmDelete ? 'Toca de nuevo para eliminar' : 'Eliminar'}
            danger
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              remove.mutate(task.id, {
                onSuccess: () => {
                  onClose();
                  toast.show({ message: 'Tarea eliminada' });
                },
                onError,
              });
            }}
          />
        </div>
      )}
    </div>
  );
}

function Action({
  icon,
  label,
  hint,
  danger = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 items-center gap-3 rounded-md px-2 py-2 text-left transition-colors active:bg-surface-2 hover-pointer:bg-surface-2"
    >
      <span className={danger ? 'text-danger [&>svg]:size-5' : 'text-fg-2 [&>svg]:size-5'}>
        {icon}
      </span>
      <span>
        <span className={danger ? 'block font-medium text-danger' : 'block font-medium'}>
          {label}
        </span>
        {hint && <span className="block text-small text-fg-3">{hint}</span>}
      </span>
    </button>
  );
}
