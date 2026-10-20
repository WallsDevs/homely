import {
  CATEGORY_ICONS,
  type Category,
  type CategoryRef,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from '@homely/shared';
import { Prisma, type ExpenseCategory } from '@prisma/client';
import type { HouseholdCtx } from '../../lib/context.ts';
import { AppError } from '../../lib/errors.ts';
import { withoutUndefined } from '../../lib/objects.ts';
import { prisma } from '../../lib/prisma.ts';

/** El icono se valida al guardar; una fila con un icono desconocido se muestra como «ellipsis». */
function iconOf(raw: string): Category['icon'] {
  return CATEGORY_ICONS.find((icon) => icon === raw) ?? 'ellipsis';
}

export function toCategoryRef(
  row: Pick<ExpenseCategory, 'id' | 'name' | 'color' | 'icon'>,
): CategoryRef {
  return { id: row.id, name: row.name, color: row.color, icon: iconOf(row.icon) };
}

export function toCategory(row: ExpenseCategory): Category {
  return { ...toCategoryRef(row), sortOrder: row.sortOrder, isArchived: row.isArchived };
}

const duplicateName = () => AppError.conflict('CONFLICT', 'Ya existe una categoría con ese nombre');

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** Categoría del hogar utilizable en un gasto o una meta (existe y no está archivada). */
export async function assertUsableCategory(householdId: string, categoryId: string) {
  const category = await prisma.expenseCategory.findFirst({
    where: { id: categoryId, householdId, isArchived: false },
  });
  if (!category) throw AppError.validation({ categoryId: ['Elige una categoría válida'] });
  return category;
}

export const categoriesService = {
  async list(ctx: HouseholdCtx, includeArchived: boolean): Promise<Category[]> {
    const rows = await prisma.expenseCategory.findMany({
      where: { householdId: ctx.householdId, ...(includeArchived ? {} : { isArchived: false }) },
      orderBy: [{ isArchived: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toCategory);
  },

  async create(ctx: HouseholdCtx, input: CreateCategoryInput): Promise<Category> {
    const last = await prisma.expenseCategory.aggregate({
      where: { householdId: ctx.householdId },
      _max: { sortOrder: true },
    });
    try {
      const row = await prisma.expenseCategory.create({
        data: {
          ...input,
          householdId: ctx.householdId,
          sortOrder: (last._max.sortOrder ?? -1) + 1,
        },
      });
      return toCategory(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw duplicateName();
      throw error;
    }
  },

  /** EX-04: las categorías no se borran, se archivan, para no perder el historial de gastos. */
  async update(ctx: HouseholdCtx, id: string, input: UpdateCategoryInput): Promise<Category> {
    const current = await prisma.expenseCategory.findFirst({
      where: { id, householdId: ctx.householdId },
    });
    if (!current) throw AppError.notFound('Categoría');
    try {
      const row = await prisma.expenseCategory.update({
        where: { id },
        data: withoutUndefined(input),
      });
      return toCategory(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw duplicateName();
      throw error;
    }
  },

  async reorder(ctx: HouseholdCtx, ids: string[]): Promise<Category[]> {
    const owned = await prisma.expenseCategory.count({
      where: { householdId: ctx.householdId, id: { in: ids } },
    });
    if (owned !== new Set(ids).size) throw AppError.validation({ ids: ['Categorías inválidas'] });

    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.expenseCategory.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    return this.list(ctx, true);
  },
};
