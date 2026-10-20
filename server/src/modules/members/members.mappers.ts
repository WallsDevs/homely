import type { Household, Member } from '@homely/shared';
import type { Household as HouseholdRow, Membership } from '@prisma/client';

export function toMember(row: Membership): Member {
  return {
    id: row.id,
    userId: row.userId,
    displayName: row.displayName,
    color: row.color,
    avatarUrl: row.avatarUrl,
    role: row.role,
    isActive: row.isActive,
    joinedAt: row.joinedAt.toISOString(),
  };
}

export function toHousehold(row: HouseholdRow): Household {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency,
    timezone: row.timezone,
    weekStartsOn: row.weekStartsOn,
  };
}
