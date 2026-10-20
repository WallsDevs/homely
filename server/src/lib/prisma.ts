import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({ log: ['warn', 'error'] });

/** Cliente de transacción, para pasar a repositorios que deben correr dentro de `$transaction`. */
export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
