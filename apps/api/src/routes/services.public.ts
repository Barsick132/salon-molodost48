/**
 * Public services endpoints — used by the public site's /services page.
 *
 * GET /api/services                — list all active categories with active services
 * GET /api/services/:categorySlug  — single category with services
 *
 * No auth required. Response shape mirrors @molodost/shared ServiceCategory + Service.
 */

import type { FastifyInstance } from 'fastify';

export default async function publicServicesRoutes(app: FastifyInstance) {
  // GET /api/services
  app.get('/services', async () => {
    const categories = await app.prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        services: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });
    return {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        description: c.description,
        order: c.order,
        isActive: c.isActive,
        services: c.services.map((s) => ({
          id: s.id,
          categoryId: s.categoryId,
          name: s.name,
          description: s.description,
          priceFrom: s.priceFrom,
          priceTo: s.priceTo,
          durationMinutes: s.durationMinutes,
          isPopular: s.isPopular,
          isActive: s.isActive,
          order: s.order,
        })),
      })),
    };
  });

  // GET /api/services/:categorySlug
  app.get<{ Params: { categorySlug: string } }>(
    '/services/:categorySlug',
    async (req, reply) => {
      const category = await app.prisma.serviceCategory.findUnique({
        where: { slug: req.params.categorySlug },
        include: {
          services: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
          },
        },
      });
      if (!category || !category.isActive) {
        reply.code(404).send({ error: { code: 'not_found', message: 'Category not found' } });
        return;
      }
      return {
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          description: category.description,
          order: category.order,
          isActive: category.isActive,
          services: category.services.map((s) => ({
            id: s.id,
            categoryId: s.categoryId,
            name: s.name,
            description: s.description,
            priceFrom: s.priceFrom,
            priceTo: s.priceTo,
            durationMinutes: s.durationMinutes,
            isPopular: s.isPopular,
            isActive: s.isActive,
            order: s.order,
          })),
        },
      };
    },
  );
}