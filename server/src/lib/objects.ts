type Defined<T> = { [K in keyof T]?: Exclude<T[K], undefined> };

/**
 * Quita las claves con valor `undefined`. Con `exactOptionalPropertyTypes`, Prisma distingue
 * "campo ausente" (no tocar) de `undefined`; así un PATCH parcial se pasa tal cual.
 */
export function withoutUndefined<T extends object>(value: T): Defined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Defined<T>;
}
