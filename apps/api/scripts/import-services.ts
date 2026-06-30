/**
 * Import services from data/services-from-original.json.
 *
 * Run with: pnpm db:import-services
 *
 * Idempotent — safe to re-run. Each (category slug, service name) tuple
 * is upserted. Updates name/price/duration/order if changed in JSON.
 *
 * The JSON file shape is:
 *   {
 *     "categories": [
 *       { "slug": "...", "name": "...", "icon": "...", "order": N,
 *         "services": [
 *           { "name": "...", "duration_min": N, "price_from": N, "price_to": N }
 *         ]
 *       }
 *     ]
 *   }
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const prisma = new PrismaClient();

interface ServiceJson {
  name: string;
  duration_min: number;
  price_from: number;
  price_to: number;
}
interface CategoryJson {
  slug: string;
  name: string;
  icon: string;
  order: number;
  services: ServiceJson[];
}
interface FileJson {
  categories: CategoryJson[];
}

function translit(s: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };
  return s.toLowerCase().split('').map((c) => map[c] ?? c).join('');
}

function slugify(s: string): string {
  return translit(s)
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function formatPrice(from: number, to: number): string {
  if (from === to) return `${from.toLocaleString('ru-RU')} ₽`;
  return `от ${from.toLocaleString('ru-RU')} до ${to.toLocaleString('ru-RU')} ₽`;
}

async function main() {
  const dataPath = resolve(process.cwd(), 'data/services-from-original.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf8')) as FileJson;

  let totalCategories = 0;
  let totalServices = 0;
  let totalUpdated = 0;
  let totalCreated = 0;

  for (const cat of data.categories) {
    const catRow = await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, order: cat.order, isActive: true },
      create: {
        slug: cat.slug,
        name: cat.name,
        icon: cat.icon,
        order: cat.order,
        isActive: true,
      },
    });
    totalCategories++;

    for (let i = 0; i < cat.services.length; i++) {
      const svc = cat.services[i];
      const externalId = `${cat.slug}--${slugify(svc.name)}`;
      const result = await prisma.service.upsert({
        where: { categoryId_externalId: { categoryId: catRow.id, externalId } },
        update: {
          name: svc.name,
          priceFrom: svc.price_from,
          priceTo: svc.price_to,
          durationMinutes: svc.duration_min,
          order: i,
          isActive: true,
        },
        create: {
          categoryId: catRow.id,
          name: svc.name,
          priceFrom: svc.price_from,
          priceTo: svc.price_to,
          durationMinutes: svc.duration_min,
          order: i,
          externalId,
          isActive: true,
        },
      });
      totalServices++;
      const createdAt = result.createdAt.getTime();
      const updatedAt = result.updatedAt.getTime();
      if (Math.abs(createdAt - updatedAt) > 1000) {
        totalUpdated++;
      } else {
        totalCreated++;
      }
    }
    console.log(
      `  ✓ ${cat.name}: ${cat.services.length} services ` +
        `(${cat.services.slice(0, 2).map((s) => s.name).join(', ')}${cat.services.length > 2 ? '…' : ''})`,
    );
  }

  console.log(`\nDone.`);
  console.log(`  Categories: ${totalCategories}`);
  console.log(`  Services:   ${totalServices} (created: ${totalCreated}, updated: ${totalUpdated})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// suppress unused import warnings (formatPrice kept for future logger use)
void formatPrice;