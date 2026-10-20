import type {
  Board,
  BoardColumn,
  IsoDate,
  MyTasks,
  Task,
  TasksPage,
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from '@homely/shared';
import type { z } from 'zod';
import type { HouseholdCtx } from '../../lib/context.ts';
import { addDays, endOfWeek, startOfWeek, toDbDate, todayIn } from '../../lib/dates.ts';
import { AppError } from '../../lib/errors.ts';
import { membersRepository } from '../members/members.repository.ts';
import { toTask } from './tasks.mappers.ts';
import { tasksRepository, type TaskRow } from './tasks.repository.ts';

type CreateTaskData = z.output<typeof createTaskSchema>;
type UpdateTaskData = z.output<typeof updateTaskSchema>;
type ListTasksData = z.output<typeof listTasksQuerySchema>;

const OVERDUE_LIMIT = 50;

const todayOf = (ctx: HouseholdCtx): IsoDate => todayIn(ctx.household.timezone);

async function findTask(ctx: HouseholdCtx, id: string): Promise<TaskRow> {
  const task = await tasksRepository.findInHousehold(ctx.householdId, id);
  if (!task) throw AppError.notFound('Tarea');
  return task;
}

/** Solo se asigna a miembros activos del mismo hogar. */
async function assertAssignable(ctx: HouseholdCtx, assigneeId: string | null | undefined) {
  if (!assigneeId) return;
  const member = await membersRepository.findInHousehold(ctx.householdId, assigneeId);
  if (!member?.isActive) {
    throw AppError.validation({ assigneeId: ['Elige un miembro activo del hogar'] });
  }
}

/** TK-03 / TK-04: el asignado o un admin. */
function assertCanResolve(ctx: HouseholdCtx, task: TaskRow) {
  if (ctx.role !== 'ADMIN' && task.assigneeId !== ctx.membershipId) {
    throw AppError.forbidden('Solo la persona asignada o un admin puede cambiar esta tarea');
  }
}

/** Pendientes primero, luego por prioridad. Así lo que falta queda arriba. */
const statusRank = { PENDING: 0, DONE: 1, SKIPPED: 2 } as const;
const priorityRank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
function byUrgency(a: Task, b: Task): number {
  return (
    a.dueDate.localeCompare(b.dueDate) ||
    statusRank[a.status] - statusRank[b.status] ||
    priorityRank[a.priority] - priorityRank[b.priority] ||
    a.createdAt.localeCompare(b.createdAt)
  );
}

export const tasksService = {
  async list(ctx: HouseholdCtx, query: ListTasksData): Promise<TasksPage> {
    const today = todayOf(ctx);
    const page = await tasksRepository.page(
      {
        householdId: ctx.householdId,
        from: query.from ? toDbDate(query.from) : undefined,
        to: query.to ? toDbDate(query.to) : undefined,
        assigneeId: query.assigneeId === 'none' ? null : query.assigneeId,
        statuses: query.status,
        origin: query.origin,
        priority: query.priority,
        q: query.q,
      },
      query.order,
      query.limit,
      query.cursor,
    );
    return { items: page.items.map((row) => toTask(row, today)), nextCursor: page.nextCursor };
  },

  /** TK-06: vencidas, hoy y el resto de la semana del miembro autenticado. */
  async mine(ctx: HouseholdCtx): Promise<MyTasks> {
    const today = todayOf(ctx);
    const weekStart = startOfWeek(today, ctx.household.weekStartsOn);
    const weekEnd = endOfWeek(today, ctx.household.weekStartsOn);
    const mine = { householdId: ctx.householdId, assigneeId: ctx.membershipId };

    const [overdueRows, weekRows] = await Promise.all([
      tasksRepository.findMany(
        { ...mine, statuses: ['PENDING'], to: toDbDate(addDays(today, -1)) },
        OVERDUE_LIMIT,
      ),
      tasksRepository.findMany({ ...mine, from: toDbDate(today), to: toDbDate(weekEnd) }),
    ]);

    const week = weekRows.map((row) => toTask(row, today)).sort(byUrgency);
    return {
      date: today,
      weekStart,
      weekEnd,
      overdue: overdueRows.map((row) => toTask(row, today)),
      today: week.filter((task) => task.dueDate === today),
      upcoming: week.filter((task) => task.dueDate > today),
    };
  },

  /** TK-07: la semana del hogar, una columna por miembro (incluso sin tareas). */
  async board(ctx: HouseholdCtx, day: IsoDate | undefined): Promise<Board> {
    const today = todayOf(ctx);
    const weekStart = startOfWeek(day ?? today, ctx.household.weekStartsOn);
    const weekEnd = addDays(weekStart, 6);

    const [rows, members] = await Promise.all([
      tasksRepository.findMany({
        householdId: ctx.householdId,
        from: toDbDate(weekStart),
        to: toDbDate(weekEnd),
      }),
      membersRepository.list(ctx.householdId, true),
    ]);
    const tasks = rows.map((row) => toTask(row, today)).sort(byUrgency);

    const column = (member: BoardColumn['member'], items: Task[]): BoardColumn => ({
      member,
      tasks: items,
      total: items.filter((task) => task.status !== 'SKIPPED').length,
      done: items.filter((task) => task.status === 'DONE').length,
    });

    // Yo primero; después el resto en orden de llegada. Inactivos solo si tienen tareas esa semana.
    const ordered = [
      ...members.filter((m) => m.id === ctx.membershipId),
      ...members.filter((m) => m.id !== ctx.membershipId),
    ];
    const columns = ordered
      .map((m) =>
        column(
          { id: m.id, displayName: m.displayName, color: m.color, isActive: m.isActive },
          tasks.filter((task) => task.assignee?.id === m.id),
        ),
      )
      .filter((col) => col.member?.isActive || col.tasks.length > 0);

    const unassigned = tasks.filter((task) => !task.assignee);
    if (unassigned.length > 0) columns.push(column(null, unassigned));

    return { date: today, weekStart, weekEnd, columns };
  },

  async get(ctx: HouseholdCtx, id: string): Promise<Task> {
    return toTask(await findTask(ctx, id), todayOf(ctx));
  },

  /** TK-01 (solo admins, lo garantiza la ruta). */
  async create(ctx: HouseholdCtx, input: CreateTaskData): Promise<Task> {
    await assertAssignable(ctx, input.assigneeId);
    const row = await tasksRepository.create({
      householdId: ctx.householdId,
      title: input.title,
      description: input.description ?? null,
      assigneeId: input.assigneeId,
      dueDate: toDbDate(input.dueDate),
      priority: input.priority,
      origin: 'MANUAL',
      createdById: ctx.membershipId,
    });
    return toTask(row, todayOf(ctx));
  },

  /** TK-02. En tareas de un plan, solo cambia esta instancia; el plan queda igual. */
  async update(ctx: HouseholdCtx, id: string, input: UpdateTaskData): Promise<Task> {
    await findTask(ctx, id);
    await assertAssignable(ctx, input.assigneeId);
    const row = await tasksRepository.update(id, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
      ...(input.dueDate !== undefined ? { dueDate: toDbDate(input.dueDate) } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
    });
    return toTask(row, todayOf(ctx));
  },

  async remove(ctx: HouseholdCtx, id: string): Promise<void> {
    await findTask(ctx, id);
    await tasksRepository.delete(id);
  },

  /** TK-03: se guarda quién la completó y cuándo (base del historial). Idempotente. */
  async complete(ctx: HouseholdCtx, id: string): Promise<Task> {
    const task = await findTask(ctx, id);
    assertCanResolve(ctx, task);
    if (task.status === 'DONE') return toTask(task, todayOf(ctx));

    const row = await tasksRepository.update(id, {
      status: 'DONE',
      completedById: ctx.membershipId,
      completedAt: new Date(),
    });
    return toTask(row, todayOf(ctx));
  },

  async uncomplete(ctx: HouseholdCtx, id: string): Promise<Task> {
    const task = await findTask(ctx, id);
    assertCanResolve(ctx, task);
    const row = await tasksRepository.update(id, {
      status: 'PENDING',
      completedById: null,
      completedAt: null,
    });
    return toTask(row, todayOf(ctx));
  },

  /** TK-04: "no aplicaba esta semana". No cuenta como incumplimiento. Solo admins. */
  async skip(ctx: HouseholdCtx, id: string): Promise<Task> {
    await findTask(ctx, id);
    const row = await tasksRepository.update(id, {
      status: 'SKIPPED',
      completedById: null,
      completedAt: null,
    });
    return toTask(row, todayOf(ctx));
  },
};
