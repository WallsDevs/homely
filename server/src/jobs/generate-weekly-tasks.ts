import { schedule } from 'node-cron';
import { logger } from '../lib/logger.ts';
import { prisma } from '../lib/prisma.ts';
import { materializeCurrentWeek } from '../modules/plans/plan-generation.ts';

/**
 * PL-02: asegura que cada hogar tenga generadas las tareas de su semana actual.
 * Corre cada hora porque cada hogar tiene su propia zona horaria e inicio de semana: así, a más
 * tardar una hora después de que empiece la semana de un hogar, sus tareas ya existen.
 * Es idempotente; además, las vistas generan de forma perezosa (PL-04) por si el job no corrió.
 */
export async function generateCurrentWeekForAllHouseholds(): Promise<number> {
  const households = await prisma.household.findMany({
    select: { id: true, timezone: true, weekStartsOn: true },
  });
  let created = 0;
  for (const household of households) {
    created += await materializeCurrentWeek(household);
  }
  return created;
}

async function run() {
  try {
    const created = await generateCurrentWeekForAllHouseholds();
    if (created > 0) logger.info({ created }, 'Tareas de planes generadas');
  } catch (error) {
    logger.error({ err: error }, 'Falló la generación semanal de tareas');
  }
}

/** Arranca el job y lo ejecuta una vez al iniciar. Devuelve la función para detenerlo. */
export function startWeeklyTasksJob(): () => void {
  const task = schedule('5 * * * *', () => void run());
  void run();
  return () => void task.stop();
}
