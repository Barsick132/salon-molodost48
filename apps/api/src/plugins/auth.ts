/**
 * Auth plugin — JWT-cookie based admin authentication.
 *
 * Flow:
 *   - POST /api/admin/auth/login { email, password, remember? }
 *     → verify email+password, create AdminSession, sign JWT, set cookie
 *   - All other /api/admin/* routes use requireAdmin() preHandler
 *   - POST /api/admin/auth/logout → clear cookie, delete session row
 *
 * Tokens are sessionId-based (not userId-based) so logout revokes a token
 * by deleting the session row even if the JWT hasn't expired.
 *
 * Session TTLs:
 *   - remember=true  → 30 days  (sticky persistent cookie)
 *   - remember=false → 24 hours (still persistent, just short-lived)
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
const TTL_REMEMBER_DAYS = 30;
const TTL_DEFAULT_HOURS = 24;

function ttlSeconds(opts: { remember: boolean }) {
  return opts.remember ? TTL_REMEMBER_DAYS * 24 * 60 * 60 : TTL_DEFAULT_HOURS * 60 * 60;
}

function cookieMaxAge(remember: boolean) {
  return ttlSeconds({ remember });
}

export default fp(async (app) => {
  app.decorate('auth', {
    /**
     * Issue a session: write row, sign JWT, set HttpOnly cookie.
     * `remember` controls cookie persistence + JWT TTL (24h vs 30d).
     */
    async issueSession(
      reply: import('fastify').FastifyReply,
      user: AdminUser,
      meta: { ip?: string; ua?: string; request?: import('fastify').FastifyRequest; remember: boolean },
    ) {
      const ttlSec = ttlSeconds({ remember: meta.remember });
      const expiresAt = new Date(Date.now() + ttlSec * 1000);
      const session = await app.prisma.adminSession.create({
        data: { userId: user.id, expiresAt, ipAddress: meta.ip ?? null, userAgent: meta.ua ?? null },
      });
      // JWT expiry accepts seconds (numeric) or string ('7d'); we pass seconds
      const token = await reply.jwtSign({ sid: session.id }, { expiresIn: ttlSec });
      // Trust X-Forwarded-Proto via trustProxy (set at server level)
      const isHttps = meta.request?.protocol === 'https';
      reply.setCookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: isHttps,
        sameSite: 'lax',
        path: '/',
        maxAge: cookieMaxAge(meta.remember),
      });
      return session;
    },

    /** Read JWT from cookie, verify, look up session + user. */
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
  });
}, { name: 'auth', dependencies: ['prisma'] });