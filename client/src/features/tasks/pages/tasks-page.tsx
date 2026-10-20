import { TASK_STATUSES, type TaskStatus } from '@homely/shared';
import { CalendarCheck, CircleCheckBig, LayoutGrid, PartyPopper, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useMembers } from '@/features/members/api/members.ts';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value.ts';
import { weekRangeLabel } from '@/shared/lib/format-date.ts';
import {
  Button,
  EmptyState,
  Input,
  PageHeader,
  SegmentedControl,
  Select,
} from '@/shared/ui/index.ts';
import { useMyTasks, useTaskList } from '../api/tasks.ts';
import { TaskList } from '../components/task-list.tsx';
import { useTaskUI } from '../components/task-ui.ts';

type Tab = 'today' | 'week' | 'overdue' | 'all';

export function TasksPage() {
  const { isAdmin, openCreate } = useTaskUI();
  const mine = useMyTasks();
  const [tab, setTab] = useState<Tab>('today');

  const counts = mine.data && {
    today: mine.data.today.filter((t) => t.status === 'PENDING').length,
    week: [...mine.data.today, ...mine.data.upcoming].filter((t) => t.status === 'PENDING').length,
    overdue: mine.data.overdue.length,
  };
  const withCount = (label: string, count: number | undefined) =>
    count ? `${label} · ${count}` : label;

  return (
    <>
      <PageHeader
        title="Tareas"
        subtitle={
          mine.data
            ? `Semana del ${weekRangeLabel(mine.data.weekStart, mine.data.weekEnd)}`
            : undefined
        }
        action={
          isAdmin ? (
            <Button icon={<Plus className="size-4" />} onClick={() => openCreate()}>
              Nueva tarea
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SegmentedControl
          label="Ver"
          value={tab}
          onChange={setTab}
          className="md:w-[30rem]"
          options={[
            { value: 'today', label: withCount('Hoy', counts?.today) },
            { value: 'week', label: withCount('Semana', counts?.week) },
            { value: 'overdue', label: withCount('Vencidas', counts?.overdue) },
            { value: 'all', label: 'Todas' },
          ]}
        />
        <Link
          to="/tasks/board"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 text-body font-medium transition-colors hover-pointer:bg-surface-2"
        >
          <LayoutGrid className="size-4" aria-hidden />
          Tablero del hogar
        </Link>
      </div>

      {tab === 'today' && (
        <TaskList
          tasks={mine.data?.today}
          showAssignee={false}
          empty={
            <EmptyState
              icon={<PartyPopper />}
              title="Nada para hoy"
              description="No tienes tareas asignadas para hoy."
            />
          }
        />
      )}
      {tab === 'week' && (
        <TaskList
          tasks={mine.data && [...mine.data.today, ...mine.data.upcoming]}
          groupByDay
          showAssignee={false}
          empty={
            <EmptyState
              icon={<CalendarCheck />}
              title="Semana libre"
              description="No tienes más tareas esta semana."
            />
          }
        />
      )}
      {tab === 'overdue' && (
        <TaskList
          tasks={mine.data?.overdue}
          showAssignee={false}
          empty={
            <EmptyState
              icon={<CircleCheckBig />}
              title="Al día"
              description="No tienes tareas vencidas. Así se hace."
            />
          }
        />
      )}
      {tab === 'all' && <AllTasks />}
    </>
  );
}

const statusOptions = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'DONE', label: 'Hechas' },
  { value: 'SKIPPED', label: 'Omitidas' },
];

/** TK-08: todas las tareas del hogar con búsqueda y filtros, de la más reciente a la más antigua. */
function AllTasks() {
  const members = useMembers(true);
  const [search, setSearch] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const q = useDebouncedValue(search.trim());

  const list = useTaskList({
    order: 'desc',
    ...(q ? { q } : {}),
    ...(assigneeId ? { assigneeId } : {}),
    ...(status ? { status } : {}),
  });
  const tasks = list.data?.pages.flatMap((page) => page.items);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-[1fr_12rem_12rem]">
        <Input
          label="Buscar"
          hideLabel
          type="search"
          placeholder="Buscar por título"
          prefix={<Search className="size-4" />}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          label="Responsable"
          className="[&>label]:sr-only"
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
          options={[
            { value: '', label: 'Todos' },
            ...(members.data?.map((m) => ({ value: m.id, label: m.displayName })) ?? []),
            { value: 'none', label: 'Sin asignar' },
          ]}
        />
        <Select
          label="Estado"
          className="[&>label]:sr-only"
          value={status}
          onChange={(event) => {
            const value = event.target.value;
            setStatus(TASK_STATUSES.find((s) => s === value) ?? '');
          }}
          options={statusOptions}
        />
      </div>

      <TaskList
        tasks={tasks}
        empty={
          <EmptyState
            icon={<Search />}
            title="Sin resultados"
            description="Prueba con otra búsqueda o quita filtros."
          />
        }
      />

      {list.hasNextPage && (
        <Button
          variant="secondary"
          loading={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
          className="self-center"
        >
          Cargar más
        </Button>
      )}
    </div>
  );
}
