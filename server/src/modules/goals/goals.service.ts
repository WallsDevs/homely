import {
  goalStatusOf,
  periodRange,
  type CreateGoalInput,
  type Goal,
  type IsoDate,
  type UpdateGoalInput,
} from '@homely/shared';
import { Prisma } from '@prisma/client';
import type { HouseholdCtx } from '../../lib/context.ts';
import { toDbDate, todayIn } from '../../lib/dates.ts';
import { AppError } from '../../lib/errors.ts';
import { toDecimal, toMoney } from '../../lib/money.ts';
import { prisma } from '../../lib/prisma.ts';
import { assertUsableCategory, toCategoryRef } from '../categories/categories.service.ts';

const goalInclude = {
  category: { select: { id: true, name: true, color: true, icon: true } },
} as const;
type GoalRow = Prisma.BudgetGoalGetPayload<{ include: typeof goalInclude }>;

/** Gasto por categoría en un rango + total. Una sola consulta agregada. */
async function spendingIn(householdId: string, start: IsoDate, end: IsoDate) {
  const rows = await prisma.expense.groupBy({
    by: ['categoryId'],
    where: { householdId, date: { gte: toDbDate(start), lte: toDbDate(end) } },
    _sum: { amount: true },
  });
  const byCategory = new Map(
    rows.map((row) => [row.categoryId, row._sum.amount ?? new Prisma.Decimal(0)]),
  );
  const total = rows.reduce((sum, row) => sum.add(row._sum.amount ?? 0), new Prisma.Decimal(0));
  return { byCategory, total };
}

function toGoal(
  row: GoalRow,
  range: { start: IsoDate; end: IsoDate },
  spent: Prisma.Decimal,
): Goal {
  const ratio = row.amount.isZero() ? 0 : spent.div(row.amount).toNumber();
  return {
    id: row.id,
    category: row.category ? toCategoryRef(row.category) : null,
    period: row.period,
    amount: toMoney(row.amount),
    progress: {
      periodStart: range.start,
      periodEnd: range.end,
      spent: toMoney(spent),
      ratio: Math.round(ratio * 1000) / 1000,
      status: goalStatusOf(ratio),
    },
  };
}

async function findGoal(ctx: HouseholdCtx, id: string): Promise<GoalRow> {
  const row = await prisma.budgetGoal.findFirst({
    where: { id, householdId: ctx.householdId },
    include: goalInclude,
  });
  if (!row) throw AppError.notFound('Meta');
  return row;
}

export const goalsService = {
  /**
   * EX-05/EX-06: metas activas con su progreso en el periodo que contiene `day` (hoy por defecto).
   * Primero el total del hogar, luego las de categoría; mensuales antes que semanales.
   */
  async list(ctx: HouseholdCtx, day?: IsoDate): Promise<Goal[]> {
    const reference = day ?? todayIn(ctx.household.timezone);
    const rows = await prisma.budgetGoal.findMany({
      where: { householdId: ctx.householdId, isActive: true },
      include: goalInclude,
      orderBy: [{ period: 'desc' }, { createdAt: 'asc' }],
    });
    if (rows.length === 0) return [];

    const periods = [...new Set(rows.map((row) => row.period))];
    const ranges = new Map(
      periods.map((period) => [period, periodRange(period, reference, ctx.household.weekStartsOn)]),
    );
    const spending = new Map(
      await Promise.all(
        periods.map(async (period) => {
          const range = ranges.get(period) ?? { start: reference, end: reference };
          return [period, await spendingIn(ctx.householdId, range.start, range.end)] as const;
        }),
      ),
    );

    return rows
      .map((row) => {
        const range = ranges.get(row.period) ?? { start: reference, end: reference };
        const totals = spending.get(row.period);
        const spent = row.categoryId
          ? (totals?.byCategory.get(row.categoryId) ?? new Prisma.Decimal(0))
          : (totals?.total ?? new Prisma.Decimal(0));
        return toGoal(row, range, spent);
      })
      .sort((a, b) => Number(a.category !== null) - Number(b.category !== null));
  },

  /** Una meta activa por (categoría, periodo). */
  async create(ctx: HouseholdCtx, input: CreateGoalInput): Promise<Goal> {
    if (input.categoryId) await assertUsableCategory(ctx.householdId, input.categoryId);
    const duplicate = await prisma.budgetGoal.findFirst({
      where: {
        householdId: ctx.householdId,
        categoryId: input.categoryId,
        period: input.period,
        isActive: true,
      },
    });
    if (duplicate) {
      throw AppError.conflict(
        'DUPLICATE_GOAL',
        'Ya hay una meta para esa categoría y periodo. Edítala en lugar de crear otra.',
      );
    }

    const row = await prisma.budgetGoal.create({
      data: {
        householdId: ctx.householdId,
        categoryId: input.categoryId,
        period: input.period,
        amount: toDecimal(input.amount),
      },
      include: goalInclude,
    });
    return this.withProgress(ctx, row.id);
  },

  async update(ctx: HouseholdCtx, id: string, input: UpdateGoalInput): Promise<Goal> {
    await findGoal(ctx, id);
    if (input.amount !== undefined) {
      await prisma.budgetGoal.update({ where: { id }, data: { amount: toDecimal(input.amount) } });
    }
    return this.withProgress(ctx, id);
  },

  async remove(ctx: HouseholdCtx, id: string): Promise<void> {
    await findGoal(ctx, id);
    await prisma.budgetGoal.delete({ where: { id } });
  },

  async withProgress(ctx: HouseholdCtx, id: string): Promise<Goal> {
    const goal = (await this.list(ctx)).find((item) => item.id === id);
    if (!goal) throw AppError.notFound('Meta');
    return goal;
  },
};
