import { z } from 'zod';

/**
 * Integrations — third-party services we connect to.
 * One row per integration id (e.g. "dikidi"), generic shape.
 */

/**
 * Dikidi booking integration.
 *
 * Single source of truth is `widgetUrl` — typically a hash URL like
 * `https://dikidi.ru/#widget=212727` that opens Dikidi's inline booking modal.
 * If `enabled` is false, no booking buttons are rendered anywhere.
 */
export const DikidiConfig = z.object({
  /** Global kill-switch for every booking button across the site. */
  enabled: z.boolean().default(true),
  /**
   * Single URL Dikidi is opened with. Usually:
   *  - `https://dikidi.ru/#widget=212727`   — modal widget
   *  - `https://dikidi.ru/1475188`          — public company page
   */
  widgetUrl: z
    .string()
    .url()
    .default('https://dikidi.ru/#widget=212727'),
  /** Booking button text. */
  buttonLabel: z.string().max(40).default('Записаться'),
});

export type DikidiConfig = z.infer<typeof DikidiConfig>;

/**
 * Public projection — what we expose to the public site (no secrets).
 */
export const DikidiPublicConfig = z.object({
  enabled: z.boolean(),
  widgetUrl: z.string(),
  buttonLabel: z.string(),
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