/**
 * Auth plugin — JWT-cookie based admin authentication.
 *
 * Flow:
 *   - POST /api/admin/auth/login: verify email+password, create AdminSession,
 *     sign JWT { sessionId }, set HttpOnly cookie 'molodost48_session'
 *   - All other /api/admin/* routes use requireAdmin() preHandler:
 *     verify JWT, load session+user, populate req.adminUser, 401 if invalid
 *   - POST /api/admin/auth/logout: clear cookie, delete session row
 *
 * Tokens are sessionId-based (not userId-based) so logout can revoke a token
 * by deleting the session row even if the JWT hasn't expired yet.
 */

import fp from 'fastify-plugin';
import type { AdminUser } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    adminUser?: Pick<AdminUser, 'id' | 'email' | 'displayName' | 'role'>;
    adminSessionId?: string;
  }
}

const COOKIE_NAME = 'molodost48_session';
const SESSION_TTL_DAYS = 7;

function buildCookieOpts(opts: { secure: boolean; sameSite?: 'lax' | 'strict' | 'none' }) {
  return {
    httpOnly: true,
    secure: opts.secure,
    sameSite: opts.sameSite ?? 'lax',
    path: '/',
    signed: false, // JWT itself is signed; no need to sign cookie too
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  } as const;
}

export default fp(async (app) => {
  const secure = app.config.NODE_ENV === 'production';
  const cookieOpts = buildCookieOpts({ secure });

  app.decorate('auth', {
    /** Issue a session: write row, sign JWT, set cookie. */
    async issueSession(reply: import('fastify').FastifyReply, user: AdminUser, meta: { ip?: string; ua?: string }) {
      const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
      const session = await app.prisma.adminSession.create({
        data: { userId: user.id, expiresAt, ipAddress: meta.ip ?? null, userAgent: meta.ua ?? null },
      });
      const token = await reply.jwtSign({ sid: session.id }, { expiresIn: `${SESSION_TTL_DAYS}d` });
      reply.setCookie(COOKIE_NAME, token, cookieOpts);
      return session;
    },

    /** Read JWT from cookie, verify, look up session + user. Rejects if session revoked. */
    async verifySession(req: import('fastify').FastifyRequest) {
      const token = req.cookies[COOKIE_NAME];
      if (!token) return null;
      let payload: { sid: string };
      try {
        payload = app.jwt.verify<{ sid: string }>(token);
      } catch {
        return null;
      }
      const session = await app.prisma.adminSession.findUnique({
        where: { id: payload.sid },
        include: { user: true },
      });
      if (!session) return null;
      if (session.expiresAt < new Date()) return null;
      if (!session.user.isActive) return null;
      return { session, user: session.user };
    },

    /** Pre-handler hook: require valid admin session, populate req.adminUser. */
    async requireAdmin(req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) {
      const result = await app.auth.verifySession(req);
      if (!result) {
        reply.code(401).send({ error: { code: 'unauthorized', message: 'Authentication required' } });
        return reply;
      }
      req.adminUser = {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        role: result.user.role,
      };
      req.adminSessionId = result.session.id;
    },

    /** Clear cookie + delete session row. */
    async revokeSession(req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) {
      if (req.adminSessionId) {
        await app.prisma.adminSession.delete({ where: { id: req.adminSessionId } }).catch(() => {});
      }
      reply.clearCookie(COOKIE_NAME, { path: '/' });
    },

    cookieName: COOKIE_NAME,
    sessionTtlDays: SESSION_TTL_DAYS,
    cookieOpts,
  });
}, { name: 'auth', dependencies: ['prisma'] });