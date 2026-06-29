import { z } from 'zod';

/**
 * Landing page blocks. Each block is a row in DB with `type`, `enabled`, `order`, `payload`.
 * The admin toggles `enabled` and reorders; payload shape depends on type.
 *
 * Adding a new block:
 *   1. Add a new zod schema here.
 *   2. Add it to `BlockPayloadSchema` discriminated union.
 *   3. Run `pnpm db:migrate`.
 *   4. Implement the renderer on the public site and editor in admin.
 */
export const BlockType = z.enum([
  'hero',
  'about',
  'services',
  'masters',
  'promotions',
  'gallery',
  'rooms',
  'reviews',
  'faq',
  'vacancies',
  'contacts',
]);
export type BlockType = z.infer<typeof BlockType>;

export const HeroPayload = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(280).default(''),
  ctaLabel: z.string().max(40).default('Записаться'),
  ctaHref: z.string().max(500).default(''),
  backgroundImageId: z.string().nullable().default(null),
  slides: z
    .array(
      z.object({
        imageId: z.string().nullable(),
        title: z.string().max(120).default(''),
        subtitle: z.string().max(280).default(''),
        ctaLabel: z.string().max(40).default(''),
        ctaHref: z.string().max(500).default(''),
      }),
    )
    .max(8)
    .default([]),
});

export const AboutPayload = z.object({
  title: z.string().max(120).default('О салоне'),
  body: z.string().max(8000).default(''),
  advantages: z
    .array(
      z.object({
        icon: z.string().max(40).default(''),
        title: z.string().max(80),
        text: z.string().max(280).default(''),
      }),
    )
    .max(12)
    .default([]),
});

export const ServicesPayload = z.object({
  title: z.string().max(120).default('Услуги и цены'),
  showPrices: z.boolean().default(true),
  categoryIds: z.array(z.string()).default([]),
});

export const MastersPayload = z.object({
  title: z.string().max(120).default('Наши мастера'),
  masterIds: z.array(z.string()).default([]),
});

export const PromotionsPayload = z.object({
  title: z.string().max(120).default('Акции'),
  promotionIds: z.array(z.string()).default([]),
});

export const GalleryPayload = z.object({
  title: z.string().max(120).default('Наши работы'),
  categoryIds: z.array(z.string()).default([]),
});

export const RoomsPayload = z.object({
  title: z.string().max(120).default('Интерьер'),
  roomIds: z.array(z.string()).default([]),
});

export const ReviewsPayload = z.object({
  title: z.string().max(120).default('Отзывы'),
  count: z.number().int().min(1).max(50).default(6),
});

export const FaqPayload = z.object({
  title: z.string().max(120).default('Частые вопросы'),
  faqIds: z.array(z.string()).default([]),
});

export const VacanciesPayload = z.object({
  title: z.string().max(120).default('Вакансии'),
  vacancyIds: z.array(z.string()).default([]),
});

export const ContactsPayload = z.object({
  title: z.string().max(120).default('Контакты'),
  showMap: z.boolean().default(true),
});

/**
 * Discriminated union — extend when adding new block types.
 */
export const BlockPayloadSchema = z.discriminatedUnion('type', [
  HeroPayload.extend({ type: z.literal('hero') }),
  AboutPayload.extend({ type: z.literal('about') }),
  ServicesPayload.extend({ type: z.literal('services') }),
  MastersPayload.extend({ type: z.literal('masters') }),
  PromotionsPayload.extend({ type: z.literal('promotions') }),
  GalleryPayload.extend({ type: z.literal('gallery') }),
  RoomsPayload.extend({ type: z.literal('rooms') }),
  ReviewsPayload.extend({ type: z.literal('reviews') }),
  FaqPayload.extend({ type: z.literal('faq') }),
  VacanciesPayload.extend({ type: z.literal('vacancies') }),
  ContactsPayload.extend({ type: z.literal('contacts') }),
]);

export const Block = z.object({
  id: z.string(),
  type: BlockType,
  enabled: z.boolean(),
  order: z.number().int(),
  payload: z.record(z.string(), z.unknown()),
});

export type Block = z.infer<typeof Block>;
export type BlockPayload = z.infer<typeof BlockPayloadSchema>;