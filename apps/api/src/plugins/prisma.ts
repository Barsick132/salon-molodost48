/**
 * Prisma plugin — registers a single PrismaClient on the Fastify instance,
 * attaches it as `app.prisma`, and ensures clean shutdown.
 */

import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

export const prismaPlugin = fp(async (app) => {
  const prisma = new PrismaClient({
    log: app.log.level === 'debug' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

  await prisma.$connect();

  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
}, { name: 'prisma' });