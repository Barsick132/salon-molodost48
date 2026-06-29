/**
 * Runtime config — loaded from env (DATABASE_URL, JWT_SECRET, etc).
 * Validated with Zod so we crash early on misconfig.
 */

import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('127.0.0.1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32).optional(),

  MEDIA_ROOT: z.string().default('/var/lib/molodost48/uploads'),
  MEDIA_PUBLIC_BASE: z.string().default('/media'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),

  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean)),

  BACKUP_DIR: z.string().default('/var/lib/molodost48/backups'),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().positive().default(7),
});

const parsed = ConfigSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  COOKIE_SECRET: parsed.data.COOKIE_SECRET ?? parsed.data.JWT_SECRET,
};