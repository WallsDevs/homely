import type { Invitation, InvitationStatus } from '@homely/shared';
import { formatInvitationCode, type createInvitationSchema } from '@homely/shared';
import { Prisma, type Invitation as InvitationRow } from '@prisma/client';
import type { HouseholdCtx } from '../../lib/context.ts';
import { generateInvitationCode } from '../../lib/crypto.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma } from '../../lib/prisma.ts';
import { auditRepository } from '../audit/audit.repository.ts';

const DAY_MS = 86_400_000;
const LIST_LIMIT = 20;
const CODE_ATTEMPTS = 3;

type ParsedCreateInput = ReturnType<typeof createInvitationSchema.parse>;

function statusOf(row: InvitationRow, now: Date): InvitationStatus {
  if (row.revokedAt) return 'REVOKED';
  if (row.usedCount >= row.maxUses) return 'USED';
  if (row.expiresAt <= now) return 'EXPIRED';
  return 'ACTIVE';
}

function toInvitation(row: InvitationRow, now = new Date()): Invitation {
  return {
    id: row.id,
    code: formatInvitationCode(row.code),
    role: row.role,
    expiresAt: row.expiresAt.toISOString(),
    maxUses: row.maxUses,
    usedCount: row.usedCount,
    status: statusOf(row, now),
    createdAt: row.createdAt.toISOString(),
  };
}

export const invitationsService = {
  async list(ctx: HouseholdCtx): Promise<Invitation[]> {
    const rows = await prisma.invitation.findMany({
      where: { householdId: ctx.householdId },
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    });
    const now = new Date();
    return rows.map((row) => toInvitation(row, now));
  },

  /** HM-02. El código es aleatorio; ante la improbable colisión se reintenta. */
  async create(ctx: HouseholdCtx, input: ParsedCreateInput): Promise<Invitation> {
    const expiresAt = new Date(Date.now() + input.expiresInDays * DAY_MS);

    for (let attempt = 1; ; attempt++) {
      try {
        const row = await prisma.$transaction(async (tx) => {
          const created = await tx.invitation.create({
            data: {
              householdId: ctx.householdId,
              code: generateInvitationCode(),
              role: input.role,
              maxUses: input.maxUses,
              expiresAt,
              createdById: ctx.membershipId,
            },
          });
          await auditRepository.record(tx, {
            householdId: ctx.householdId,
            actorId: ctx.membershipId,
            action: 'INVITATION_CREATED',
            metadata: { invitationId: created.id, role: created.role },
          });
          return created;
        });
        return toInvitation(row);
      } catch (error) {
        const collision =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!collision || attempt >= CODE_ATTEMPTS) throw error;
      }
    }
  },

  async revoke(ctx: HouseholdCtx, id: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findFirst({
        where: { id, householdId: ctx.householdId },
      });
      if (!invitation) throw AppError.notFound('Invitación');
      if (invitation.revokedAt) return;

      await tx.invitation.update({ where: { id }, data: { revokedAt: new Date() } });
      await auditRepository.record(tx, {
        householdId: ctx.householdId,
        actorId: ctx.membershipId,
        action: 'INVITATION_REVOKED',
        metadata: { invitationId: id },
      });
    });
  },
};
