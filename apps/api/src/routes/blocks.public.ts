/**
 * Public blocks — landing page composition source.
 *
 *   GET /api/blocks      → all enabled blocks, ordered
 *   GET /api/blocks/:type → single block by type (used by individual sections
 *                          that may be queried independently — e.g. a hero
 *                          rendered on a stripped-down page)
 */

import type { FastifyPluginAsync } from 'fastify';

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/blocks', async (_req, reply) => {
    reply.header('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    const blocks = await app.prisma.block.findMany({
      where: { enabled: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, type: true, payload: true, order: true },
    });
    return { blocks };
  });
};

export default plugin;