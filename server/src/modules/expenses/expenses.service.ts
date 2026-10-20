import {
  periodRange,
  previousPeriodDay,
  type Expense,
  type ExpenseSummary,
  type ExpensesPage,
  type GoalPeriod,
  type IsoDate,
  type createExpenseSchema,
  type listExpensesQuerySchema,
  type updateExpenseSchema,
} from '@homely/shared';
import { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { HouseholdCtx } from '../../lib/context.ts';
import { fromDbDate, toDbDate, todayIn } from '../../lib/dates.ts';
import { AppError } from '../../lib/errors.ts';
import { toDecimal, toMoney } from '../../lib/money.ts';
import { prisma } from '../../lib/prisma.ts';
import { assertUsableCategory, toCategoryRef } from '../categories/categories.service.ts';
import { goalsService } from '../goals/goals.service.ts';
import { assertAssignable } from '../members/members.service.ts';
import { expensesRepository, type ExpenseRow } from './expenses.repository.ts';

type CreateExpenseData = z.output<typeof createExpenseSchema>;
type UpdateExpenseData = z.output<typeof updateExpenseSchema>;
type ListExpensesData = z.output<typeof listExpensesQuerySchema>;

export function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amount: toMoney(row.amount),
    date: fromDbDate(row.date),
    description: row.description,
    paymentMethod: row.paymentMethod,
    category: toCategoryRef(row.category),
    paidBy: row.paidBy,
    registeredBy: row.registeredBy,
    createdAt: row.createdAt.toISOString(),
  };
}

async function findExpense(ctx: HouseholdCtx, id: string): Promise<ExpenseRow> {
  const row = await expensesRepository.findInHousehold(ctx.householdId, id);
  if (!row) throw AppError.notFound('Gasto');
  return row;
}

/** EX-02: quien lo registró o un admin. */
function assertCanEdit(ctx: HouseholdCtx, row: ExpenseRow) {
  if (ctx.role !== 'ADMIN' && row.registeredById !== ctx.membershipId) {
    throw AppError.forbidden('Solo quien registró el gasto o un admin puede cambiarlo');
  }
}

const sumOf = (rows: { _sum: { amount: Prisma.Decimal | null } }[]) =>
  rows.reduce((total, row) => total.add(row._sum.amount ?? 0), new Prisma.Decimal(0));

export const expensesService = {
  async list(ctx: HouseholdCtx, query: ListExpensesData): Promise<ExpensesPage> {
    const filters = {
      householdId: ctx.householdId,
      from: query.from ? toDbDate(query.from) : undefined,
      to: query.to ? toDbDate(query.to) : undefined,
      categoryIds: query.categoryId,
      paidById: query.paidById === 'none' ? null : query.paidById,
      paymentMethod: query.paymentMethod,
      q: query.q,
    };
    const [page, totals] = await Promise.all([
      expensesRepository.page(filters, query.limit, query.cursor),
      expensesRepository.totals(filters),
    ]);
    return {
      items: page.items.map(toExpense),
      nextCursor: page.nextCursor,
      totals: { count: totals._count._all, amount: toMoney(totals._sum.amount) },
    };
  },

  async get(ctx: HouseholdCtx, id: string): Promise<Expense> {
    return toExpense(await findExpense(ctx, id));
  },

  /** EX-01: cualquier miembro registra gastos. Por defecto pagó quien lo registra. */
  async create(ctx: HouseholdCtx, input: CreateExpenseData): Promise<Expense> {
    await assertUsableCategory(ctx.householdId, input.categoryId);
    const paidById = input.paidById === undefined ? ctx.membershipId : input.paidById;
    await assertAssignable(ctx.householdId, paidById, 'paidById');

    const row = await expensesRepository.create({
      householdId: ctx.householdId,
      categoryId: input.categoryId,
      amount: toDecimal(input.amount),
      date: toDbDate(input.date),
      description: input.description ?? null,
      paymentMethod: input.paymentMethod ?? null,
      paidById,
      registeredById: ctx.membershipId,
    });
    return toExpense(row);
  },

  async update(ctx: HouseholdCtx, id: string, input: UpdateExpenseData): Promise<Expense> {
    const current = await findExpense(ctx, id);
    assertCanEdit(ctx, current);
    if (input.categoryId !== undefined && input.categoryId !== current.categoryId) {
      await assertUsableCategory(ctx.householdId, input.categoryId);
    }
    if (input.paidById !== undefined && input.paidById !== current.paidById) {
      await assertAssignable(ctx.householdId, input.paidById, 'paidById');
    }

    const row = await expensesRepository.update(id, {
      ...(input.amount !== undefined ? { amount: toDecimal(input.amount) } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.date !== undefined ? { date: toDbDate(input.date) } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}),
      ...(input.paidById !== undefined ? { paidById: input.paidById } : {}),
    });
    return toExpense(row);
  },

  async remove(ctx: HouseholdCtx, id: string): Promise<void> {
    assertCanEdit(ctx, await findExpense(ctx, id));
    await expensesRepository.delete(id);
  },

  /** EX-08: total, por categoría, por quien pagó, vs. periodo anterior, y estado de las metas. */
  async summary(
    ctx: HouseholdCtx,
    period: GoalPeriod,
    day: IsoDate | undefined,
  ): Promise<ExpenseSummary> {
    const reference = day ?? todayIn(ctx.household.timezone);
    const { start, end } = periodRange(period, reference, ctx.household.weekStartsOn);
    const previous = periodRange(
      period,
      previousPeriodDay(period, start),
      ctx.household.weekStartsOn,
    );
    const range = [toDbDate(start), toDbDate(end)] as const;

    const [byCategory, byPayer, previousTotal, categories, members, goals] = await Promise.all([
      expensesRepository.sumByCategory(ctx.householdId, ...range),
      expensesRepository.sumByPayer(ctx.householdId, ...range),
      expensesRepository.totals({
        householdId: ctx.householdId,
        from: toDbDate(previous.start),
        to: toDbDate(previous.end),
      }),
      prisma.expenseCategory.findMany({ where: { householdId: ctx.householdId } }),
      prisma.membership.findMany({
        where: { householdId: ctx.householdId },
        select: { id: true, displayName: true, color: true },
      }),
      goalsService.list(ctx, reference),
    ]);

    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const memberById = new Map(members.map((m) => [m.id, m]));
    const byAmountDesc = (a: { amount: string }, b: { amount: string }) =>
      Number(b.amount) - Number(a.amount);

    return {
      period,
      periodStart: start,
      periodEnd: end,
      total: toMoney(sumOf(byCategory)),
      previousTotal: toMoney(previousTotal._sum.amount),
      byCategory: byCategory
        .flatMap((row) => {
          const category = categoryById.get(row.categoryId);
          return category
            ? [{ category: toCategoryRef(category), amount: toMoney(row._sum.amount) }]
            : [];
        })
        .sort(byAmountDesc),
      byPayer: byPayer
        .map((row) => ({
          member: (row.paidById && memberById.get(row.paidById)) || null,
          amount: toMoney(row._sum.amount),
        }))
        .sort(byAmountDesc),
      goals,
    };
  },
};
