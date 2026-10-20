import { randomUUID } from 'node:crypto';
import type { LoginInput, RegisterInput, Session } from '@homely/shared';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env.ts';
import {
  hashPassword,
  randomToken,
  sha256,
  verifyAgainstDummy,
  verifyPassword,
} from '../../lib/crypto.ts';
import { AppError } from '../../lib/errors.ts';
import { signAccessToken } from '../../lib/jwt.ts';
import { toHousehold, toMember } from '../members/members.mappers.ts';
import { membersRepository } from '../members/members.repository.ts';
import { authRepository } from './auth.repository.ts';

const DAY_MS = 86_400_000;

export type IssuedTokens = { accessToken: string; refreshToken: string; refreshExpiresAt: Date };

async function issueTokens(
  userId: string,
  userAgent: string | null,
  familyId: string = randomUUID(),
): Promise<IssuedTokens> {
  const refreshToken = randomToken();
  const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TTL_DAYS * DAY_MS);
  await authRepository.createRefreshToken({
    userId,
    tokenHash: sha256(refreshToken),
    familyId,
    expiresAt: refreshExpiresAt,
    userAgent: userAgent?.slice(0, 255) ?? null,
  });
  return { accessToken: signAccessToken(userId), refreshToken, refreshExpiresAt };
}

const invalidSession = () => AppError.unauthenticated('Tu sesión expiró. Inicia sesión de nuevo.');

export const authService = {
  async register(input: RegisterInput, userAgent: string | null) {
    const passwordHash = await hashPassword(input.password);
    try {
      const user = await authRepository.createUser({
        email: input.email,
        name: input.name,
        passwordHash,
      });
      return {
        tokens: await issueTokens(user.id, userAgent),
        session: await this.session(user.id),
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw AppError.conflict('EMAIL_TAKEN', 'Ya existe una cuenta con ese correo');
      }
      throw error;
    }
  },

  async login(input: LoginInput, userAgent: string | null) {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user) {
      await verifyAgainstDummy(input.password);
      throw new AppError('INVALID_CREDENTIALS', 401, 'Correo o contraseña incorrectos');
    }
    if (!(await verifyPassword(user.passwordHash, input.password))) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Correo o contraseña incorrectos');
    }
    return { tokens: await issueTokens(user.id, userAgent), session: await this.session(user.id) };
  },

  /**
   * Rotación de refresh token. Cada uso emite uno nuevo de la misma familia y revoca el anterior.
   * Si llega un token ya revocado, alguien lo copió: se revoca toda la familia.
   */
  async refresh(refreshToken: string | undefined, userAgent: string | null): Promise<IssuedTokens> {
    if (!refreshToken) throw invalidSession();

    const stored = await authRepository.findRefreshToken(sha256(refreshToken));
    if (!stored) throw invalidSession();

    if (stored.revokedAt) {
      await authRepository.revokeFamily(stored.familyId);
      throw invalidSession();
    }
    if (stored.expiresAt <= new Date()) throw invalidSession();

    // Dos peticiones simultáneas con el mismo token: solo una gana la revocación.
    if ((await authRepository.revokeIfActive(stored.id)) === 0) {
      await authRepository.revokeFamily(stored.familyId);
      throw invalidSession();
    }
    return issueTokens(stored.userId, userAgent, stored.familyId);
  },

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const stored = await authRepository.findRefreshToken(sha256(refreshToken));
    if (stored) await authRepository.revokeIfActive(stored.id);
  },

  async logoutAll(userId: string): Promise<void> {
    await authRepository.revokeAllForUser(userId);
  },

  async session(userId: string): Promise<Session> {
    const [user, membership] = await Promise.all([
      authRepository.findUserById(userId),
      membersRepository.findActiveByUser(userId),
    ]);
    if (!user) throw invalidSession();

    return {
      user: { id: user.id, email: user.email, name: user.name },
      membership: membership ? toMember(membership) : null,
      household: membership ? toHousehold(membership.household) : null,
    };
  },
};
