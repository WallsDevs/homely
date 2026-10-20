import { createHash, randomBytes, randomInt } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { INVITATION_CODE_ALPHABET } from '@homely/shared';

// argon2id con los parámetros mínimos recomendados por OWASP: 19 MiB, 2 iteraciones, 1 hilo.
const ARGON2_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password);
}

let dummyHash: Promise<string> | undefined;

/**
 * Verifica contra un hash ficticio cuando el correo no existe, para que el tiempo de respuesta
 * del login no revele qué correos están registrados.
 */
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword('homely-timing-equalizer');
  await verify(await dummyHash, password);
}

/** Token opaco de 256 bits, apto para URLs y cookies. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** 8 caracteres sin ambigüedades (sin 0/O/1/I). ~40 bits de entropía. */
export function generateInvitationCode(): string {
  return Array.from(
    { length: 8 },
    () => INVITATION_CODE_ALPHABET[randomInt(INVITATION_CODE_ALPHABET.length)],
  ).join('');
}
