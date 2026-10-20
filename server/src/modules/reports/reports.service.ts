import type { History, IsoDate, TopMissed, WeeklyReport } from '@homely/shared';
import type { HouseholdCtx } from '../../lib/context.ts';
import { addDays, fromDbDate, startOfWeek, toDbDate, todayIn } from '../../lib/dates.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma } from '../../lib/prisma.ts';
import { expensesService } from '../expenses/expenses.service.ts';
import { materializeForView } from '../plans/plan-generation.ts';
import { byWeek, deltaOf, statsOf, streakOf, type StatRow } from './report-stats.ts';

/** Cuántas semanas hacia atrás se miran para calcular rachas. */
const STREAK_LOOKBACK_WEEKS = 52;
const TOP_MISSED_LIMIT = 5;

const calendarOf = (ctx: HouseholdCtx) => ({
  id: ctx.householdId,
  timezone: ctx.household.timezone,
  weekStartsOn: ctx.household.weekStartsOn,
});

/** Una sola consulta liviana: solo lo necesario para contar. */
async function statRows(householdId: string, from: IsoDate, to: IsoDate): Promise<StatRow[]> {
  const rows = await prisma.task.findMany({
    where: { householdId, dueDate: { gte: toDbDate(from), lte: toDbDate(to) } },
    select: { assigneeId: true, status: true, dueDate: true },
  });
  return rows.map((row) => ({ ...row, dueDate: fromDbDate(row.dueDate) }));
}

export const reportsService = {
  /** RP-01, RP-02, RP-03, RP-05 + gastos de la semana (EX-08). */
  async weekly(ctx: HouseholdCtx, day: IsoDate | undefined): Promise<WeeklyReport> {
    const { weekStartsOn, timezone } = ctx.household;
    const today = todayIn(timezone);
    const weekStart = startOfWeek(day ?? today, weekStartsOn);
    const weekEnd = addDays(weekStart, 6);
    const previousWeek = addDays(weekStart, -7);
    const oldestWeek = addDays(weekStart, -7 * STREAK_LOOKBACK_WEEKS);
    const isClosed = weekEnd < today;

    await materializeForView(calendarOf(ctx), weekStart);

    const [rows, members, expenses] = await Promise.all([
      statRows(ctx.householdId, oldestWeek, weekEnd),
      prisma.membership.findMany({
        where: { householdId: ctx.householdId },
        orderBy: { joinedAt: 'asc' },
        select: { id: true, displayName: true, color: true, isActive: true },
      }),
      expensesService.summary(ctx, 'WEEKLY', weekStart),
    ]);

    const weeks = byWeek(rows, weekStartsOn);
    const thisWeek = weeks.get(weekStart) ?? [];
    const lastWeek = weeks.get(previousWeek) ?? [];
    // La semana en curso aún no cuenta para la racha: se mide hasta la última cerrada.
    const lastClosedWeek = isClosed ? weekStart : previousWeek;

    const household = statsOf(thisWeek);
    const memberWeeks = members
      .map((member) => {
        const mine = (list: readonly StatRow[]) => list.filter((r) => r.assigneeId === member.id);
        const stats = statsOf(mine(thisWeek));
        const memberWeeksMap = new Map([...weeks].map(([week, list]) => [week, mine(list)]));
        return {
          member: { id: member.id, displayName: member.displayName, color: member.color },
          isActive: member.isActive,
          ...stats,
          deltaRate: deltaOf(stats.rate, statsOf(mine(lastWeek)).rate),
          streak: streakOf(memberWeeksMap, lastClosedWeek, oldestWeek),
        };
      })
      // Los inactivos aparecen solo si tuvieron tareas esa semana.
      .filter((entry) => entry.isActive || entry.assigned > 0)
      .map(({ isActive: _isActive, ...entry }) => entry);

    return {
      weekStart,
      weekEnd,
      today,
      isClosed,
      household: { ...household, deltaRate: deltaOf(household.rate, statsOf(lastWeek).rate) },
      members: memberWeeks,
      expenses,
    };
  },

  /**
   * RP-04: tareas que más se dejan sin hacer en un rango: pendientes con fecha ya pasada.
   * Se agrupa por título (las de un mismo plan comparten título).
   */
  async topMissed(
    ctx: HouseholdCtx,
    from: IsoDate,
    to: IsoDate,
    memberId: string | undefined,
  ): Promise<TopMissed> {
    const today = todayIn(ctx.household.timezone);
    const end = to < today ? to : addDays(today, -1);
    if (end < from) return { items: [] };

    const groups = await prisma.task.groupBy({
      by: ['title'],
      where: {
        householdId: ctx.householdId,
        status: 'PENDING',
        dueDate: { gte: toDbDate(from), lte: toDbDate(end) },
        ...(memberId ? { assigneeId: memberId } : {}),
      },
      _count: { _all: true },
      orderBy: { _count: { title: 'desc' } },
      take: TOP_MISSED_LIMIT,
    });
    return { items: groups.map((group) => ({ title: group.title, missed: group._count._all })) };
  },

  /** RP-10 / RP-11: el año de un miembro, semana a semana. Por defecto, el año en curso. */
  async history(ctx: HouseholdCtx, memberId: string, year: number | undefined): Promise<History> {
    const { weekStartsOn, timezone } = ctx.household;
    const today = todayIn(timezone);
    const currentYear = Number(today.slice(0, 4));
    const selectedYear = year ?? currentYear;

    const member = await prisma.membership.findFirst({
      where: { id: memberId, householdId: ctx.householdId },
      select: { id: true, displayName: true, color: true },
    });
    if (!member) throw AppError.notFound('Miembro');

    const yearStart = `${selectedYear}-01-01`;
    const yearEnd = `${selectedYear}-12-31`;
    const lastDay = yearEnd < today ? yearEnd : today;

    const [rows, oldest] = await Promise.all([
      prisma.task.findMany({
        where: {
          householdId: ctx.householdId,
          assigneeId: memberId,
          dueDate: { gte: toDbDate(yearStart), lte: toDbDate(lastDay) },
        },
        select: { assigneeId: true, status: true, dueDate: true, title: true },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.task.aggregate({ where: { householdId: ctx.householdId }, _min: { dueDate: true } }),
    ]);

    const tasks = rows.map((row) => ({ ...row, dueDate: fromDbDate(row.dueDate) }));
    const weeks = byWeek(tasks, weekStartsOn);
    const weekList = [...weeks.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([weekStart, list]) => ({
        weekStart,
        weekEnd: addDays(weekStart, 6),
        ...statsOf(list),
        missed: list
          .filter((task) => task.status === 'PENDING' && task.dueDate < today)
          .map((task) => task.title),
      }));

    const firstYear = oldest._min.dueDate ? oldest._min.dueDate.getUTCFullYear() : currentYear;
    const availableYears = Array.from(
      { length: Math.max(currentYear - firstYear, 0) + 1 },
      (_, index) => currentYear - index,
    );

    // Para el resumen del año solo cuentan las semanas cerradas o el pasado de la actual.
    const pastTasks = tasks.filter((task) => task.dueDate < today || task.status !== 'PENDING');
    const closedWeeks = weekList.filter((week) => week.weekEnd < today && week.rate !== null);

    return {
      year: selectedYear,
      availableYears,
      member,
      totals: {
        ...statsOf(pastTasks),
        perfectWeeks: closedWeeks.filter((week) => week.rate === 1).length,
        weeksWithTasks: closedWeeks.length,
      },
      weeks: weekList,
    };
  },
};
