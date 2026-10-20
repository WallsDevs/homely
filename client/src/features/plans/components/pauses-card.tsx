import { addDays, type Pause } from '@homely/shared';
import { CircleStop, Pencil, PlaneTakeoff, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import { useTaskUI } from '@/features/tasks/components/task-ui.ts';
import { errorMessage } from '@/shared/lib/api-client.ts';
import { dueLabel, weekRangeLabel } from '@/shared/lib/format-date.ts';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  IconButton,
  Skeleton,
  useToast,
} from '@/shared/ui/index.ts';
import { pauseScopeLabel, useDeletePause, usePauses, useUpdatePause } from '../api/pauses.ts';
import { PauseFormSheet } from './pause-form-sheet.tsx';

type FormState = { open: false } | { open: true; pause?: Pause };

/** PL-09: pausas activas y programadas, con alta y acciones para admins. */
export function PausesCard() {
  const { isAdmin } = useHouseholdSession();
  const pauses = usePauses();
  const [form, setForm] = useState<FormState>({ open: false });
  const items = pauses.data ?? [];

  return (
    <Card>
      <CardHeader
        title="Pausas"
        subtitle="Vacaciones o días fuera: los planes no generan tareas"
        action={
          isAdmin ? (
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus className="size-4" />}
              onClick={() => setForm({ open: true })}
            >
              Pausar
            </Button>
          ) : undefined
        }
      />

      {pauses.isPending ? (
        <Skeleton className="h-12" />
      ) : items.length === 0 ? (
        <p className="flex items-center gap-2 text-small text-fg-3">
          <PlaneTakeoff className="size-4" aria-hidden /> Sin pausas programadas.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {items.map((pause) => (
            <PauseRow
              key={pause.id}
              pause={pause}
              canEdit={isAdmin}
              onEdit={() => setForm({ open: true, pause })}
            />
          ))}
        </ul>
      )}

      {isAdmin && (
        <PauseFormSheet
          open={form.open}
          pause={form.open ? form.pause : undefined}
          onClose={() => setForm({ open: false })}
        />
      )}
    </Card>
  );
}

function PauseRow({
  pause,
  canEdit,
  onEdit,
}: {
  pause: Pause;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const { today } = useTaskUI();
  const update = useUpdatePause();
  const remove = useDeletePause();
  const toast = useToast();
  const onError = (error: unknown) => toast.show({ message: errorMessage(error), tone: 'danger' });
  const active = pause.status === 'ACTIVE';

  /** Terminar hoy: si empezó antes de hoy, acaba ayer; si empieza hoy o después, se elimina. */
  const endNow = () => {
    if (pause.startsOn < today) {
      update.mutate(
        { id: pause.id, input: { endsOn: addDays(today, -1) } },
        {
          onSuccess: () => toast.show({ message: 'Pausa terminada: los planes vuelven mañana' }),
          onError,
        },
      );
    } else {
      remove.mutate(pause.id, {
        onSuccess: () => toast.show({ message: 'Pausa eliminada' }),
        onError,
      });
    }
  };

  return (
    // Móvil: dos líneas (quién/cuándo arriba, estado y acciones abajo). Escritorio: una fila.
    <li className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {pause.scope === 'MEMBER' && pause.member ? (
          <Avatar name={pause.member.displayName} color={pause.member.color} size={32} />
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-info-soft text-info">
            <PlaneTakeoff className="size-4" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {pauseScopeLabel(pause)}
            {pause.reason && <span className="font-normal text-fg-3"> · {pause.reason}</span>}
          </p>
          <p className="text-small text-fg-3">
            {weekRangeLabel(pause.startsOn, pause.endsOn)}
            {!active && ` · empieza ${dueLabel(pause.startsOn, today).toLowerCase()}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 pl-11 md:pl-0">
        <Badge tone={active ? 'info' : 'neutral'}>{active ? 'En curso' : 'Programada'}</Badge>
        {canEdit && (
          <>
            <IconButton
              size="sm"
              aria-label="Editar pausa"
              icon={<Pencil className="size-4" />}
              onClick={onEdit}
            />
            <IconButton
              size="sm"
              aria-label={active ? 'Terminar pausa hoy' : 'Eliminar pausa'}
              icon={active ? <CircleStop className="size-4" /> : <Trash2 className="size-4" />}
              disabled={update.isPending || remove.isPending}
              onClick={endNow}
            />
          </>
        )}
      </div>
    </li>
  );
}
