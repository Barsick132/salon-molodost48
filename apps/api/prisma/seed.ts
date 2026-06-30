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
      workingHours: [
        { day: 'Пн', from: '10:00', to: '20:00', closed: false },
        { day: 'Вт', from: '10:00', to: '20:00', closed: false },
        { day: 'Ср', from: '10:00', to: '20:00', closed: false },
        { day: 'Чт', from: '10:00', to: '20:00', closed: false },
        { day: 'Пт', from: '10:00', to: '20:00', closed: false },
        { day: 'Сб', from: '10:00', to: '20:00', closed: false },
        { day: 'Вс', from: '10:00', to: '20:00', closed: false },
      ],
      socials: { vk: 'https://vk.com/salon_molodost48' },
    },
  });
}

async function seedBlocks() {
  const existing = await prisma.block.count();
  if (existing > 0) return;

  const defaults = [
    { type: 'hero',       enabled: true,  order: 0,  payload: { title: 'Салон красоты бизнес-класса «Молодость»', subtitle: 'Парикмахерский зал · Ногтевой сервис · Косметология · Брови и ресницы · Макияж · SPA', ctaLabel: 'Записаться', ctaHref: 'https://dikidi.ru/1475188', backgroundImageId: null, slides: [] } },
    { type: 'about',      enabled: true,  order: 1,  payload: { title: 'О салоне', body: 'Салон красоты бизнес-класса в Липецке. Профессиональные стилисты, косметика L\'Oréal, уютная атмосфера.', advantages: [{ icon: 'star', title: 'Бизнес-класс', text: 'Премиальный сервис и материалы' }, { icon: 'team', title: 'Опытные мастера', text: 'Команда профессионалов своего дела' }, { icon: 'leaf', title: 'L\'Oréal', text: 'Только профессиональная косметика' }] } },
    { type: 'services',   enabled: true,  order: 2,  payload: { title: 'Услуги и цены', showPrices: true, categoryIds: [] } },
    { type: 'masters',    enabled: false, order: 3,  payload: { title: 'Наши мастера', masterIds: [] } },
    { type: 'promotions', enabled: false, order: 4,  payload: { title: 'Акции', promotionIds: [] } },
    { type: 'gallery',    enabled: false, order: 5,  payload: { title: 'Наши работы', categoryIds: [] } },
    { type: 'rooms',      enabled: false, order: 6,  payload: { title: 'Интерьер', roomIds: [] } },
    { type: 'reviews',    enabled: false, order: 7,  payload: { title: 'Отзывы', count: 6 } },
    { type: 'faq',        enabled: false, order: 8,  payload: { title: 'Частые вопросы', faqIds: [] } },
    { type: 'vacancies',  enabled: false, order: 9,  payload: { title: 'Вакансии', vacancyIds: [] } },
    { type: 'contacts',   enabled: true,  order: 10, payload: { title: 'Контакты', showMap: true } },
  ];

  for (const b of defaults) {
    await prisma.block.create({ data: b });
  }
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