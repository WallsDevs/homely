import { Prisma } from '@prisma/client';
import type { Money } from '@homely/shared';

/** En BD el dinero es `Decimal(12,2)`; en la API viaja como string con 2 decimales. */
export function toMoney(value: Prisma.Decimal | null | undefined): Money {
  return (value ?? new Prisma.Decimal(0)).toFixed(2);
}

export function toDecimal(value: Money): Prisma.Decimal {
  return new Prisma.Decimal(value);
}
