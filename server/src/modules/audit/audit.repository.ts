import type { Prisma } from '@prisma/client';
import type { Tx } from '../../lib/prisma.ts';

export type AuditAction =
  | 'MEMBER_ROLE_CHANGED'
  | 'MEMBER_DEACTIVATED'
  | 'MEMBER_REACTIVATED'
  | 'MEMBER_LEFT'
  | 'MEMBER_JOINED'
  | 'INVITATION_CREATED'
  | 'INVITATION_REVOKED'
  | 'PLAN_PAUSE_CREATED'
  | 'PLAN_PAUSE_UPDATED'
  | 'PLAN_PAUSE_DELETED'
  | 'HOUSEHOLD_UPDATED'
  | 'DATA_PURGE';

export const auditRepository = {
  record(
    tx: Tx,
    entry: {
      householdId: string;
      actorId: string | null;
      action: AuditAction;
      metadata: Prisma.InputJsonObject;
    },
  ) {
    return tx.auditLog.create({ data: entry });
  },
};
