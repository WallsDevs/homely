import { CircleCheckBig, Wallet } from 'lucide-react';
import { Badge, Card, CardHeader, EmptyState, PageHeader, Skeleton } from '@/shared/ui/index.ts';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
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
        <Card className="lg:col-span-2">
          <CardHeader title="Hoy" />
          <EmptyState
            icon={<CircleCheckBig />}
            title="Tus tareas aparecerán aquí"
            description="Cuando existan planes y tareas, verás lo que te toca hoy con un toque para completarlo."
          />
        </Card>

        <div className="flex flex-col gap-4">
          <SystemStatus />
          <Card>
            <CardHeader title="Gastos del mes" />
            <EmptyState
              icon={<Wallet />}
              title="Sin gastos todavía"
              description="El total del mes y tus metas se mostrarán aquí."
            />
          </Card>
        </div>
      </div>
    </>
  );
}

function SystemStatus() {
  const health = useHealth();

  return (
    <Card>
      <CardHeader title="Estado del sistema" />
      {health.isPending ? (
        <Skeleton className="h-5 w-32" />
      ) : (
        <div className="flex items-center justify-between gap-3 text-small">
          <span className="text-fg-2">API y base de datos</span>
          {health.data?.ok ? (
            <Badge tone="success">En línea</Badge>
          ) : (
            <Badge tone="danger">Sin conexión</Badge>
          )}
        </div>
      )}
    </Card>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
