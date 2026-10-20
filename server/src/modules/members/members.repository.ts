import { MEMBER_COLORS, type Role } from '@homely/shared';
import { prisma, type Tx } from '../../lib/prisma.ts';

type Db = Tx | typeof prisma;

export const membersRepository = {
  /** v1: un usuario tiene como máximo una membresía activa. */
  findActiveByUser(userId: string, db: Db = prisma) {
    return db.membership.findFirst({
      where: { userId, isActive: true },
      include: { household: true },
    });
  },

  findInHousehold(householdId: string, id: string, db: Db = prisma) {
    return db.membership.findFirst({ where: { id, householdId } });
  },

  findByUserAndHousehold(userId: string, householdId: string, db: Db = prisma) {
    return db.membership.findUnique({ where: { userId_householdId: { userId, householdId } } });
  },

  list(householdId: string, includeInactive: boolean) {
    return prisma.membership.findMany({
      where: { householdId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ isActive: 'desc' }, { joinedAt: 'asc' }],
    });
  },

  countActiveAdmins(householdId: string, db: Db) {
    return db.membership.count({ where: { householdId, role: 'ADMIN', isActive: true } });
  },

  /** Primer color de la paleta que no use ya un miembro activo; si se agotan, rota. */
  async nextColor(householdId: string, db: Db): Promise<string> {
    const taken = await db.membership.findMany({
      where: { householdId, isActive: true },
      select: { color: true },
    });
    const used = new Set(taken.map((m) => m.color));
    return (
      MEMBER_COLORS.find((color) => !used.has(color)) ??
      MEMBER_COLORS[taken.length % MEMBER_COLORS.length] ??
      MEMBER_COLORS[0]
    );
  },

  update(
    id: string,
    data: { displayName?: string; color?: string; role?: Role; isActive?: boolean },
    db: Db = prisma,
  ) {
    return db.membership.update({ where: { id }, data });
  },

  /** PL-08: los planes cuyo responsable fijo se desactiva quedan sin asignar. */
  unassignPlans(membershipId: string, db: Db) {
    return db.taskPlan.updateMany({
      where: { assigneeId: membershipId },
      data: { assigneeId: null },
    });
  },
};
