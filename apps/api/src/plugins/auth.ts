/**
 * Auth plugin — provides requireAdmin() route hook.
 * TODO: full implementation: JWT issuance, refresh, CSRF, password hashing.
 * For now provides a stub so admin route handlers compile and typecheck.
 */

import fp from 'fastify-plugin';

export default fp(async (app) => {
  app.decorate('auth', {
    async requireAdmin(req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) {
      // Stub: in real implementation, verify JWT cookie, look up user, populate req.adminUser.
      // Until implemented, all admin routes are unreachable in production.
      if (app.config.NODE_ENV === 'production') {
        reply.code(401).send({ error: { code: 'unauthorized', message: 'Auth not yet implemented' } });
        return;
      }
      // Dev fallback: pretend there's a logged-in admin
      (req as { adminUser?: unknown }).adminUser = {
        id: 'dev-admin',
        email: 'admin@local',
        role: 'admin',
      };
    },
  });
}, { name: 'auth' });