import type { IsoDate } from '@homely/shared';
import type { PlanPause } from '@prisma/client';
import { fromDbDate, toDbDate } from '../../lib/dates.ts';
import { prisma, type Tx } from '../../lib/prisma.ts';

/** Lo mínimo de una pausa para decidir si aplica. Fechas como días ISO. */
export type PauseRule = {
  memberId: string | null;
  planId: string | null;
  startsOn: IsoDate;
  endsOn: IsoDate;
};

export type PausablePlan = { id: string; assigneeId: string | null };

export function toPauseRule(row: PlanPause): PauseRule {
  return {
    memberId: row.memberId,
    planId: row.planId,
    startsOn: fromDbDate(row.startsOn),
    endsOn: fromDbDate(row.endsOn),
  };
}

/** ¿Alguna pausa detiene a este plan en este día? (PL-09) */
export function isPaused(pauses: readonly PauseRule[], plan: PausablePlan, day: IsoDate): boolean {
  return pauses.some(
    (pause) =>
      day >= pause.startsOn &&
      day <= pause.endsOn &&
      (pause.planId !== null
        ? pause.planId === plan.id
        : pause.memberId !== null
          ? pause.memberId === plan.assigneeId
          : true),
  );
}

/** Pausas del hogar que tocan el rango `[from, to]`. */
export async function pausesOverlapping(
  householdId: string,
  from: IsoDate,
  to: IsoDate,
  db: Tx | typeof prisma = prisma,
): Promise<PauseRule[]> {
  const rows = await db.planPause.findMany({
    where: { householdId, startsOn: { lte: toDbDate(to) }, endsOn: { gte: toDbDate(from) } },
  });
  return rows.map(toPauseRule);
}
