import { z } from 'zod';
import { dateRangeSchema, idSchema, isoDateSchema } from './common.ts';
import { expenseSummarySchema } from './expense.ts';
import { taskMemberSchema } from './task.ts';

/** RP-01: contadores de tareas. `rate` = hechas / (asignadas − omitidas); `null` si no hubo nada. */
export const taskStatsSchema = z.object({
  assigned: z.number(),
  done: z.number(),
  pending: z.number(),
  skipped: z.number(),
  rate: z.number().nullable(),
});
export type TaskStats = z.infer<typeof taskStatsSchema>;

export const memberWeekSchema = taskStatsSchema.extend({
  member: taskMemberSchema,
  /** RP-03: diferencia de `rate` con la semana anterior (−1…1). */
  deltaRate: z.number().nullable(),
  /** RP-05: semanas cerradas seguidas al 100 %. */
  streak: z.number(),
});
export type MemberWeek = z.infer<typeof memberWeekSchema>;

export const weeklyReportQuerySchema = z.object({ week: isoDateSchema.optional() });

export const weeklyReportSchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  today: z.string(),
  /** La semana ya terminó: sus pendientes son incumplidas. */
  isClosed: z.boolean(),
  household: taskStatsSchema.extend({ deltaRate: z.number().nullable() }),
  members: z.array(memberWeekSchema),
  expenses: expenseSummarySchema,
});
export type WeeklyReport = z.infer<typeof weeklyReportSchema>;

/** RP-04: tareas que más se dejan sin hacer. */
export const topMissedQuerySchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
  memberId: idSchema.optional(),
});

export const topMissedSchema = z.object({
  items: z.array(z.object({ title: z.string(), missed: z.number() })),
});
export type TopMissed = z.infer<typeof topMissedSchema>;

/** RP-10 / RP-11: historial de un miembro, semana a semana, del año pedido. */
export const historyQuerySchema = z.object({
  memberId: idSchema,
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const historyWeekSchema = taskStatsSchema.extend({
  weekStart: z.string(),
  weekEnd: z.string(),
  /** Títulos de las tareas que quedaron sin hacer esa semana. */
  missed: z.array(z.string()),
});
export type HistoryWeek = z.infer<typeof historyWeekSchema>;

export const historySchema = z.object({
  year: z.number(),
  availableYears: z.array(z.number()),
  member: taskMemberSchema,
  totals: taskStatsSchema.extend({ perfectWeeks: z.number(), weeksWithTasks: z.number() }),
  /** De la más reciente a la más antigua. */
  weeks: z.array(historyWeekSchema),
});
export type History = z.infer<typeof historySchema>;

// ───────── Mantenimiento (RP-12 … RP-15) ─────────

export const purgePreviewSchema = z.object({
  tasks: z.number(),
  expenses: z.number(),
  amount: z.string(),
});
export type PurgePreview = z.infer<typeof purgePreviewSchema>;

export const purgeRangeSchema = dateRangeSchema;

export const purgeSchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
    /** Debe coincidir con el nombre del hogar. */
    confirmation: z.string().trim().min(1, { error: 'Escribe el nombre del hogar' }),
  })
  .refine(({ from, to }) => from <= to, {
    error: 'La fecha inicial debe ser anterior a la final',
    path: ['to'],
  });
export type PurgeInput = z.input<typeof purgeSchema>;

export const auditEntrySchema = z.object({
  id: z.string(),
  action: z.string(),
  actor: taskMemberSchema.nullable(),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const auditLogSchema = z.object({
  items: z.array(auditEntrySchema),
  nextCursor: z.string().nullable(),
});
