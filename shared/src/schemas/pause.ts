import { z } from 'zod';
import { idSchema, isoDateSchema } from './common.ts';
import { taskMemberSchema } from './task.ts';

export const PAUSE_SCOPES = ['HOUSEHOLD', 'MEMBER', 'PLAN'] as const;
export type PauseScope = (typeof PAUSE_SCOPES)[number];

const reasonSchema = z
  .string()
  .trim()
  .max(80, { error: 'Máximo 80 caracteres' })
  .nullable()
  .transform((value) => (value === '' ? null : value));

const rangeIsValid = (value: { startsOn?: string | undefined; endsOn?: string | undefined }) =>
  !value.startsOn || !value.endsOn || value.startsOn <= value.endsOn;
const rangeError = { error: 'La fecha final debe ser posterior a la inicial', path: ['endsOn'] };

/** PL-09: una pausa tiene un solo alcance: hogar (sin ids), persona (`memberId`) o plan (`planId`). */
export const createPauseSchema = z
  .object({
    startsOn: isoDateSchema,
    endsOn: isoDateSchema,
    memberId: idSchema.nullable().optional(),
    planId: idSchema.nullable().optional(),
    reason: reasonSchema.optional(),
  })
  .refine(rangeIsValid, rangeError)
  .refine((value) => !(value.memberId && value.planId), {
    error: 'Elige pausar a una persona o un plan, no ambos',
    path: ['planId'],
  });
export type CreatePauseInput = z.input<typeof createPauseSchema>;

/** El alcance no se edita: para cambiarlo se elimina la pausa y se crea otra. */
export const updatePauseSchema = z
  .object({ startsOn: isoDateSchema, endsOn: isoDateSchema, reason: reasonSchema })
  .partial()
  .refine(rangeIsValid, rangeError);
export type UpdatePauseInput = z.input<typeof updatePauseSchema>;

export const pauseSchema = z.object({
  id: z.string(),
  scope: z.enum(PAUSE_SCOPES),
  member: taskMemberSchema.nullable(),
  plan: z.object({ id: z.string(), title: z.string() }).nullable(),
  startsOn: z.string(),
  endsOn: z.string(),
  reason: z.string().nullable(),
  /** Según hoy en la zona del hogar. Las ya terminadas no se devuelven. */
  status: z.enum(['ACTIVE', 'UPCOMING']),
  createdAt: z.string(),
});
export type Pause = z.infer<typeof pauseSchema>;

export const pausesResponseSchema = z.object({ items: z.array(pauseSchema) });

export const pauseIdParamsSchema = z.object({ id: idSchema });

export function pauseScopeOf(pause: {
  memberId: string | null;
  planId: string | null;
}): PauseScope {
  if (pause.planId) return 'PLAN';
  if (pause.memberId) return 'MEMBER';
  return 'HOUSEHOLD';
}
