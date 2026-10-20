import { z } from 'zod';
import { CATEGORY_ICONS, GOAL_EXCEEDED_RATIO, GOAL_WARNING_RATIO } from '../constants.ts';
import { GOAL_PERIODS, GOAL_STATUSES, PAYMENT_METHODS, type GoalStatus } from '../enums.ts';
import {
  hexColorSchema,
  idSchema,
  isoDateSchema,
  moneySchema,
  paginationQuerySchema,
} from './common.ts';
import { taskMemberSchema } from './task.ts';

// ───────── Categorías ─────────

export const categoryIconSchema = z.enum(CATEGORY_ICONS);

const categoryNameSchema = z
  .string()
  .trim()
  .min(1, { error: 'Escribe un nombre' })
  .max(40, { error: 'Máximo 40 caracteres' });

export const createCategorySchema = z.object({
  name: categoryNameSchema,
  color: hexColorSchema,
  icon: categoryIconSchema,
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z
  .object({
    name: categoryNameSchema,
    color: hexColorSchema,
    icon: categoryIconSchema,
    isArchived: z.boolean(),
  })
  .partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const reorderCategoriesSchema = z.object({ ids: z.array(idSchema).min(1).max(100) });

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  icon: categoryIconSchema,
  sortOrder: z.number(),
  isArchived: z.boolean(),
});
export type Category = z.infer<typeof categorySchema>;

export const categoriesResponseSchema = z.object({ items: z.array(categorySchema) });

export const listCategoriesQuerySchema = z.object({
  includeArchived: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

/** Versión corta de la categoría dentro de un gasto o una meta. */
export const categoryRefSchema = categorySchema.pick({
  id: true,
  name: true,
  color: true,
  icon: true,
});
export type CategoryRef = z.infer<typeof categoryRefSchema>;

// ───────── Gastos ─────────

export const paymentMethodSchema = z.enum(PAYMENT_METHODS);

const descriptionSchema = z
  .string()
  .trim()
  .max(200, { error: 'Máximo 200 caracteres' })
  .nullable()
  .transform((value) => (value === '' ? null : value));

export const createExpenseSchema = z.object({
  amount: moneySchema,
  categoryId: idSchema,
  date: isoDateSchema,
  description: descriptionSchema.optional(),
  paymentMethod: paymentMethodSchema.nullable().optional(),
  /** Quién puso el dinero. Por defecto, quien lo registra. */
  paidById: idSchema.nullable().optional(),
});
export type CreateExpenseInput = z.input<typeof createExpenseSchema>;

export const updateExpenseSchema = z
  .object({
    amount: moneySchema,
    categoryId: idSchema,
    date: isoDateSchema,
    description: descriptionSchema,
    paymentMethod: paymentMethodSchema.nullable(),
    paidById: idSchema.nullable(),
  })
  .partial();
export type UpdateExpenseInput = z.input<typeof updateExpenseSchema>;

export const expenseSchema = z.object({
  id: z.string(),
  /** String decimal con 2 cifras: `"60.00"`. */
  amount: z.string(),
  date: z.string(),
  description: z.string().nullable(),
  paymentMethod: paymentMethodSchema.nullable(),
  category: categoryRefSchema,
  paidBy: taskMemberSchema.nullable(),
  registeredBy: taskMemberSchema.nullable(),
  createdAt: z.string(),
});
export type Expense = z.infer<typeof expenseSchema>;

export const expenseIdParamsSchema = z.object({ id: idSchema });

function csvIds() {
  return z
    .string()
    .transform((raw) => raw.split(',').filter(Boolean))
    .pipe(z.array(idSchema).min(1).max(50));
}

export const listExpensesQuerySchema = paginationQuerySchema.extend({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  categoryId: csvIds().optional(),
  paidById: z.union([z.literal('none'), idSchema]).optional(),
  paymentMethod: paymentMethodSchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export type ListExpensesQuery = z.input<typeof listExpensesQuerySchema>;

export const expensesPageSchema = z.object({
  items: z.array(expenseSchema),
  nextCursor: z.string().nullable(),
  /** Totales de todo el filtro (no solo de esta página). */
  totals: z.object({ count: z.number(), amount: z.string() }),
});
export type ExpensesPage = z.infer<typeof expensesPageSchema>;

// ───────── Metas ─────────

export const goalPeriodSchema = z.enum(GOAL_PERIODS);
export const goalStatusSchema = z.enum(GOAL_STATUSES);

/** EX-06: OK < 80 %, WARNING 80–100 %, EXCEEDED > 100 %. */
export function goalStatusOf(ratio: number): GoalStatus {
  if (ratio > GOAL_EXCEEDED_RATIO) return 'EXCEEDED';
  if (ratio >= GOAL_WARNING_RATIO) return 'WARNING';
  return 'OK';
}

export const createGoalSchema = z.object({
  /** `null` = meta del total del hogar. */
  categoryId: idSchema.nullable(),
  period: goalPeriodSchema,
  amount: moneySchema,
});
export type CreateGoalInput = z.infer<typeof createGoalSchema>;

export const updateGoalSchema = z.object({ amount: moneySchema }).partial();
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

export const goalProgressSchema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
  spent: z.string(),
  ratio: z.number(),
  status: goalStatusSchema,
});
export type GoalProgress = z.infer<typeof goalProgressSchema>;

export const goalSchema = z.object({
  id: z.string(),
  category: categoryRefSchema.nullable(),
  period: goalPeriodSchema,
  amount: z.string(),
  progress: goalProgressSchema,
});
export type Goal = z.infer<typeof goalSchema>;

export const goalsResponseSchema = z.object({ items: z.array(goalSchema) });

export const goalIdParamsSchema = z.object({ id: idSchema });

// ───────── Resumen (dashboard) ─────────

export const expenseSummaryQuerySchema = z.object({
  period: goalPeriodSchema.default('MONTHLY'),
  /** Cualquier día del periodo. Por defecto, hoy. */
  date: isoDateSchema.optional(),
});

export const expenseSummarySchema = z.object({
  period: goalPeriodSchema,
  periodStart: z.string(),
  periodEnd: z.string(),
  total: z.string(),
  /** Total del periodo anterior equivalente, para comparar. */
  previousTotal: z.string(),
  byCategory: z.array(z.object({ category: categoryRefSchema, amount: z.string() })),
  byPayer: z.array(z.object({ member: taskMemberSchema.nullable(), amount: z.string() })),
  goals: z.array(goalSchema),
});
export type ExpenseSummary = z.infer<typeof expenseSummarySchema>;
