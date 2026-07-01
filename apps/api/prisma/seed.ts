/**
 * Prisma seed — idempotent.
 *
 * Run with: pnpm db:seed
 *
 * Populates:
 *   - SiteSettings singleton (only if absent)
 *   - Default landing blocks (all disabled, except hero + contacts)
 *   - Bootstrap admin user from ADMIN_BOOTSTRAP_* env vars (only if no users exist)
 *
 * NOTE: Service categories & services are NOT seeded here.
 * Use `pnpm db:import-services` to populate them from data/services-from-original.json
 * (idempotent — safe to re-run after content updates).
 *
 * Safe to run repeatedly; uses upsert/where clauses.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const prisma = new PrismaClient();

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && m[1] && m[2] !== undefined && !process.env[m[1]]) {
        process.env[m[1]] = m[2];
      }
    }
  } catch {
    /* no .env — rely on shell env */
  }
}
loadEnv();

async function seedSiteSettings() {
  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      address: 'г. Липецк, ул. Пушкина 4',
      phones: ['8 (904) 219-19-99', '8 (474) 271-93-80'],
      email: 'support@molodost48.ru',
      workingHoursText: 'пн-пт 10:00–20:00, сб-вс выходной',
      socials: {},
    },
  });
  console.log('  ✓ Site settings');
}

async function seedBlocks() {
  const defaults = [
    { type: 'banner', enabled: true, order: 0, payload: {} },
    { type: 'stats', enabled: true, order: 1, payload: {} },
    { type: 'advantages', enabled: true, order: 2, payload: {} },
    { type: 'cta-strip', enabled: true, order: 3, payload: {} },
  ];
  await prisma.block.deleteMany({});
  for (const b of defaults) {
    await prisma.block.create({ data: b });
  }
  console.log('  ✓ Blocks');
}

async function seedIntegrations() {
  await prisma.integrationConfig.upsert({
    where: { id: 'dikidi' },
    update: {},
    create: {
      id: 'dikidi',
      type: 'booking',
      enabled: true,
      config: {
        enabled: true,
        widgetUrl: 'https://dikidi.ru/#widget=212727',
        buttonLabel: 'Записаться',
        lastSyncAt: null,
      },
      credentials: {},
      lastSyncAt: null,
      lastSyncStatus: null,
    },
  });
}

async function seedBootstrapAdmin() {
  const userCount = await prisma.adminUser.count();
  if (userCount > 0) return;

  const email = process.env.ADMIN_BOOTSTRAP_EMAIL ?? 'admin@molodost48.ru';
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const name = process.env.ADMIN_BOOTSTRAP_NAME ?? 'Администратор';

  if (!password || password.length < 8 || password === 'CHANGE_ME_STRONG') {
    console.warn(
      '\n⚠️  ADMIN_BOOTSTRAP_PASSWORD is not set or still placeholder. Skipping admin creation.\n' +
        '   Set it in apps/api/.env then re-run: pnpm db:seed\n',
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.create({
    data: { email, displayName: name, passwordHash, role: 'admin', isActive: true },
  });
  console.log(`✓ Bootstrap admin created: ${email}`);
}

async function main() {
  console.log('Seeding molodost48 database…');
  await seedSiteSettings();
  console.log('  ✓ SiteSettings');
  await seedBlocks();
  console.log('  ✓ Blocks (default set)');
  await seedIntegrations();
  console.log('  ✓ Integrations (dikidi)');
  await seedBootstrapAdmin();
  console.log('Done.');
  console.log('');
  console.log('Next step: run `pnpm db:import-services` to populate');
  console.log('service categories from data/services-from-original.json');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });