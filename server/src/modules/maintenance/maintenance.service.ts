import type { AuditEntry, IsoDate, PurgePreview } from '@homely/shared';
import type { Prisma } from '@prisma/client';
import type { HouseholdCtx } from '../../lib/context.ts';
import { startOfWeek, toDbDate, todayIn } from '../../lib/dates.ts';
import { AppError } from '../../lib/errors.ts';
import { toMoney } from '../../lib/money.ts';
import { prisma } from '../../lib/prisma.ts';
import { auditRepository } from '../audit/audit.repository.ts';

const AUDIT_PAGE_SIZE = 20;

/**
 * RP-14: no se puede borrar la semana actual ni el futuro, para no perder trabajo en curso.
 * El servidor lo valida aunque la UI ya lo impida.
 */
function assertPurgeable(ctx: HouseholdCtx, from: IsoDate, to: IsoDate) {
  const currentWeek = startOfWeek(todayIn(ctx.household.timezone), ctx.household.weekStartsOn);
  if (from > to) throw new AppError('INVALID_RANGE', 400, 'El rango de fechas no es válido');
  if (to >= currentWeek) {
    throw new AppError(
      'INVALID_RANGE',
      400,
      'Solo se pueden borrar semanas ya terminadas: el rango debe acabar antes de esta semana',
    );
  }
}

/** Tareas por `dueDate` y gastos por `date` dentro del rango (inclusive). */
function rangeWhere(ctx: HouseholdCtx, from: IsoDate, to: IsoDate) {
  const range = { gte: toDbDate(from), lte: toDbDate(to) };
  return {
    tasks: { householdId: ctx.householdId, dueDate: range },
    expenses: { householdId: ctx.householdId, date: range },
  } satisfies Record<string, Prisma.TaskWhereInput | Prisma.ExpenseWhereInput>;
}

/** Comparación tolerante: mayúsculas, espacios y acentos no deben frustrar la confirmación. */
function sameName(a: string, b: string): boolean {
  const normalize = (value: string) =>
    value
      .trim()
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  return normalize(a) === normalize(b);
}

export const maintenanceService = {
  /** RP-13: lo que se borraría, antes de confirmar. */
  async preview(ctx: HouseholdCtx, from: IsoDate, to: IsoDate): Promise<PurgePreview> {
    assertPurgeable(ctx, from, to);
    const where = rangeWhere(ctx, from, to);
    const [tasks, expenses] = await Promise.all([
      prisma.task.count({ where: where.tasks }),
      prisma.expense.aggregate({
        where: where.expenses,
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);
    return { tasks, expenses: expenses._count._all, amount: toMoney(expenses._sum.amount) };
  },

  /**
   * RP-12 / RP-15: borra tareas y gastos del rango en una transacción y lo deja en auditoría.
   * No toca planes, categorías, metas ni miembros.
   */
  async purge(
    ctx: HouseholdCtx,
    from: IsoDate,
    to: IsoDate,
    confirmation: string,
  ): Promise<PurgePreview> {
    assertPurgeable(ctx, from, to);
    if (!sameName(confirmation, ctx.household.name)) {
      throw AppError.validation({
        confirmation: ['Escribe exactamente el nombre del hogar para confirmar'],
      });
    }

    const where = rangeWhere(ctx, from, to);
    return prisma.$transaction(async (tx) => {
      const amount = await tx.expense.aggregate({ where: where.expenses, _sum: { amount: true } });
      const tasks = await tx.task.deleteMany({ where: where.tasks });
      const expenses = await tx.expense.deleteMany({ where: where.expenses });
      const result = {
        tasks: tasks.count,
        expenses: expenses.count,
        amount: toMoney(amount._sum.amount),
      };
      await auditRepository.record(tx, {
        householdId: ctx.householdId,
        actorId: ctx.membershipId,
        action: 'DATA_PURGE',
        metadata: { from, to, ...result },
      });
      return result;
    });
  },

  async auditLog(ctx: HouseholdCtx, cursor: string | undefined) {
    const rows = await prisma.auditLog.findMany({
      where: { householdId: ctx.householdId },
      include: { actor: { select: { id: true, displayName: true, color: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: AUDIT_PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > AUDIT_PAGE_SIZE;
    const items = (hasMore ? rows.slice(0, AUDIT_PAGE_SIZE) : rows).map((row): AuditEntry => ({
      id: row.id,
      action: row.action,
      actor: row.actor,
      metadata:
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? row.metadata
          : {},
      createdAt: row.createdAt.toISOString(),
    }));
    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  },
};
