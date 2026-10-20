import { z } from 'zod';
import { WEEKDAYS } from '../enums.ts';
import { idSchema, isoDateSchema } from './common.ts';
import { weekdaySchema } from './household.ts';
import { taskMemberSchema, taskPrioritySchema, taskSchema } from './task.ts';

/** Días de la semana sin repetir y en orden lunes → domingo. */
export const weekdaysSchema = z
  .array(weekdaySchema)
  .min(1, { error: 'Elige al menos un día' })
  .transform((days) => WEEKDAYS.filter((day) => days.includes(day)));

const titleSchema = z
  .string()
  .trim()
  .min(1, { error: 'Escribe qué hay que hacer' })
  .max(120, { error: 'Máximo 120 caracteres' });

const descriptionSchema = z
  .string()
  .trim()
  .max(1000, { error: 'Máximo 1000 caracteres' })
  .nullable()
  .transform((value) => (value === '' ? null : value));

/** Fecha opcional: vacío = sin límite. */
const optionalDaySchema = z
  .union([isoDateSchema, z.literal(''), z.null()])
  .transform((value) => (value === '' ? null : value));

const planFields = {
  title: titleSchema,
  description: descriptionSchema,
  priority: taskPrioritySchema,
  weekdays: weekdaysSchema,
  /** Responsable fijo. `null` = las tareas se generan sin asignar. */
  assigneeId: idSchema.nullable(),
  startsOn: optionalDaySchema,
  endsOn: optionalDaySchema,
};

function rangeIsValid(value: {
  startsOn?: string | null | undefined;
  endsOn?: string | null | undefined;
}): boolean {
  return !value.startsOn || !value.endsOn || value.startsOn <= value.endsOn;
}
const rangeError = { error: 'La fecha final debe ser posterior a la inicial', path: ['endsOn'] };

export const createPlanSchema = z
  .object({
    ...planFields,
    description: planFields.description.optional(),
    priority: planFields.priority.default('MEDIUM'),
    startsOn: planFields.startsOn.optional(),
    endsOn: planFields.endsOn.optional(),
  })
  .refine(rangeIsValid, rangeError);
export type CreatePlanInput = z.input<typeof createPlanSchema>;

export const updatePlanSchema = z.object(planFields).partial().refine(rangeIsValid, rangeError);
export type UpdatePlanInput = z.input<typeof updatePlanSchema>;

export const planSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  priority: taskPrioritySchema,
  weekdays: z.array(weekdaySchema),
  assignee: taskMemberSchema.nullable(),
  isActive: z.boolean(),
  startsOn: z.string().nullable(),
  endsOn: z.string().nullable(),
  /** Próximo día (desde hoy) en que el plan genera una tarea. `null` si ya no genera más. */
  nextDueDate: z.string().nullable(),
  createdAt: z.string(),
});
export type Plan = z.infer<typeof planSchema>;

export const plansResponseSchema = z.object({ items: z.array(planSchema) });

export const planDetailSchema = z.object({
  plan: planSchema,
  /** Próximas tareas pendientes ya generadas por este plan. */
  upcoming: z.array(taskSchema),
});
export type PlanDetail = z.infer<typeof planDetailSchema>;

export const planIdParamsSchema = z.object({ id: idSchema });

export const setPlanActiveSchema = z.object({ isActive: z.boolean() });
