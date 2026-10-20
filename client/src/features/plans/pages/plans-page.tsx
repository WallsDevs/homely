import type { Plan } from '@homely/shared';
import { CalendarSync, Plus, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import { useTaskUI } from '@/features/tasks/components/task-ui.ts';
import { errorMessage } from '@/shared/lib/api-client.ts';
import { cn } from '@/shared/lib/cn.ts';
import { dueLabel } from '@/shared/lib/format-date.ts';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
  Switch,
  useToast,
  WeekdayChips,
} from '@/shared/ui/index.ts';
import { describeWeekdays } from '@/shared/lib/weekdays.ts';
import { usePlans, useSetPlanActive } from '../api/plans.ts';
import { PlanFormSheet } from '../components/plan-form-sheet.tsx';

type FormState = { open: false } | { open: true; plan?: Plan };

/** PL-07: lista de planes. Activos primero. Los admins crean, editan y pausan. */
export function PlansPage() {
  const { isAdmin } = useHouseholdSession();
  const plans = usePlans();
  const [form, setForm] = useState<FormState>({ open: false });

  const active = plans.data?.filter((plan) => plan.isActive) ?? [];
  const paused = plans.data?.filter((plan) => !plan.isActive) ?? [];
  const newPlanButton = (
    <Button icon={<Plus className="size-4" />} onClick={() => setForm({ open: true })}>
      Nuevo plan
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Planes"
        subtitle="Tareas que se asignan solas cada semana"
        action={isAdmin ? newPlanButton : undefined}
      />

      {plans.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : plans.data?.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarSync />}
            title="Aún no hay planes"
            description="Crea el primero, como «Sacar la basura los miércoles y sábados»: las tareas aparecerán solas cada semana."
            action={isAdmin ? newPlanButton : undefined}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <PlanGroup plans={active} onEdit={(plan) => setForm({ open: true, plan })} />
          {paused.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-caption text-fg-3 uppercase">En pausa</h2>
              <PlanGroup plans={paused} onEdit={(plan) => setForm({ open: true, plan })} />
            </section>
          )}
          {isAdmin && <div className="lg:hidden">{newPlanButton}</div>}
        </div>
      )}

      {isAdmin && (
        <PlanFormSheet
          open={form.open}
          plan={form.open ? form.plan : undefined}
          onClose={() => setForm({ open: false })}
        />
      )}
    </>
  );
}

function PlanGroup({ plans, onEdit }: { plans: Plan[]; onEdit: (plan: Plan) => void }) {
  if (plans.length === 0) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} onEdit={() => onEdit(plan)} />
      ))}
    </div>
  );
}

function PlanCard({ plan, onEdit }: { plan: Plan; onEdit: () => void }) {
  const { isAdmin } = useHouseholdSession();
  const { today } = useTaskUI();
  const setActive = useSetPlanActive();
  const toast = useToast();

  const toggleActive = (isActive: boolean) =>
    setActive.mutate(
      { id: plan.id, isActive },
      {
        onSuccess: () =>
          toast.show({
            message: isActive
              ? `«${plan.title}» vuelve a generar tareas`
              : `«${plan.title}» en pausa`,
          }),
        onError: (error) => toast.show({ message: errorMessage(error), tone: 'danger' }),
      },
    );

  const body = (
    <>
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 truncate text-body font-medium">{plan.title}</h3>
        {plan.priority === 'HIGH' && <Badge tone="warning">Alta</Badge>}
      </div>
      <WeekdayChips value={plan.weekdays} size="sm" />
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-small text-fg-3">
        {plan.assignee ? (
          <>
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: plan.assignee.color }}
            />
            <span>{plan.assignee.displayName}</span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1 font-medium text-warning">
            <TriangleAlert className="size-3.5" aria-hidden /> Sin responsable
          </span>
        )}
        <span aria-hidden>·</span>
        <span>
          {plan.nextDueDate
            ? `Próxima: ${dueLabel(plan.nextDueDate, today).toLowerCase()}`
            : 'Sin próximas fechas'}
        </span>
      </p>
      <span className="sr-only">Se repite {describeWeekdays(plan.weekdays)}</span>
    </>
  );

  return (
    <Card className={cn('flex items-start gap-3 p-0 md:p-0', !plan.isActive && 'opacity-70')}>
      {isAdmin ? (
        <button
          type="button"
          onClick={onEdit}
          className="flex min-w-0 flex-1 flex-col gap-2.5 p-4 text-left"
          aria-label={`Editar el plan ${plan.title}`}
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-4">{body}</div>
      )}
      {isAdmin && (
        <div className="p-4 pl-0">
          <Switch
            checked={plan.isActive}
            onChange={toggleActive}
            disabled={setActive.isPending}
            label={plan.isActive ? `Pausar «${plan.title}»` : `Activar «${plan.title}»`}
          />
        </div>
      )}
    </Card>
  );
}
