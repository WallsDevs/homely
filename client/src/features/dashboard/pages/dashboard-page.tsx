import { ChevronRight, PartyPopper, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import {
  GoalAlerts,
  MonthSpendingCard,
} from '@/features/expenses/components/month-spending-card.tsx';
import { usePlans } from '@/features/plans/api/plans.ts';
import { useMyTasks } from '@/features/tasks/api/tasks.ts';
import { TaskItem } from '@/features/tasks/components/task-item.tsx';
import { TaskListSkeleton } from '@/features/tasks/components/task-list.tsx';
import { Badge, Card, EmptyState, PageHeader, Skeleton } from '@/shared/ui/index.ts';
import { useHealth } from '../api/health.ts';

const todayLabel = new Intl.DateTimeFormat('es', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date());

export function DashboardPage() {
  const { membership } = useHouseholdSession();

  return (
    <>
      <PageHeader title={`Hola, ${membership.displayName}`} subtitle={capitalize(todayLabel)} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <GoalAlerts />
          <TodayCard />
          <UnassignedPlansAlert />
        </div>

        <div className="flex flex-col gap-4">
          <MonthSpendingCard />
          <SystemStatus />
        </div>
      </div>
    </>
  );
}

/** Dashboard · Hoy: mis tareas del día con check directo, y aviso de vencidas. */
function TodayCard() {
  const mine = useMyTasks();

  if (mine.isPending) return <TaskListSkeleton />;

  const today = mine.data?.today ?? [];
  const overdue = mine.data?.overdue.length ?? 0;
  const pending = today.filter((task) => task.status === 'PENDING').length;

  return (
    <>
      {overdue > 0 && (
        <Link
          to="/tasks"
          className="flex items-center gap-3 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-danger"
        >
          <TriangleAlert className="size-5 shrink-0" aria-hidden />
          <span className="flex-1 text-body font-medium">
            Tienes {overdue} {overdue === 1 ? 'tarea vencida' : 'tareas vencidas'}
          </span>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      )}
      <Card className="p-0 md:p-0">
        <header className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 md:px-5">
          <h2 className="text-h2">Hoy</h2>
          <Link to="/tasks" className="text-small font-medium text-accent">
            Ver tareas
          </Link>
        </header>
        {today.length === 0 ? (
          <EmptyState
            icon={<PartyPopper />}
            title="Nada para hoy"
            description="No tienes tareas asignadas para hoy."
          />
        ) : (
          <>
            <p className="px-4 pb-1 text-small text-fg-3 md:px-5">
              {pending === 0
                ? 'Todo listo por hoy'
                : `${pending} ${pending === 1 ? 'pendiente' : 'pendientes'} de ${today.length}`}
            </p>
            <ul className="divide-y divide-line pb-1">
              {today.map((task) => (
                <TaskItem key={task.id} task={task} showAssignee={false} showDue={false} />
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}

/** PL-08: avisa a los admins de planes activos que se quedaron sin responsable. */
function UnassignedPlansAlert() {
  const { isAdmin } = useHouseholdSession();
  const plans = usePlans({ enabled: isAdmin });
  const count = plans.data?.filter((plan) => plan.isActive && !plan.assignee).length ?? 0;
  if (!isAdmin || count === 0) return null;

  return (
    <Link
      to="/plans"
      className="flex items-center gap-3 rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-warning"
    >
      <TriangleAlert className="size-5 shrink-0" aria-hidden />
      <span className="flex-1 text-body font-medium">
        {count === 1 ? '1 plan no tiene responsable' : `${count} planes no tienen responsable`}
      </span>
      <ChevronRight className="size-4" aria-hidden />
    </Link>
  );
}

function SystemStatus() {
  const health = useHealth();

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 text-small">
        <span className="text-fg-2">Estado del sistema</span>
        {health.isPending ? (
          <Skeleton className="h-5 w-20" />
        ) : health.data?.ok ? (
          <Badge tone="success">En línea</Badge>
        ) : (
          <Badge tone="danger">Sin conexión</Badge>
        )}
      </div>
    </Card>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
