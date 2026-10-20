import type { PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.ts';

const memberSelect = { select: { id: true, displayName: true, color: true } } as const;

export const expenseInclude = {
  category: { select: { id: true, name: true, color: true, icon: true } },
  paidBy: memberSelect,
  registeredBy: memberSelect,
} as const;

export type ExpenseRow = Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>;

export type ExpenseFilters = {
  householdId: string;
  from?: Date | undefined;
  to?: Date | undefined;
  categoryIds?: string[] | undefined;
  /** `null` = sin pagador. */
  paidById?: string | null | undefined;
  paymentMethod?: PaymentMethod | undefined;
  q?: string | undefined;
};

function whereOf(filters: ExpenseFilters): Prisma.ExpenseWhereInput {
  return {
    householdId: filters.householdId,
    ...(filters.from || filters.to
      ? {
          date: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
    ...(filters.categoryIds ? { categoryId: { in: filters.categoryIds } } : {}),
    ...(filters.paidById !== undefined ? { paidById: filters.paidById } : {}),
    ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
    ...(filters.q ? { description: { contains: filters.q, mode: 'insensitive' } } : {}),
  };
}

export const expensesRepository = {
  findInHousehold(householdId: string, id: string) {
    return prisma.expense.findFirst({ where: { id, householdId }, include: expenseInclude });
  },

  /** Del más reciente al más antiguo. Cursor + un elemento de más para saber si hay más. */
  async page(filters: ExpenseFilters, limit: number, cursor?: string) {
    const rows = await prisma.expense.findMany({
      where: whereOf(filters),
      include: expenseInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  },

  totals(filters: ExpenseFilters) {
    return prisma.expense.aggregate({
      where: whereOf(filters),
      _sum: { amount: true },
      _count: { _all: true },
    });
  },

  /** Una consulta agregada por categoría; nunca una consulta por categoría. */
  sumByCategory(householdId: string, from: Date, to: Date) {
    return prisma.expense.groupBy({
      by: ['categoryId'],
      where: { householdId, date: { gte: from, lte: to } },
      _sum: { amount: true },
    });
  },

  sumByPayer(householdId: string, from: Date, to: Date) {
    return prisma.expense.groupBy({
      by: ['paidById'],
      where: { householdId, date: { gte: from, lte: to } },
      _sum: { amount: true },
    });
  },

  create(data: Prisma.ExpenseUncheckedCreateInput) {
    return prisma.expense.create({ data, include: expenseInclude });
  },

  update(id: string, data: Prisma.ExpenseUncheckedUpdateInput) {
    return prisma.expense.update({ where: { id }, data, include: expenseInclude });
  },

  delete(id: string) {
    return prisma.expense.delete({ where: { id } });
  },
};
