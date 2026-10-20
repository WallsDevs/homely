import type { Member, Role, UpdateMeInput } from '@homely/shared';
import type { HouseholdCtx } from '../../lib/context.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma, type Tx } from '../../lib/prisma.ts';
import { auditRepository } from '../audit/audit.repository.ts';
import { toMember } from './members.mappers.ts';
import { membersRepository } from './members.repository.ts';

/*
 * Las operaciones que pueden dejar al hogar sin admin corren en transacciones `Serializable`:
 * si dos admins se degradan mutuamente a la vez, una de las dos transacciones falla en lugar de
 * dejar el hogar sin ningún admin.
 */
const SERIALIZABLE = { isolationLevel: 'Serializable' } as const;

async function assertNotLastAdmin(tx: Tx, householdId: string): Promise<void> {
  const admins = await membersRepository.countActiveAdmins(householdId, tx);
  if (admins <= 1) {
    throw AppError.conflict(
      'LAST_ADMIN',
      'El hogar debe tener al menos un administrador. Nombra a otro admin primero.',
    );
  }
}

async function findTarget(tx: Tx, ctx: HouseholdCtx, memberId: string) {
  const target = await membersRepository.findInHousehold(ctx.householdId, memberId, tx);
  if (!target) throw AppError.notFound('Miembro');
  return target;
}

/** Solo se asigna trabajo (o un pago) a miembros activos del mismo hogar. */
export async function assertAssignable(
  householdId: string,
  memberId: string | null | undefined,
  field = 'assigneeId',
): Promise<void> {
  if (!memberId) return;
  const member = await membersRepository.findInHousehold(householdId, memberId);
  if (!member?.isActive) {
    throw AppError.validation({ [field]: ['Elige un miembro activo del hogar'] });
  }
}

export const membersService = {
  async list(ctx: HouseholdCtx, includeInactive: boolean): Promise<Member[]> {
    const rows = await membersRepository.list(ctx.householdId, includeInactive);
    return rows.map(toMember);
  },

  async updateMe(ctx: HouseholdCtx, input: UpdateMeInput): Promise<Member> {
    const row = await membersRepository.update(ctx.membershipId, {
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    });
    return toMember(row);
  },

  changeRole(ctx: HouseholdCtx, memberId: string, role: Role): Promise<Member> {
    return prisma.$transaction(async (tx) => {
      const target = await findTarget(tx, ctx, memberId);
      if (target.role === role) return toMember(target);

      if (target.role === 'ADMIN' && target.isActive) {
        await assertNotLastAdmin(tx, ctx.householdId);
      }

      const updated = await membersRepository.update(target.id, { role }, tx);
      await auditRepository.record(tx, {
        householdId: ctx.householdId,
        actorId: ctx.membershipId,
        action: 'MEMBER_ROLE_CHANGED',
        metadata: { memberId: target.id, from: target.role, to: role },
      });
      return toMember(updated);
    }, SERIALIZABLE);
  },

  setActive(ctx: HouseholdCtx, memberId: string, isActive: boolean): Promise<Member> {
    return prisma.$transaction(async (tx) => {
      const target = await findTarget(tx, ctx, memberId);
      if (target.isActive === isActive) return toMember(target);

      if (!isActive) {
        if (target.role === 'ADMIN') await assertNotLastAdmin(tx, ctx.householdId);
        await membersRepository.unassignPlans(target.id, tx);
      }

      const updated = await membersRepository.update(target.id, { isActive }, tx);
      await auditRepository.record(tx, {
        householdId: ctx.householdId,
        actorId: ctx.membershipId,
        action: isActive ? 'MEMBER_REACTIVATED' : 'MEMBER_DEACTIVATED',
        metadata: { memberId: target.id },
      });
      return toMember(updated);
    }, SERIALIZABLE);
  },

  /** Salir del hogar = desactivar la propia membresía. Conserva el historial. */
  leave(ctx: HouseholdCtx): Promise<void> {
    return prisma.$transaction(async (tx) => {
      if (ctx.role === 'ADMIN') await assertNotLastAdmin(tx, ctx.householdId);
      await membersRepository.unassignPlans(ctx.membershipId, tx);
      await membersRepository.update(ctx.membershipId, { isActive: false }, tx);
      await auditRepository.record(tx, {
        householdId: ctx.householdId,
        actorId: ctx.membershipId,
        action: 'MEMBER_LEFT',
        metadata: {},
      });
    }, SERIALIZABLE);
  },
};
