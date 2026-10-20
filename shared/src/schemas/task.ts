import { z } from 'zod';
import { TASK_ORIGINS, TASK_PRIORITIES, TASK_STATUSES } from '../enums.ts';
import { idSchema, isoDateSchema, paginationQuerySchema } from './common.ts';

export const taskPrioritySchema = z.enum(TASK_PRIORITIES);
export const taskStatusSchema = z.enum(TASK_STATUSES);
export const taskOriginSchema = z.enum(TASK_ORIGINS);

const titleSchema = z
  .string()
  .trim()
  .min(1, { error: 'Escribe qué hay que hacer' })
  .max(120, { error: 'Máximo 120 caracteres' });

/** Texto opcional: vacío se guarda como `null`. */
const descriptionSchema = z
  .string()
  .trim()
  .max(1000, { error: 'Máximo 1000 caracteres' })
  .nullable()
  .transform((value) => (value === '' ? null : value));

export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  /** `null` = sin asignar. */
  assigneeId: idSchema.nullable(),
  dueDate: isoDateSchema,
  priority: taskPrioritySchema.default('MEDIUM'),
});
export type CreateTaskInput = z.input<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema,
    assigneeId: idSchema.nullable(),
    dueDate: isoDateSchema,
    priority: taskPrioritySchema,
  })
  .partial();
export type UpdateTaskInput = z.input<typeof updateTaskSchema>;

export const taskMemberSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  color: z.string(),
});
export type TaskMember = z.infer<typeof taskMemberSchema>;

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  priority: taskPrioritySchema,
  status: taskStatusSchema,
  origin: taskOriginSchema,
  planId: z.string().nullable(),
  dueDate: z.string(),
  assignee: taskMemberSchema.nullable(),
  completedBy: taskMemberSchema.nullable(),
  completedAt: z.string().nullable(),
  /** TK-05: pendiente con fecha anterior a hoy (en la zona del hogar). Se calcula, no se guarda. */
  isOverdue: z.boolean(),
  createdAt: z.string(),
});
export type Task = z.infer<typeof taskSchema>;

export const taskIdParamsSchema = z.object({ id: idSchema });

/** `status=PENDING,DONE` → `['PENDING', 'DONE']`. */
function csvOf<T extends readonly [string, ...string[]]>(values: T) {
  return z
    .string()
    .transform((raw) => raw.split(',').filter(Boolean))
    .pipe(z.array(z.enum(values)).min(1));
}

export const listTasksQuerySchema = paginationQuerySchema.extend({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  /** `none` = sin asignar. */
  assigneeId: z.union([z.literal('none'), idSchema]).optional(),
  status: csvOf(TASK_STATUSES).optional(),
  origin: taskOriginSchema.optional(),
  priority: taskPrioritySchema.optional(),
  q: z.string().trim().min(1).max(100).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});
export type ListTasksQuery = z.input<typeof listTasksQuerySchema>;

export const tasksPageSchema = z.object({
  items: z.array(taskSchema),
  nextCursor: z.string().nullable(),
});
export type TasksPage = z.infer<typeof tasksPageSchema>;

/** TK-06: las tareas del miembro autenticado. */
export const myTasksSchema = z.object({
  date: z.string(),
  weekStart: z.string(),
  weekEnd: z.string(),
  overdue: z.array(taskSchema),
  today: z.array(taskSchema),
  /** Resto de la semana, después de hoy. */
  upcoming: z.array(taskSchema),
});
export type MyTasks = z.infer<typeof myTasksSchema>;

export const boardQuerySchema = z.object({
  /** Cualquier día de la semana a mostrar. Por defecto, hoy. */
  week: isoDateSchema.optional(),
});

export const boardColumnSchema = z.object({
  /** `null` = columna de tareas sin asignar. */
  member: taskMemberSchema.extend({ isActive: z.boolean() }).nullable(),
  tasks: z.array(taskSchema),
  /** Tareas que cuentan para el cumplimiento (excluye omitidas). */
  total: z.number(),
  done: z.number(),
});
export type BoardColumn = z.infer<typeof boardColumnSchema>;

/** TK-07: la semana del hogar agrupada por miembro. */
export const boardSchema = z.object({
  date: z.string(),
  weekStart: z.string(),
  weekEnd: z.string(),
  columns: z.array(boardColumnSchema),
});
export type Board = z.infer<typeof boardSchema>;
