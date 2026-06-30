/**
 * molodost48 api entry.
 *
 * Boots Fastify, registers plugins and routes, starts listening.
 * Run with: node --import tsx/esm src/index.ts
 */

import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { config } from './config.js';
import { prismaPlugin } from './plugins/prisma.js';
import integrationsPlugin from './plugins/integrations.js';
import authPlugin from './plugins/auth.js';
import publicIntegrationsRoutes from './routes/integrations.public.js';
import adminIntegrationsRoutes from './routes/integrations.admin.js';

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
    trustProxy: true,
    bodyLimit: config.MAX_UPLOAD_BYTES,
  });

  // Security headers
  await app.register(fastifyHelmet, { contentSecurityPolicy: false });

  // CORS
  if (config.CORS_ORIGINS.length > 0) {
    await app.register(fastifyCors, {
      origin: config.CORS_ORIGINS,
      credentials: true,
    });
  }

  // Cookies + JWT
  await app.register(fastifyCookie, { secret: config.COOKIE_SECRET });
  await app.register(fastifyJwt, { secret: config.JWT_SECRET });

  // Rate limiting (apply only to API, generous limits)
  await app.register(fastifyRateLimit, {
    max: 600,
    timeWindow: '1 minute',
  });

  // Static (uploaded media) — served from /media
  await app.register(fastifyStatic, {
    root: config.MEDIA_ROOT,
    prefix: `${config.MEDIA_PUBLIC_BASE}/`,
    decorateReply: false,
  });

  // Plugins
  await app.register(prismaPlugin);
  await app.register(integrationsPlugin);
  await app.register(authPlugin);

  // Routes
  await app.register(publicIntegrationsRoutes, { prefix: '/api' });
  await app.register(adminIntegrationsRoutes, { prefix: '/api/admin' });

  // Health endpoint
  app.get('/healthz', async () => ({ status: 'ok', ts: new Date().toISOString() }));
  app.get('/readyz', async () => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', db: 'ok', ts: new Date().toISOString() };
    } catch (err) {
      return { status: 'not-ready', db: 'fail', error: String(err), ts: new Date().toISOString() };
    }
  });

  return app;
}

async function main() {
  const app = await buildApp();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down…`);
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`molodost48-api listening on http://${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Last deployed: 2026-06-30T01:10

// Last updated: 2026-06-30 10:02 MSK (post secret fix)
