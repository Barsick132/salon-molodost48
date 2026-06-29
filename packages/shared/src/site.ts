import { z } from 'zod';

/**
 * Singleton site-wide settings — one row, edited via admin.
 */
export const SiteSettings = z.object({
  id: z.literal('singleton'),
  brandName: z.string().min(1).max(80).default('Молодость'),
  brandTagline: z.string().max(160).default('Салон красоты бизнес-класса'),
  logoMediaId: z.string().nullable().default(null),
  faviconMediaId: z.string().nullable().default(null),

  // Contacts
  address: z.string().max(280).default('г. Липецк, ул. Пушкина 4, пом. 6'),
  mapEmbedUrl: z.string().max(800).default(''),
  phones: z.array(z.string().max(40)).default(['8 (904) 219-19-99', '8 (474) 271-93-80']),
  email: z.string().email().max(120).default('support@molodost48.ru'),
  workingHours: z
    .array(
      z.object({
        day: z.string().max(20),
        from: z.string().max(10),
        to: z.string().max(10),
        closed: z.boolean().default(false),
      }),
    )
    .length(7)
    .default([
      { day: 'Пн', from: '10:00', to: '20:00', closed: false },
      { day: 'Вт', from: '10:00', to: '20:00', closed: false },
      { day: 'Ср', from: '10:00', to: '20:00', closed: false },
      { day: 'Чт', from: '10:00', to: '20:00', closed: false },
      { day: 'Пт', from: '10:00', to: '20:00', closed: false },
      { day: 'Сб', from: '10:00', to: '20:00', closed: false },
      { day: 'Вс', from: '10:00', to: '20:00', closed: false },
    ]),

  // Social
  socials: z
    .object({
      vk: z.string().max(280).default('https://vk.com/salon_molodost48'),
      telegram: z.string().max(280).default(''),
      whatsapp: z.string().max(280).default(''),
      instagram: z.string().max(280).default(''),
      youtube: z.string().max(280).default(''),
    })
    .default({}),

  // Booking integration
  bookingUrl: z.string().max(500).default('https://dikidi.ru/1475188'),

  // SEO defaults
  seoTitle: z.string().max(160).default('Молодость — салон красоты в Липецке'),
  seoDescription: z.string().max(400).default('Салон красоты бизнес-класса в Липецке. Парикмахерский зал, ногтевой сервис, брови и ресницы, косметология.'),
  seoOgImageId: z.string().nullable().default(null),
  robotsTxt: z.string().max(2000).default('User-agent: *\nAllow: /\nSitemap: /sitemap.xml'),

  // Theme
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#E11D48'),
  fontFamily: z.enum(['Inter', 'Manrope', 'Geist', 'System']).default('Inter'),

  // Schema.org LocalBusiness JSON-LD toggle
  enableStructuredData: z.boolean().default(true),
});

export type SiteSettings = z.infer<typeof SiteSettings>;

/**
 * Navigation menu items.
 */
export const NavItem = z.object({
  id: z.string(),
  label: z.string().min(1).max(60),
  href: z.string().max(280),
  order: z.number().int().min(0),
  isExternal: z.boolean().default(false),
  parentId: z.string().nullable().default(null),
});

export type NavItem = z.infer<typeof NavItem>;