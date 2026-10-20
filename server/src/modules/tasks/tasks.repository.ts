import type { Prisma, TaskOrigin, TaskPriority, TaskStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';

const memberSelect = { select: { id: true, displayName: true, color: true } } as const;

/** Lo que el mapper necesita: la tarea con su asignado y quién la completó. */
export const taskInclude = { assignee: memberSelect, completedBy: memberSelect } as const;

export type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

export type TaskFilters = {
  householdId: string;
  from?: Date | undefined;
  to?: Date | undefined;
  /** `null` = sin asignar. */
  assigneeId?: string | null | undefined;
  statuses?: TaskStatus[] | undefined;
  origin?: TaskOrigin | undefined;
  priority?: TaskPriority | undefined;
  q?: string | undefined;
};

function whereOf(filters: TaskFilters): Prisma.TaskWhereInput {
  return {
    householdId: filters.householdId,
    ...(filters.from || filters.to
      ? {
          dueDate: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
    ...(filters.assigneeId !== undefined ? { assigneeId: filters.assigneeId } : {}),
    ...(filters.statuses ? { status: { in: filters.statuses } } : {}),
    ...(filters.origin ? { origin: filters.origin } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.q ? { title: { contains: filters.q, mode: 'insensitive' } } : {}),
  };
}

export const tasksRepository = {
  findInHousehold(householdId: string, id: string) {
    return prisma.task.findFirst({ where: { id, householdId }, include: taskInclude });
  },

  /** Paginación por cursor: se pide un elemento de más para saber si hay página siguiente. */
  async page(filters: TaskFilters, order: 'asc' | 'desc', limit: number, cursor?: string) {
    const rows = await prisma.task.findMany({
      where: whereOf(filters),
      include: taskInclude,
      orderBy: [{ dueDate: order }, { id: order }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  },

  findMany(filters: TaskFilters, take?: number) {
    return prisma.task.findMany({
      where: whereOf(filters),
      include: taskInclude,
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
      ...(take ? { take } : {}),
    });
  },

  create(data: Prisma.TaskUncheckedCreateInput) {
    return prisma.task.create({ data, include: taskInclude });
  },

  update(id: string, data: Prisma.TaskUncheckedUpdateInput) {
    return prisma.task.update({ where: { id }, data, include: taskInclude });
  },

  delete(id: string) {
    return prisma.task.delete({ where: { id } });
  },
};
