import { z } from 'zod';

/**
 * Integrations — third-party services we connect to.
 * One row per integration id (e.g. "dikidi", "yandex-maps"), generic shape.
 */

/**
 * Dikidi booking integration.
 *
 * Two modes:
 *  - **Widget only** (no API token): we render Dikidi's booking widget
 *    (iframe or JS modal) so visitors stay on our site.
 *  - **Full API** (with business API token): we sync services/masters
 *    from Dikidi into our DB and can fetch free slots.
 */
export const DikidiConfig = z.object({
  enabled: z.boolean().default(true),
  /** Public page URL on dikidi.ru. */
  publicPageUrl: z.string().url().default('https://dikidi.ru/1475188'),
  /** Business ID, used for widget iframe. */
  businessId: z.string().default('1475188'),
  /** Widget embed URL (defaults to dikidi standard widget). */
  widgetUrl: z
    .string()
    .url()
    .default('https://dikidi.ru/widget/1475188'),
  /** Booking button label. */
  buttonLabel: z.string().max(40).default('Записаться'),
  /** Show button as sticky CTA on mobile bottom. */
  stickyMobile: z.boolean().default(true),

  /** Optional API integration (sync catalog / slots). */
  apiToken: z.string().max(500).optional().default(''),
  /** Last successful sync timestamp. */
  lastSyncAt: z.string().nullable().default(null),
});

export type DikidiConfig = z.infer<typeof DikidiConfig>;

/**
 * Public projection — what we expose to the public site (no secrets).
 */
export const DikidiPublicConfig = z.object({
  enabled: z.boolean(),
  publicPageUrl: z.string(),
  widgetUrl: z.string(),
  buttonLabel: z.string(),
  stickyMobile: z.boolean(),
});

export type DikidiPublicConfig = z.infer<typeof DikidiPublicConfig>;

export const IntegrationType = z.enum([
  'dikidi',
  'yandex-maps',
  'google-maps',
  'telegram-bot',
  'whatsapp-business',
  'email-smtp',
]);
export type IntegrationType = z.infer<typeof IntegrationType>;

/**
 * Generic integration config record (one row per integration id).
 */
export const IntegrationRecord = z.object({
  id: z.string(), // e.g. "dikidi"
  type: IntegrationType,
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()),
  lastSyncAt: z.string().nullable(),
  lastSyncStatus: z.string().nullable(),
  updatedAt: z.string(),
  updatedBy: z.string().nullable(),
});

export type IntegrationRecord = z.infer<typeof IntegrationRecord>;