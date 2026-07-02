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
  // Headline is split into two pieces so the editor can style the second
  // one as an accent (different color, italic, gradient, etc.). For
  // simple cases, leave accent empty and just fill titleBefore.
  // Legacy single-string 'title' is still accepted and merged with
  // titleBefore if titleBefore is empty.
  titleBefore: z.string().max(120).default(''),
  titleAccent:  z.string().max(120).default(''),
  title: z.string().max(300).default(''),
  lead: z.string().max(500).default(''),
  primaryCtaLabel: z.string().max(40).default('Записаться'),
  primaryCtaHref: z.string().max(500).default(''),
  secondaryCtaLabel: z.string().max(40).default(''),
  secondaryCtaHref: z.string().max(500).default(''),
  imageUrl: z.string().max(1000).default(''),
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
      // Eyebrow: ёмкий credibility marker. Год основания салона = доверие,
      // подаём как факт, а не как постскриптум. UPPERCASE, но без воды.
      eyebrow: 'Липецк · с 2013',
      // Headline split. titleBefore — обычное начертание (бренд стоит прямо,
      // это имя собственное, не стилистический приём). titleAccent — italic
      // + accent gradient, завершает фразу с жестом послевкусия.
      titleBefore: 'Молодость — это не возраст.',
      titleAccent: 'Это состояние.',
      title: '',
      // Lead: НЕ дублирует primary CTA («Записаться онлайн» уже в кнопке).
      // Вместо этого — категории услуг и контекст «где»: тихий двор, центр.
      lead: 'Стрижки, уход, маникюр, косметология. В самом центре Липецка — тихий двор, без спешки.',
      primaryCtaLabel: 'Записаться онлайн',
      primaryCtaHref: 'https://dikidi.ru/#widget=212727',
      // Secondary CTA: ведёт на контакты (где нас найти), а не на услуги —
      // «Узнать цены» звучит как «где-то спрятано», а нам нужно действие.
      secondaryCtaLabel: 'Как нас найти',
      secondaryCtaHref: '/contacts',
      imageUrl: '/media/hero-default.jpg',
      textAlign: 'center',
      textAlignHorizontal: 'left',
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
      // Merge the patch over the existing payload BEFORE validating.
      // Without this merge, every Zod default (`.default('')`) would
      // blank out fields the editor didn't bother to re-send (e.g.
      // imageUrl) on every save — a classic footgun.
      const merged = { ...((existing.payload as object) ?? {}), ...(body.payload as object) };
      const validated = validatePayload(existing.type as any, merged);
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