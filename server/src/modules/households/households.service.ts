import type { Household, Session, UpdateHouseholdInput } from '@homely/shared';
import type { createHouseholdSchema } from '@homely/shared';
import type { AuthCtx, HouseholdCtx } from '../../lib/context.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma } from '../../lib/prisma.ts';
import { auditRepository } from '../audit/audit.repository.ts';
import { authService } from '../auth/auth.service.ts';
import { DEFAULT_CATEGORIES } from '../categories/default-categories.ts';
import { toHousehold } from '../members/members.mappers.ts';
import { membersRepository } from '../members/members.repository.ts';

type ParsedCreateInput = ReturnType<typeof createHouseholdSchema.parse>;

const alreadyInHousehold = () =>
  AppError.conflict('ALREADY_IN_HOUSEHOLD', 'Ya perteneces a un hogar');

const invalidInvitation = () =>
  new AppError('INVITATION_INVALID', 410, 'El código no es válido, expiró o ya se usó');

export const householdsService = {
  /** HM-01: crea el hogar, deja al creador como ADMIN y siembra las categorías. */
  async create(auth: AuthCtx, input: ParsedCreateInput): Promise<Session> {
    if (await membersRepository.findActiveByUser(auth.userId)) throw alreadyInHousehold();

    const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });

    await prisma.$transaction(async (tx) => {
      const household = await tx.household.create({
        data: {
          name: input.name,
          currency: input.currency,
          timezone: input.timezone,
          weekStartsOn: input.weekStartsOn,
        },
      });
      await tx.membership.create({
        data: {
          userId: user.id,
          householdId: household.id,
          role: 'ADMIN',
          displayName: user.name,
          color: await membersRepository.nextColor(household.id, tx),
        },
      });
      await tx.expenseCategory.createMany({
        data: DEFAULT_CATEGORIES.map((category, index) => ({
          ...category,
          householdId: household.id,
          sortOrder: index,
        })),
      });
    });

    return authService.session(auth.userId);
  },

  async current(ctx: HouseholdCtx): Promise<Household> {
    const row = await prisma.household.findUniqueOrThrow({ where: { id: ctx.householdId } });
    return toHousehold(row);
  },

  /** HM-07. Cambiar el inicio de semana solo afecta a la generación de semanas futuras. */
  async update(ctx: HouseholdCtx, input: UpdateHouseholdInput): Promise<Household> {
    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.household.update({
        where: { id: ctx.householdId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
          ...(input.weekStartsOn !== undefined ? { weekStartsOn: input.weekStartsOn } : {}),
        },
      });
      await auditRepository.record(tx, {
        householdId: ctx.householdId,
        actorId: ctx.membershipId,
        action: 'HOUSEHOLD_UPDATED',
        metadata: { changes: Object.keys(input) },
      });
      return updated;
    });
    return toHousehold(row);
  },

  /** HM-03: unirse con un código. Quien entra recibe el rol que trae el código. */
  async join(auth: AuthCtx, code: string): Promise<Session> {
    if (await membersRepository.findActiveByUser(auth.userId)) throw alreadyInHousehold();

    await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { code } });
      if (!invitation) throw invalidInvitation();

      // Consumo atómico: solo descuenta un uso si sigue vigente. Evita carreras con el último uso.
      const { count } = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          usedCount: { lt: invitation.maxUses },
        },
        data: { usedCount: { increment: 1 } },
      });
      if (count === 0) throw invalidInvitation();

      const user = await tx.user.findUniqueOrThrow({ where: { id: auth.userId } });
      const color = await membersRepository.nextColor(invitation.householdId, tx);
      const previous = await membersRepository.findByUserAndHousehold(
        auth.userId,
        invitation.householdId,
        tx,
      );

      // Si ya estuvo en este hogar, se reactiva su membresía y conserva su historial.
      const membership = previous
        ? await tx.membership.update({
            where: { id: previous.id },
            data: { isActive: true, role: invitation.role, color },
          })
        : await tx.membership.create({
            data: {
              userId: user.id,
              householdId: invitation.householdId,
              role: invitation.role,
              displayName: user.name,
              color,
            },
          });

      await auditRepository.record(tx, {
        householdId: invitation.householdId,
        actorId: membership.id,
        action: 'MEMBER_JOINED',
        metadata: { invitationId: invitation.id, role: invitation.role },
      });
    });

    return authService.session(auth.userId);
  },
};
