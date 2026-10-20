import { z } from 'zod';
import { PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT } from '../constants.ts';

/** Día calendario sin hora, `YYYY-MM-DD`. Se interpreta en la zona horaria del hogar. */
export const isoDateSchema = z.iso.date({ error: 'Usa el formato AAAA-MM-DD' });
export type IsoDate = z.infer<typeof isoDateSchema>;

/** Monto positivo con hasta 2 decimales, transportado como string para no perder precisión. */
export const moneySchema = z
  .string()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, { error: 'Monto inválido' })
  .refine((value) => Number(value) > 0, { error: 'El monto debe ser mayor que 0' });
export type Money = z.infer<typeof moneySchema>;

export const idSchema = z.string().min(1).max(64);

export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, { error: 'Color inválido' });

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(PAGINATION_MAX_LIMIT).default(PAGINATION_DEFAULT_LIMIT),
  cursor: idSchema.optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type Paginated<T> = { items: T[]; nextCursor: string | null };

export const dateRangeSchema = z
  .object({ from: isoDateSchema, to: isoDateSchema })
  .refine(({ from, to }) => from <= to, {
    error: 'La fecha inicial debe ser anterior a la final',
    path: ['to'],
  });
export type DateRange = z.infer<typeof dateRangeSchema>;
