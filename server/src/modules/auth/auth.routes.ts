import type { AuthOptions, AuthResponse, RefreshResponse } from '@homely/shared';
import { loginSchema, registerSchema } from '@homely/shared';
import { Router, type Request } from 'express';
import { env } from '../../config/env.ts';
import { authOf } from '../../lib/context.ts';
import { AppError } from '../../lib/errors.ts';
import { endpoint } from '../../lib/endpoint.ts';
import { requireAuth } from '../../middlewares/auth.ts';
import { strictRateLimit } from '../../middlewares/rate-limit.ts';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from './auth.cookies.ts';
import { authService } from './auth.service.ts';

export const authRouter = Router();

const userAgentOf = (req: Request) => req.get('user-agent') ?? null;

authRouter.get(
  '/options',
  endpoint({}, (_input, _req, res) => {
    const options: AuthOptions = { registrationOpen: env.REGISTRATION_ENABLED };
    res.json(options);
  }),
);

authRouter.post(
  '/register',
  strictRateLimit,
  endpoint({ body: registerSchema }, async ({ body }, req, res) => {
    // Se valida aquí, en el servidor: ocultar el botón en la web no impediría llamar a la API.
    if (!env.REGISTRATION_ENABLED) {
      throw new AppError(
        'REGISTRATION_CLOSED',
        403,
        'El registro de cuentas nuevas está cerrado por ahora',
      );
    }
    const { tokens, session } = await authService.register(body, userAgentOf(req));
    setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiresAt);
    const response: AuthResponse = { accessToken: tokens.accessToken, session };
    res.status(201).json(response);
  }),
);

authRouter.post(
  '/login',
  strictRateLimit,
  endpoint({ body: loginSchema }, async ({ body }, req, res) => {
    const { tokens, session } = await authService.login(body, userAgentOf(req));
    setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiresAt);
    const response: AuthResponse = { accessToken: tokens.accessToken, session };
    res.json(response);
  }),
);

authRouter.post(
  '/refresh',
  endpoint({}, async (_input, req, res) => {
    try {
      const tokens = await authService.refresh(readRefreshCookie(req), userAgentOf(req));
      setRefreshCookie(res, tokens.refreshToken, tokens.refreshExpiresAt);
      const response: RefreshResponse = { accessToken: tokens.accessToken };
      res.json(response);
    } catch (error) {
      clearRefreshCookie(res);
      throw error;
    }
  }),
);

authRouter.post(
  '/logout',
  endpoint({}, async (_input, req, res) => {
    await authService.logout(readRefreshCookie(req));
    clearRefreshCookie(res);
    res.status(204).end();
  }),
);

authRouter.post(
  '/logout-all',
  requireAuth,
  endpoint({}, async (_input, req, res) => {
    await authService.logoutAll(authOf(req).userId);
    clearRefreshCookie(res);
    res.status(204).end();
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  endpoint({}, async (_input, req, res) => {
    res.json(await authService.session(authOf(req).userId));
  }),
);
