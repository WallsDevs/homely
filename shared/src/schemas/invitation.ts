import { z } from 'zod';
import { INVITATION_DEFAULT_TTL_DAYS } from '../constants.ts';
import { idSchema } from './common.ts';
import { roleSchema } from './member.ts';

export const createInvitationSchema = z.object({
  role: roleSchema.default('MEMBER'),
  expiresInDays: z.number().int().min(1).max(30).default(INVITATION_DEFAULT_TTL_DAYS),
  maxUses: z.number().int().min(1).max(10).default(1),
});
export type CreateInvitationInput = z.input<typeof createInvitationSchema>;

export const INVITATION_STATUSES = ['ACTIVE', 'EXPIRED', 'REVOKED', 'USED'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const invitationSchema = z.object({
  id: z.string(),
  /** Formateado para mostrar: `K7MP-QW3R`. */
  code: z.string(),
  role: roleSchema,
  expiresAt: z.string(),
  maxUses: z.number(),
  usedCount: z.number(),
  status: z.enum(INVITATION_STATUSES),
  createdAt: z.string(),
});
export type Invitation = z.infer<typeof invitationSchema>;

export const invitationsResponseSchema = z.object({ items: z.array(invitationSchema) });

export const invitationIdParamsSchema = z.object({ id: idSchema });

export function formatInvitationCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
