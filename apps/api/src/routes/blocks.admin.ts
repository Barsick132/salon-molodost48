/**
 * Admin blocks CRUD — landing-page sections.
 *
 * Block.payload shape varies per `type`:
 *   hero        { eyebrow, title, lead, primaryCtaLabel, primaryCtaHref,
 *                 secondaryCtaLabel, secondaryCtaHref }
 *   stats       { items: [{ value, label }] }
 *   advantages  { items: [{ icon, title, description }] }
 *   cta-strip   { eyebrow, title, lead, ctaLabel, ctaHref }
 *
 *   GET    /api/admin/blocks              — list
 *   POST   /api/admin/blocks              — create
 *   PATCH  /api/admin/blocks/:id          — update (incl. payload + order + enabled)
 *   DELETE /api/admin/blocks/:id          — delete
 *   POST   /api/admin/blocks/reorder      — { orderedIds: string[] }
 *   POST   /api/admin/blocks/reset-defaults — wipe + reseed
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

function js(s: z.ZodType): unknown {
  return zodToJsonSchema(s, { target: 'jsonSchema7' });
}

const Item3 = z.object({
  icon: z.string().max(20).default(''),
  title: z.string().max(120),
  description: z.string().max(400),
});
const ItemValue = z.object({
  value: z.string().max(20),
  label: z.string().max(120),
});

const Hero = z.object({
  eyebrow: z.string().max(80).default(''),
  // Headline is split into three pieces so the editor can style the middle
  // one as an accent (different color, italic, gradient, etc.). For simple
  // cases, leave accent empty and just fill titleBefore / titleAfter.
  titleBefore: z.string().max(120).default(''),
  titleAccent:  z.string().max(120).default(''),
  titleAfter:   z.string().max(120).default(''),
  // Legacy single-string title (kept for back-compat with older records).
  title: z.string().max(300).default(''),
  lead: z.string().max(500).default(''),
  primaryCtaLabel: z.string().max(40).default('Записаться'),
  primaryCtaHref: z.string().max(500).default(''),
  secondaryCtaLabel: z.string().max(40).default(''),
  secondaryCtaHref: z.string().max(500).default(''),
  imageUrl: z.string().max(1000).default(''),
  // Overlay opacity (0..100) over the image so the foreground text stays
  // legible on lighter photos. Defaults to 55 (darken ~55%).
  imageOverlay: z.number().int().min(0).max(100).default(55),
  // Optional vertical anchor for the foreground block:
  //   'top' / 'center' / 'bottom'
  textAlign: z.enum(['top', 'center', 'bottom']).default('center'),
  // Optional horizontal anchor:
  //   'left' / 'center' / 'right'
  textAlignHorizontal: z.enum(['left', 'center', 'right']).default('center'),
  // Optional sticky-bottom scroll cue (the "↓" chevron)
  showScrollCue: z.boolean().default(true),
  // Show the colour-tinted gradient overlay over the hero photo.
  // Default true - most photos need a scrim to keep the foreground
  // text legible. Set false for high-contrast photos where the
  // overlay would be redundant.
  showOverlay: z.boolean().default(true),
});
const Stats = z.object({
  items: z.array(ItemValue).min(1).max(8),
});
const Advantages = z.object({
  items: z.array(Item3).min(1).max(8),
});
const CtaStrip = z.object({
  eyebrow: z.string().max(80).default(''),
  title: z.string().max(200),
  lead: z.string().max(400).default(''),
  ctaLabel: z.string().max(40).default('Записаться онлайн'),
  ctaHref: z.string().max(500).default(''),
});

const BaseBlock = z.object({
  type: z.enum(['hero', 'stats', 'advantages', 'cta-strip']),
  enabled: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

// Payload is intentionally typed as `z.unknown()` at the boundary; we validate
// inside the route by type to keep this schema lightweight.
const Create = BaseBlock.extend({
  payload: z.unknown(),
});

const Update = BaseBlock.partial().extend({
  payload: z.unknown().optional(),
});

const Reorder = z.object({
  orderedIds: z.array(z.string()).min(1),
});

// ----- Defaults -----

export const DEFAULT_BLOCKS: Array<{
  type: 'hero' | 'stats' | 'advantages' | 'cta-strip';
  payload: unknown;
}> = [
  {
    type: 'hero',
    payload: {
      eyebrow: 'Салон красоты в Липецке · с 2013 года',
      titleBefore: 'Красота — это ритуал',
      titleAccent: 'заботы о себе',
      titleAfter: '.',
      title: '',
      lead: 'Запишитесь онлайн, выберите мастера и удобное время. Мы рядом, в самом центре.',
      primaryCtaLabel: 'Записаться онлайн',
      primaryCtaHref: 'https://dikidi.ru/#widget=212727',
      secondaryCtaLabel: 'Узнать цены',
      secondaryCtaHref: '/services',
      imageUrl: '/media/hero-default.jpg',
      imageOverlay: 55,
      textAlign: 'center',
      textAlignHorizontal: 'center',
      showScrollCue: true,
      showOverlay: true,
    },
  },
  {
    type: 'stats',
    payload: {
      items: [
        { value: '12+', label: 'лет на рынке' },
        { value: '15 000+', label: 'довольных клиентов' },
        { value: '8', label: 'мастеров' },
        { value: '4.9', label: 'средний рейтинг' },
      ],
    },
  },
  {
    type: 'advantages',
    payload: {
      items: [
        { icon: 'tag', title: 'Без скрытых платежей', description: 'Цена в прайсе — окончательная. Без доплат и навязанных услуг.' },
        { icon: 'shield', title: 'Стерильные инструменты', description: 'Трёхступенчатая стерилизация после каждого клиента.' },
        { icon: 'clock', title: 'Гибкий график', description: 'Онлайн-запись в пару кликов в любое время суток.' },
        { icon: 'coffee', title: 'Уютная атмосфера', description: 'Чай, кофе, спокойная музыка и ни одного телефонного звонка.' },
      ],
    },
  },
  {
    type: 'cta-strip',
    payload: {
      eyebrow: 'Запись',
      title: 'Готовы записаться?',
      lead: 'Выберите услугу, мастера и удобное время — займёт меньше минуты.',
      ctaLabel: 'Записаться онлайн',
      ctaHref: 'https://dikidi.ru/#widget=212727',
    },
  },
];

export async function ensureDefaultBlocks(prisma: any) {
  const count = await prisma.block.count();
  if (count > 0) return;
  let order = 0;
  for (const b of DEFAULT_BLOCKS) {
    await prisma.block.create({
      data: {
        type: b.type,
        enabled: true,
        order: order++,
        payload: b.payload,
      },
    });
  }
}

// ----- Routes -----

const plugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.auth.requireAdmin);

  app.get('/blocks', async () => {
    const blocks = await app.prisma.block.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    return { blocks };
  });

  app.post('/blocks', {
    schema: { body: js(Create) },
  }, async (req, reply) => {
    const body = req.body as z.infer<typeof Create>;
    const validated = validatePayload(body.type, body.payload);
    if (!validated.ok) {
      reply.code(400).send({ error: { code: 'invalid_payload', message: validated.error } });
      return;
    }
    const created = await app.prisma.block.create({
      data: {
        type: body.type,
        enabled: body.enabled,
        order: body.order,
        payload: validated.payload as object,
      },
    });
    return { block: created };
  });

  app.patch<{ Params: { id: string } }>('/blocks/:id', {
    schema: { body: js(Update) },
  }, async (req, reply) => {
    const body = req.body as z.infer<typeof Update>;
    const existing = await app.prisma.block.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      reply.code(404).send({ error: { code: 'not_found', message: 'Блок не найден' } });
      return;
    }
    let payload = existing.payload as unknown;
    if (body.payload !== undefined) {
      const validated = validatePayload(existing.type as any, body.payload);
      if (!validated.ok) {
        reply.code(400).send({ error: { code: 'invalid_payload', message: validated.error } });
        return;
      }
      payload = validated.payload;
    }
    const updated = await app.prisma.block.update({
      where: { id: req.params.id },
      data: {
        ...(body.type    !== undefined ? { type: body.type } : {}),
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.order   !== undefined ? { order: body.order } : {}),
        payload: payload as object,
      },
    });
    return { block: updated };
  });

  app.delete<{ Params: { id: string } }>('/blocks/:id', async (req, reply) => {
    const existing = await app.prisma.block.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      reply.code(404).send({ error: { code: 'not_found', message: 'Блок не найден' } });
      return;
    }
    await app.prisma.block.delete({ where: { id: req.params.id } });
    return { ok: true };
  });

  app.post('/blocks/reorder', {
    schema: { body: js(Reorder) },
  }, async (req) => {
    const { orderedIds } = req.body as z.infer<typeof Reorder>;
    await app.prisma.$transaction(
      orderedIds.map((id, index) =>
        app.prisma.block.update({ where: { id }, data: { order: index } }),
      ),
    );
    return { ok: true };
  });

  app.post('/blocks/reset-defaults', async () => {
    await app.prisma.block.deleteMany({});
    await ensureDefaultBlocks(app.prisma);
    const blocks = await app.prisma.block.findMany({
      orderBy: [{ order: 'asc' }],
    });
    return { ok: true, blocks };
  });
};

function validatePayload(
  type: 'hero' | 'stats' | 'advantages' | 'cta-strip',
  raw: unknown,
): { ok: true; payload: unknown } | { ok: false; error: string } {
  const schema =
    type === 'hero' ? Hero :
    type === 'stats' ? Stats :
    type === 'advantages' ? Advantages : CtaStrip;
  const r = schema.safeParse(raw);
  if (!r.success) return { ok: false, error: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  return { ok: true, payload: r.data };
}

export default plugin;