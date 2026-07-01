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
    // Cache-Control: short max-age so admin edits propagate within a
    // few seconds. Was max-age=30 which made the live-edit feel
    // flaky — refresh after a PATCH in the admin would sometimes
    // return the old payload from the browser cache. 5s + SWR keeps
    // production traffic warm (the same /api/blocks response is
    // reused for 5s by any concurrent visitor) while letting the
    // admin see their change on the next refresh.
    reply.header('Cache-Control', 'public, max-age=5, stale-while-revalidate=60');
    const blocks = await app.prisma.block.findMany({
      where: { enabled: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, type: true, payload: true, order: true },
    });
    return { blocks };
  });
};

export default plugin;