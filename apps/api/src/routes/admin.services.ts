/**
 * Admin services endpoints — CRUD for categories and services.
 *
 * Auth: all routes require admin session.
 *
 * Categories:
 *   GET    /api/admin/services/categories                 — list all (active + inactive)
 *   POST   /api/admin/services/categories                 — create
 *   PATCH  /api/admin/services/categories/:id             — update (name/icon/order/isActive)
 *   DELETE /api/admin/services/categories/:id             — delete (cascades services)
 *   POST   /api/admin/services/categories/reorder         — bulk reorder { orderedIds: string[] }
 *
 * Services:
 *   GET    /api/admin/services?categoryId=&includeInactive=
 *   POST   /api/admin/services
 *   PATCH  /api/admin/services/:id
 *   DELETE /api/admin/services/:id
 *   POST   /api/admin/services/reorder   — { orderedIds, categoryId? }
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

function js(s: z.ZodType): unknown {
  return zodToJsonSchema(s, { target: 'jsonSchema7' });
}

const CategoryCreate = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, 'Только строчные латиница, цифры и дефис'),
  icon: z.string().max(40).default(''),
  description: z.string().max(400).default(''),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

const CategoryUpdate = CategoryCreate.partial();

const CategoryReorder = z.object({
  orderedIds: z.array(z.string()).min(1),
});

const ServiceCreate = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(160),
  description: z.string().max(800).default(''),
  priceFrom: z.number().int().nonnegative().nullable().optional(),
  priceTo: z.number().int().nonnegative().nullable().optional(),
  durationMinutes: z.number().int().nonnegative().nullable().optional(),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
  externalId: z.string().max(120).nullable().optional(),
});

const ServiceUpdate = ServiceCreate.partial().omit({ categoryId: true });

const ServiceReorder = z.object({
  categoryId: z.string().min(1),
  orderedIds: z.array(z.string()).min(1),
});

export default async function adminServicesRoutes(app: FastifyInstance) {
  // Apply auth to all routes in this plugin
  app.addHook('preHandler', app.auth.requireAdmin);

  // ============================================================
  // CATEGORIES
  // ============================================================

  // GET /api/admin/services/categories
  app.get('/services/categories', async () => {
    const categories = await app.prisma.serviceCategory.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { services: true } },
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
        serviceCount: c._count.services,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    };
  });

  // POST /api/admin/services/categories
  app.post('/services/categories', {
    schema: { body: js(CategoryCreate) },
  }, async (req, reply) => {
    const body = req.body as z.infer<typeof CategoryCreate>;
    const existing = await app.prisma.serviceCategory.findUnique({ where: { slug: body.slug } });
    if (existing) {
      reply.code(409).send({ error: { code: 'slug_taken', message: 'Slug уже используется' } });
      return;
    }
    const created = await app.prisma.serviceCategory.create({
      data: {
        name: body.name,
        slug: body.slug,
        icon: body.icon,
        description: body.description,
        order: body.order,
        isActive: body.isActive,
      },
    });
    return {
      category: {
        id: created.id,
        name: created.name,
        slug: created.slug,
        icon: created.icon,
        description: created.description,
        order: created.order,
        isActive: created.isActive,
      },
    };
  });

  // PATCH /api/admin/services/categories/:id
  app.patch<{ Params: { id: string } }>('/services/categories/:id', {
    schema: { body: js(CategoryUpdate) },
  }, async (req, reply) => {
    const body = req.body as z.infer<typeof CategoryUpdate>;
    if (body.slug) {
      const conflict = await app.prisma.serviceCategory.findFirst({
        where: { slug: body.slug, NOT: { id: req.params.id } },
      });
      if (conflict) {
        reply.code(409).send({ error: { code: 'slug_taken', message: 'Slug уже используется' } });
        return;
      }
    }
    const updated = await app.prisma.serviceCategory.update({
      where: { id: req.params.id },
      data: body,
    });
    return {
      category: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        icon: updated.icon,
        description: updated.description,
        order: updated.order,
        isActive: updated.isActive,
      },
    };
  });

  // DELETE /api/admin/services/categories/:id
  app.delete<{ Params: { id: string } }>('/services/categories/:id', async (req, reply) => {
    const id = req.params.id;
    const existing = await app.prisma.serviceCategory.findUnique({
      where: { id },
      include: { _count: { select: { services: true } } },
    });
    if (!existing) {
      reply.code(404).send({ error: { code: 'not_found', message: 'Категория не найдена' } });
      return;
    }
    await app.prisma.serviceCategory.delete({ where: { id } });
    return { ok: true, deletedServices: existing._count.services };
  });

  // POST /api/admin/services/categories/reorder
  app.post('/services/categories/reorder', {
    schema: { body: js(CategoryReorder) },
  }, async (req) => {
    const { orderedIds } = req.body as z.infer<typeof CategoryReorder>;
    await app.prisma.$transaction(
      orderedIds.map((id, index) =>
        app.prisma.serviceCategory.update({ where: { id }, data: { order: index } }),
      ),
    );
    return { ok: true };
  });

  // ============================================================
  // SERVICES
  // ============================================================

  // GET /api/admin/services?categoryId=&includeInactive=
  app.get<{ Querystring: { categoryId?: string; includeInactive?: string } }>(
    '/services',
    async (req) => {
      const { categoryId, includeInactive } = req.query;
      const where: Record<string, unknown> = {};
      if (categoryId) where.categoryId = categoryId;
      if (includeInactive !== 'true') where.isActive = true;

      const services = await app.prisma.service.findMany({
        where,
        orderBy: [{ categoryId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
        include: { category: { select: { id: true, name: true, slug: true } } },
      });
      return {
        services: services.map((s) => ({
          id: s.id,
          categoryId: s.categoryId,
          category: s.category,
          name: s.name,
          description: s.description,
          priceFrom: s.priceFrom,
          priceTo: s.priceTo,
          durationMinutes: s.durationMinutes,
          isPopular: s.isPopular,
          isActive: s.isActive,
          order: s.order,
          externalId: s.externalId,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
      };
    },
  );

  // POST /api/admin/services
  app.post('/services', {
    schema: { body: js(ServiceCreate) },
  }, async (req, reply) => {
    const body = req.body as z.infer<typeof ServiceCreate>;
    const cat = await app.prisma.serviceCategory.findUnique({ where: { id: body.categoryId } });
    if (!cat) {
      reply.code(400).send({ error: { code: 'invalid_category', message: 'Категория не найдена' } });
      return;
    }
    const created = await app.prisma.service.create({
      data: {
        categoryId: body.categoryId,
        name: body.name,
        description: body.description ?? '',
        priceFrom: body.priceFrom ?? null,
        priceTo: body.priceTo ?? null,
        durationMinutes: body.durationMinutes ?? null,
        isPopular: body.isPopular,
        isActive: body.isActive,
        order: body.order,
        externalId: body.externalId ?? null,
      },
    });
    return { service: { id: created.id } };
  });

  // PATCH /api/admin/services/:id
  app.patch<{ Params: { id: string } }>('/services/:id', {
    schema: { body: js(ServiceUpdate) },
  }, async (req, reply) => {
    const body = req.body as z.infer<typeof ServiceUpdate>;
    const existing = await app.prisma.service.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      reply.code(404).send({ error: { code: 'not_found', message: 'Услуга не найдена' } });
      return;
    }
    const updated = await app.prisma.service.update({
      where: { id: req.params.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.priceFrom !== undefined ? { priceFrom: body.priceFrom } : {}),
        ...(body.priceTo !== undefined ? { priceTo: body.priceTo } : {}),
        ...(body.durationMinutes !== undefined ? { durationMinutes: body.durationMinutes } : {}),
        ...(body.isPopular !== undefined ? { isPopular: body.isPopular } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.order !== undefined ? { order: body.order } : {}),
        ...(body.externalId !== undefined ? { externalId: body.externalId } : {}),
      },
    });
    return { service: { id: updated.id } };
  });

  // DELETE /api/admin/services/:id
  app.delete<{ Params: { id: string } }>('/services/:id', async (req, reply) => {
    const existing = await app.prisma.service.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      reply.code(404).send({ error: { code: 'not_found', message: 'Услуга не найдена' } });
      return;
    }
    await app.prisma.service.delete({ where: { id: req.params.id } });
    return { ok: true };
  });

  // POST /api/admin/services/reorder
  app.post('/services/reorder', {
    schema: { body: js(ServiceReorder) },
  }, async (req) => {
    const { categoryId, orderedIds } = req.body as z.infer<typeof ServiceReorder>;
    await app.prisma.$transaction(
      orderedIds.map((id, index) =>
        app.prisma.service.update({ where: { id }, data: { order: index, categoryId } }),
      ),
    );
    return { ok: true };
  });
}