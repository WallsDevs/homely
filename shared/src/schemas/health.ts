import { z } from 'zod';

export const healthResponseSchema = z.object({
  ok: z.boolean(),
  version: z.string(),
  db: z.enum(['ok', 'down']),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
