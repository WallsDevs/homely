import { addDays, startOfWeek, todayIn, type AuditEntry, type PurgePreview } from '@homely/shared';
import { ArrowLeft, History, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import { useMoney } from '@/features/expenses/lib/use-money.ts';
import { useAuditLog, usePurge, usePurgePreview } from '@/features/reports/api/reports.ts';
import { errorMessage } from '@/shared/lib/api-client.ts';
import { dueLabel } from '@/shared/lib/format-date.ts';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  FormAlert,
  Input,
  PageHeader,
  Sheet,
  Skeleton,
  useToast,
} from '@/shared/ui/index.ts';

/** RP-12 … RP-15: borrar tareas y gastos de un rango ya cerrado, con vista previa y auditoría. */
export function DataPage() {
  return (
    <>
      <div className="mb-2">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1 text-small text-fg-2 hover-pointer:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden /> Ajustes
        </Link>
      </div>
      <PageHeader title="Datos del hogar" />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <PurgeCard />
        <AuditCard />
      </div>
    </>
  );
}

function PurgeCard() {
  const { household } = useHouseholdSession();
  const money = useMoney();
  const toast = useToast();
  const preview = usePurgePreview();
  const purge = usePurge();
  const today = todayIn(household.timezone);
  // RP-14: solo semanas cerradas.
  const lastAllowed = addDays(startOfWeek(today, household.weekStartsOn), -1);
  const lastYear = String(Number(today.slice(0, 4)) - 1);

  const [from, setFrom] = useState(`${lastYear}-01-01`);
  const [to, setTo] = useState(
    `${lastYear}-12-31` < lastAllowed ? `${lastYear}-12-31` : lastAllowed,
  );
  const [result, setResult] = useState<PurgePreview | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  const rangeError = from > to ? 'La fecha inicial debe ser anterior a la final' : undefined;
  const reset = () => {
    setResult(null);
    preview.reset();
  };

  const review = () => preview.mutate({ from, to }, { onSuccess: setResult });

  const confirm = () =>
    purge.mutate(
      { from, to, confirmation },
      {
        onSuccess: (deleted) => {
          setConfirmOpen(false);
          setConfirmation('');
          reset();
          toast.show({
            message: `Se borraron ${deleted.tasks} tareas y ${deleted.expenses} gastos`,
            tone: 'success',
          });
        },
      },
    );

  const nothingToDelete = result !== null && result.tasks === 0 && result.expenses === 0;

  return (
    <Card>
      <CardHeader
        title="Vaciar datos antiguos"
        subtitle="Borra tareas y gastos de un rango de fechas. Planes, categorías, metas y miembros no se tocan."
      />
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Desde"
            type="date"
            value={from}
            max={lastAllowed}
            onChange={(event) => {
              setFrom(event.target.value);
              reset();
            }}
          />
          <Input
            label="Hasta"
            type="date"
            value={to}
            max={lastAllowed}
            error={rangeError}
            onChange={(event) => {
              setTo(event.target.value);
              reset();
            }}
          />
        </div>
        <p className="text-small text-fg-3">
          Solo semanas ya terminadas: como mucho hasta el{' '}
          {dueLabel(lastAllowed, today).toLowerCase()} ({lastAllowed}).
        </p>

        <FormAlert message={preview.error ? errorMessage(preview.error) : null} />

        {result === null ? (
          <Button
            variant="secondary"
            onClick={review}
            loading={preview.isPending}
            disabled={Boolean(rangeError) || !from || !to}
          >
            Revisar qué se borrará
          </Button>
        ) : nothingToDelete ? (
          <p className="rounded-md bg-surface-2 px-3 py-2.5 text-body text-fg-2">
            No hay tareas ni gastos en ese rango.
          </p>
        ) : (
          <div className="flex flex-col gap-3 rounded-md border border-danger/30 bg-danger-soft p-4">
            <p className="text-body text-danger">
              Se borrarán <strong>{result.tasks}</strong> {result.tasks === 1 ? 'tarea' : 'tareas'}{' '}
              y <strong>{result.expenses}</strong> {result.expenses === 1 ? 'gasto' : 'gastos'} (
              {money.format(result.amount)}). No se puede deshacer.
            </p>
            <Button
              variant="danger"
              icon={<Trash2 className="size-4" />}
              onClick={() => setConfirmOpen(true)}
            >
              Borrar estos datos
            </Button>
          </div>
        )}
      </div>

      <Sheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar borrado"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={purge.isPending}
              disabled={confirmation.trim().length === 0}
              onClick={confirm}
            >
              Borrar definitivamente
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 pb-2">
          <p className="text-body text-fg-2">
            Del {from} al {to}. Para confirmar, escribe el nombre del hogar:{' '}
            <strong className="text-fg">{household.name}</strong>
          </p>
          <FormAlert message={purge.error ? errorMessage(purge.error) : null} />
          <Input
            label="Nombre del hogar"
            autoComplete="off"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </div>
      </Sheet>
    </Card>
  );
}

const actionLabels: Record<string, string> = {
  MEMBER_ROLE_CHANGED: 'Cambió el rol de un miembro',
  MEMBER_DEACTIVATED: 'Desactivó a un miembro',
  MEMBER_REACTIVATED: 'Reactivó a un miembro',
  MEMBER_LEFT: 'Salió del hogar',
  MEMBER_JOINED: 'Se unió al hogar',
  INVITATION_CREATED: 'Creó un código de invitación',
  INVITATION_REVOKED: 'Revocó un código de invitación',
  HOUSEHOLD_UPDATED: 'Editó los datos del hogar',
};

function describe(entry: AuditEntry): string {
  if (entry.action === 'DATA_PURGE') {
    const { from, to, tasks, expenses } = entry.metadata;
    return `Borró datos del ${String(from)} al ${String(to)} (${String(tasks)} tareas, ${String(expenses)} gastos)`;
  }
  return actionLabels[entry.action] ?? entry.action;
}

/** RP-15: quién hizo qué en el hogar. */
function AuditCard() {
  const log = useAuditLog();
  const entries = log.data?.pages.flatMap((page) => page.items);

  return (
    <Card>
      <CardHeader title="Actividad del hogar" subtitle="Cambios importantes, del más reciente" />
      {!entries ? (
        <Skeleton className="h-40" />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<History />}
          title="Sin actividad"
          description="Aquí aparecerán los cambios de roles, invitaciones y limpiezas de datos."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {entries.map((entry) => (
            <li key={entry.id} className="py-2.5">
              <p className="text-body">{describe(entry)}</p>
              <p className="text-small text-fg-3">
                {entry.actor?.displayName ?? 'Alguien'} ·{' '}
                {new Date(entry.createdAt).toLocaleString('es', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
      {log.hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2"
          loading={log.isFetchingNextPage}
          onClick={() => void log.fetchNextPage()}
        >
          Ver más
        </Button>
      )}
    </Card>
  );
}
