import { z } from 'zod';
import { WEEKDAYS } from '../enums.ts';

function isValidTimeZone(timeZone: string): boolean {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone }).resolvedOptions().timeZone !== '';
  } catch {
    return false;
  }
}

export const timezoneSchema = z
  .string()
  .min(1)
  .max(64)
  .refine(isValidTimeZone, { error: 'Zona horaria inválida' });

export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, { error: 'Moneda inválida' });

export const weekdaySchema = z.enum(WEEKDAYS);

export const householdNameSchema = z
  .string()
  .trim()
  .min(1, { error: 'Escribe un nombre para el hogar' })
  .max(60, { error: 'Máximo 60 caracteres' });

export const createHouseholdSchema = z.object({
  name: householdNameSchema,
  currency: currencySchema.default('USD'),
  timezone: timezoneSchema,
  weekStartsOn: weekdaySchema.default('MON'),
});
export type CreateHouseholdInput = z.input<typeof createHouseholdSchema>;

export const updateHouseholdSchema = z
  .object({
    name: householdNameSchema,
    currency: currencySchema,
    timezone: timezoneSchema,
    weekStartsOn: weekdaySchema,
  })
  .partial();
export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>;

/** Acepta el código con o sin guion, en mayúsculas o minúsculas: `k7mp-qw3r` → `K7MPQW3R`. */
export const invitationCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((value) => value.replace(/[^A-Z0-9]/g, ''))
  .pipe(z.string().length(8, { error: 'El código tiene 8 caracteres' }));

export const joinHouseholdSchema = z.object({ code: invitationCodeSchema });
export type JoinHouseholdInput = z.input<typeof joinHouseholdSchema>;

export const householdSchema = z.object({
  id: z.string(),
  name: z.string(),
  currency: z.string(),
  timezone: z.string(),
  weekStartsOn: weekdaySchema,
});
export type Household = z.infer<typeof householdSchema>;
