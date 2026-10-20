import { z } from 'zod';
import { ROLES } from '../enums.ts';
import { hexColorSchema, idSchema } from './common.ts';

export const roleSchema = z.enum(ROLES);

export const memberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  displayName: z.string(),
  color: z.string(),
  avatarUrl: z.string().nullable(),
  role: roleSchema,
  isActive: z.boolean(),
  joinedAt: z.string(),
});
export type Member = z.infer<typeof memberSchema>;

export const membersResponseSchema = z.object({ items: z.array(memberSchema) });

export const listMembersQuerySchema = z.object({
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export const memberIdParamsSchema = z.object({ id: idSchema });

export const updateMeSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, { error: 'Escribe un nombre' })
      .max(40, { error: 'Máximo 40 caracteres' }),
    color: hexColorSchema,
  })
  .partial();
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

export const updateRoleSchema = z.object({ role: roleSchema });
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const updateStatusSchema = z.object({ isActive: z.boolean() });
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
