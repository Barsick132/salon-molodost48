/**
 * Fastify type augmentations — declares properties added by plugins
 * so that routes can reference `app.prisma`, `req.adminUser`, etc.
 * without TS errors while the actual plugin implementations land.
 */

import 'fastify';
import type { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * Prisma client — registered by `apps/api/src/plugins/prisma.ts`.
     */
    prisma: PrismaClient;

    /**
     * Integrations helpers — registered by `apps/api/src/plugins/integrations.ts`.
     */
    integrations: {
      getDikidi(): Promise<import('@molodost/shared').DikidiConfig>;
    };

    /**
     * Auth helpers — registered by `apps/api/src/plugins/auth.ts`.
     */
    auth: {
      requireAdmin(
        req: import('fastify').FastifyRequest,
        reply: import('fastify').FastifyReply,
      ): Promise<void>;
    };

    /**
     * Runtime config — registered by `apps/api/src/plugins/config.ts`.
     */
    config: import('../config.js').config;
  }

  interface FastifyRequest {
    /**
     * Populated by `app.auth.requireAdmin` after successful auth check.
     */
    adminUser?: {
      id: string;
      email: string;
      role: string;
    };
  }
}