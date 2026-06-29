import { z } from 'zod';

/**
 * Service categories (e.g. "Парикмахерский зал", "Ногтевой сервис", "Брови").
 */
export const ServiceCategory = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80),
  icon: z.string().max(40).default(''),
  description: z.string().max(400).default(''),
  order: z.number().int().min(0),
  isActive: z.boolean().default(true),
});

/**
 * Service item (a single priced service).
 * `priceFrom` / `priceTo` allow ranges (e.g. "от 1500 до 3500 ₽" for hair length tiers).
 */
export const Service = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string().min(1).max(160),
  description: z.string().max(800).default(''),
  priceFrom: z.number().int().nonnegative().nullable().default(null),
  priceTo: z.number().int().nonnegative().nullable().default(null),
  durationMinutes: z.number().int().nonnegative().nullable().default(null),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
  order: z.number().int().min(0),
});

export type ServiceCategory = z.infer<typeof ServiceCategory>;
export type Service = z.infer<typeof Service>;

/**
 * Yandex.Spravochnik export row (the columns we care about).
 * The export file is CSV/XLSX; the importer normalises everything to this shape.
 */
export const YandexServiceRow = z.object({
  externalId: z.string().optional(),
  category: z.string(),
  name: z.string(),
  description: z.string().optional().default(''),
  priceFrom: z.number().nonnegative().nullable().optional(),
  priceTo: z.number().nonnegative().nullable().optional(),
  durationMinutes: z.number().int().nonnegative().nullable().optional(),
});

export type YandexServiceRow = z.infer<typeof YandexServiceRow>;