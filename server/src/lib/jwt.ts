import jwt from 'jsonwebtoken';
import { env } from '../config/env.ts';

const ALGORITHM = 'HS256';

export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    subject: userId,
    algorithm: ALGORITHM,
    // Validado por regex en env.ts (p. ej. "15m").
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'] & string,
  });
}

/** Devuelve el id de usuario si el token es válido y no expiró; `null` en cualquier otro caso. */
export function verifyAccessToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: [ALGORITHM] });
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
