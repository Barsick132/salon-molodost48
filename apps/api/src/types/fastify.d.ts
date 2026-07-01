/**
 * Fastify type augmentations — declares properties added by plugins
 * so that routes can reference `app.prisma`, `req.adminUser`, etc.
 * without TS errors while the actual plugin implementations land.
 */

import 'fastify';
import type { AdminUser } from '@prisma/client';
import type { PrismaClient, AdminSession } from '@prisma/client';

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
      verifySession(
        req: import('fastify').FastifyRequest,
      ): Promise<{ session: AdminSession; user: AdminUser } | null>;
      issueSession(
        reply: import('fastify').FastifyReply,
        user: AdminUser,
        meta: {
          ip?: string;
          ua?: string;
          request?: import('fastify').FastifyRequest;
          remember: boolean;
        },
      ): Promise<AdminSession>;
      revokeSession(
        req: import('fastify').FastifyRequest,
        reply: import('fastify').FastifyReply,
      ): Promise<void>;
      cookieName: string;
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
      displayName: string;
      role: string;
    };
    /**
     * Current session ID — populated by requireAdmin; used for revoke on logout.
     */
    adminSessionId?: string;
    /**
     * `@fastify/multipart` adds these to FastifyRequest at runtime; declaring
     * them here so route handlers can use them without TS errors.
     */
    isMultipart(): boolean;
    file(): Promise<{
      filename: string;
      mimetype: string;
      toBuffer(): Promise<Buffer>;
    } | undefined>;
  }
}