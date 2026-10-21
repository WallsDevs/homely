import { z } from 'zod';
import { householdSchema } from './household.ts';
import { memberSchema } from './member.ts';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Escribe un correo válido' }).max(254));

export const passwordSchema = z
  .string()
  .min(8, { error: 'Usa al menos 8 caracteres' })
  .max(128, { error: 'Máximo 128 caracteres' });

export const personNameSchema = z
  .string()
  .trim()
  .min(1, { error: 'Escribe tu nombre' })
  .max(60, { error: 'Máximo 60 caracteres' });

export const registerSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: 'Escribe tu contraseña' }).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});
export type User = z.infer<typeof userSchema>;

/** Lo que la app necesita al arrancar: quién soy y, si tengo, mi hogar y mi membresía. */
export const sessionSchema = z.object({
  user: userSchema,
  membership: memberSchema.nullable(),
  household: householdSchema.nullable(),
});
export type Session = z.infer<typeof sessionSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  session: sessionSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const refreshResponseSchema = z.object({ accessToken: z.string() });
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

/** Opciones públicas de autenticación, para que la UI sepa qué mostrar. */
export const authOptionsSchema = z.object({ registrationOpen: z.boolean() });
export type AuthOptions = z.infer<typeof authOptionsSchema>;
