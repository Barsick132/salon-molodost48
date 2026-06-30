<script setup lang="ts">
/**
 * HomePage — block-driven landing.
 *
 * Pulls enabled blocks from /api/blocks (cached 30s on the server) and renders
 * each one by `type`. The services preview is always rendered after the
 * advantages block (when services page is enabled) — it's data, not content.
 */
import { onMounted, ref, computed } from 'vue';
import { useIntegrationsStore } from '@/stores/integrations';
import { useSiteStore } from '@/stores/site';
import { useBlocksStore, type BlockBase, type HeroPayload, type StatItem, type AdvantageItem, type CtaStripPayload } from '@/stores/blocks';
import { api } from '@/api/client';

const site = useSiteStore();
const integrations = useIntegrationsStore();
const blocksStore = useBlocksStore();

const blocks = computed(() => blocksStore.blocks);

// ----- services preview -----
interface ServiceSummary {
  id: string;
  name: string;
  priceFrom: number | null;
  priceTo: number | null;
  durationMinutes: number | null;
  isPopular: boolean;
}
interface ServiceCategorySummary {
  id: string;
  name: string;
  slug: string;
  icon: string;
  services: ServiceSummary[];
}
const servicesLive = ref<ServiceCategorySummary[]>([]);
const servicesLoading = ref(true);

const categoryPreviews = computed(() =>
  servicesLive.value.map((cat) => {
    const items = cat.services
      .filter((s) => s.priceFrom != null)
      .map((s) => s.priceFrom as number);
    const minPrice = items.length ? Math.min(...items) : 0;
    return {
      name: cat.name,
      icon: cat.icon,
      count: `${cat.services.length} ${cat.services.length === 1 ? 'услуга' : cat.services.length < 5 ? 'услуги' : 'услуг'}`,
      from: minPrice ? `от ${minPrice.toLocaleString('ru-RU')} ₽` : '—',
    };
  }),
);

const showServicesSection = computed(() =>
  site.settings.loaded &&
  site.settings.pages.servicesEnabled &&
  site.settings.pages.homeServicesSectionEnabled,
);

// Find index where to insert services — after the advantages block (if any),
// otherwise after stats. If no blocks at all, services goes first.
const servicesInsertAfter = computed(() => {
  const list = blocks.value;
  if (!list.length) return -1;
  const idx = list.findIndex((b) => b.type === 'advantages');
  if (idx === -1) {
    const statsIdx = list.findIndex((b) => b.type === 'stats');
    return statsIdx === -1 ? list.length - 1 : statsIdx;
  }
  return idx;
});

function isHero(b: BlockBase): b is BlockBase & { payload: HeroPayload } { return b.type === 'hero'; }
function isStats(b: BlockBase): b is BlockBase & { payload: { items: StatItem[] } } { return b.type === 'stats'; }
function isAdvantages(b: BlockBase): b is BlockBase & { payload: { items: AdvantageItem[] } } { return b.type === 'advantages'; }
function isCtaStrip(b: BlockBase): b is BlockBase & { payload: CtaStripPayload } { return b.type === 'cta-strip'; }

// Helpers to safely pull items from a block's payload in templates (vue-tsc-friendly)
const statsItems = (b: BlockBase): StatItem[] => (b.type === 'stats' && Array.isArray((b.payload as any).items)) ? (b.payload as any).items : [];
const advItems = (b: BlockBase): AdvantageItem[] => (b.type === 'advantages' && Array.isArray((b.payload as any).items)) ? (b.payload as any).items : [];
const heroPayload = (b: BlockBase): HeroPayload => (b.type === 'hero' ? (b.payload as unknown as HeroPayload) : { eyebrow: '', title: '', lead: '', primaryCtaLabel: '', primaryCtaHref: '', secondaryCtaLabel: '', secondaryCtaHref: '' });
const ctaPayload = (b: BlockBase): CtaStripPayload => (b.type === 'cta-strip' ? (b.payload as unknown as CtaStripPayload) : { eyebrow: '', title: '', lead: '', ctaLabel: '', ctaHref: '' });

// Map CTA href → integration booking url if it's the magic "dikidi" placeholder
function resolveCta(href: string): string {
  if (!href) return '#';
  // Empty href or '#' → use dikidi widget url when enabled
  if (href === '#' && integrations.dikidi.enabled && integrations.dikidi.widgetUrl) {
    return integrations.dikidi.widgetUrl;
  }
  return href;
}

onMounted(async () => {
  await Promise.all([
    blocksStore.fetchPublic(),
    showServicesSection.value ? api<{ categories: ServiceCategorySummary[] }>('/services')
      .then((r) => { servicesLive.value = r.categories; })
      .catch(() => { /* keep empty */ })
      .finally(() => { servicesLoading.value = false; })
    : Promise.resolve(),
  ]);
  if (!showServicesSection.value) servicesLoading.value = false;
});
</script>

<template>
  <div class="home">
    <!-- ============== BLOCKS ============== -->
    <template v-for="(b, idx) in blocks" :key="b.id">
      <!-- ===== HERO ===== -->
      <section v-if="isHero(b)" class="hero">
        <div class="container">
          <div class="hero-inner">
            <div v-if="heroPayload(b).eyebrow" class="eyebrow">{{ heroPayload(b).eyebrow }}</div>
            <h1 class="hero-title">{{ heroPayload(b).title }}</h1>
            <p v-if="heroPayload(b).lead" class="hero-lead">
              {{ heroPayload(b).lead }}
            </p>
            <div class="hero-cta">
              <a v-if="heroPayload(b).primaryCtaLabel" :href="resolveCta(heroPayload(b).primaryCtaHref)" class="hero-cta__primary">
                {{ heroPayload(b).primaryCtaLabel }}
              </a>
              <a v-if="heroPayload(b).secondaryCtaLabel" :href="resolveCta(heroPayload(b).secondaryCtaHref)" class="hero-cta__secondary">
                {{ heroPayload(b).secondaryCtaLabel }} →
              </a>
            </div>
          </div>
          <div class="hero-bg" aria-hidden="true">
            <div class="hero-bg__grid"></div>
            <div class="hero-bg__glow"></div>
          </div>
        </div>
      </section>

      <!-- ===== STATS ===== -->
      <section v-else-if="isStats(b)" class="stats">
        <div class="container">
          <ul class="stats-row">
            <li v-for="(s, i) in statsItems(b)" :key="i" class="stats-row__cell">
              <div class="stats-row__value">{{ s.value }}</div>
              <div class="stats-row__label">{{ s.label }}</div>
            </li>
          </ul>
        </div>
      </section>

      <!-- ===== ADVANTAGES ===== -->
      <section v-else-if="isAdvantages(b)" class="advantages">
        <div class="container">
          <div class="bento">
            <article
              v-for="(a, i) in advItems(b)"
              :key="i"
              :class="['bento-card', `bento-card--${i}`]"
            >
              <span class="bento-card__icon">{{ a.icon }}</span>
              <h3 class="bento-card__title">{{ a.title }}</h3>
              <p class="bento-card__text">{{ a.description }}</p>
            </article>
          </div>
        </div>
      </section>

      <!-- ===== CTA STRIP ===== -->
      <section v-else-if="isCtaStrip(b)" class="cta-strip">
        <div class="container">
          <div class="cta-strip__inner">
            <div class="cta-strip__text">
              <div v-if="ctaPayload(b).eyebrow" class="eyebrow">{{ ctaPayload(b).eyebrow }}</div>
              <h2>{{ ctaPayload(b).title }}</h2>
              <p v-if="ctaPayload(b).lead">{{ ctaPayload(b).lead }}</p>
            </div>
            <a v-if="ctaPayload(b).ctaLabel" :href="resolveCta(ctaPayload(b).ctaHref)" class="cta-strip__btn">
              {{ ctaPayload(b).ctaLabel }} →
            </a>
          </div>
        </div>
      </section>

      <!-- ===== SERVICES (inserted after advantages/stats) ===== -->
      <section
        v-if="showServicesSection && idx === servicesInsertAfter"
        class="services"
      >
        <div class="container">
          <div class="section-head">
            <div class="section-tag">Услуги</div>
            <h2 class="section-title">Полный спектр.</h2>
            <p class="section-lead">
              От стрижки до комплексного ухода — всё в одном месте.
              Записывайтесь онлайн, выбирайте мастера и удобное время.
            </p>
          </div>

          <div v-if="servicesLoading" class="service-grid service-grid--loading">
            <div v-for="i in 5" :key="i" class="service-row service-row--skeleton">
              <div class="service-row__num">--</div>
              <div class="service-row__name">Загружаем…</div>
              <div class="service-row__meta"><span class="service-row__count">—</span></div>
            </div>
          </div>
          <div v-else-if="categoryPreviews.length" class="service-grid">
            <article v-for="(s, i) in categoryPreviews" :key="s.name" class="service-row">
              <div class="service-row__num">{{ String(i + 1).padStart(2, '0') }}</div>
              <div class="service-row__name">
                <span v-if="s.icon" class="service-row__icon">{{ s.icon }}</span>
                {{ s.name }}
              </div>
              <div class="service-row__meta">
                <span class="service-row__count">{{ s.count }}</span>
                <span class="service-row__dot">·</span>
                <span class="service-row__price">{{ s.from }}</span>
              </div>
              <a href="/services" class="service-row__arrow" aria-label="Подробнее">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </a>
            </article>
          </div>

          <div class="services-cta">
            <a href="/services" class="all-link">
              Все услуги и цены
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
        </div>
      </section>
    </template>

    <!-- Empty-state hint for first-time visitors -->
    <div v-if="!blocksStore.loading && blocks.length === 0" class="empty-state">
      <div class="container">
        <h1>Скоро здесь появится ваш сайт</h1>
        <p>Откройте админку → Блоки лендинга, чтобы добавить первый блок.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home { padding-bottom: 0; }

/* ============ HERO ============ */
.hero {
  position: relative;
  padding: 5rem 0 4rem;
  overflow: hidden;
}
.hero-inner { max-width: 760px; position: relative; z-index: 2; }
.eyebrow {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--color-accent);
  margin-bottom: 1.25rem;
  font-weight: 600;
}
.hero-title {
  font-family: var(--font-display);
  font-size: clamp(2.25rem, 6vw, 4rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.05;
  margin-bottom: 1.5rem;
  color: var(--color-text-primary);
}
.hero-lead {
  font-size: 1.125rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
  max-width: 580px;
}
.hero-cta {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.hero-cta__primary {
  display: inline-flex;
  align-items: center;
  padding: 0.85rem 1.75rem;
  background: var(--color-accent);
  color: white;
  font-weight: 600;
  border-radius: var(--radius-md);
  text-decoration: none;
  font-size: 1rem;
  transition: background 0.15s ease;
}
.hero-cta__primary:hover { background: var(--color-accent-hover); }
.hero-cta__secondary {
  display: inline-flex;
  align-items: center;
  padding: 0.85rem 1.5rem;
  background: transparent;
  color: var(--color-text-primary);
  font-weight: 600;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  text-decoration: none;
  font-size: 1rem;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.hero-cta__secondary:hover { border-color: var(--color-accent); color: var(--color-accent); }

.hero-bg {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}
.hero-bg__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(225, 29, 72, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(225, 29, 72, 0.04) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 60% 60% at 80% 20%, black, transparent 80%);
}
.hero-bg__glow {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(225, 29, 72, 0.15), transparent 70%);
  top: -200px;
  right: -100px;
  filter: blur(40px);
}

/* ============ STATS ============ */
.stats { padding: 1rem 0 3rem; }
.stats-row {
  list-style: none;
  margin: 0;
  padding: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.stats-row__cell {
  padding: 0.5rem 1rem;
  border-left: 2px solid var(--color-accent);
}
.stats-row__cell:first-child { border-left: none; }
.stats-row__value {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
  margin-bottom: 0.2rem;
}
.stats-row__label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ============ ADVANTAGES (BENTO) ============ */
.advantages { padding: 3rem 0; }
.bento {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1rem;
}
.bento-card {
  position: relative;
  padding: 1.75rem;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.bento-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 80% 0%, rgba(225, 29, 72, 0.08), transparent 60%);
  pointer-events: none;
}
.bento-card--0 { grid-column: span 6; }
.bento-card--1 { grid-column: span 6; }
.bento-card--2 { grid-column: span 4; }
.bento-card--3 { grid-column: span 8; }
.bento-card__icon {
  display: inline-grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  background: rgba(225, 29, 72, 0.12);
  color: var(--color-accent);
  font-size: 1.2rem;
  position: relative;
}
.bento-card__title {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
  position: relative;
}
.bento-card__text {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
  position: relative;
}

/* ============ SERVICES ============ */
.services { padding: 4rem 0 3rem; }
.section-head { max-width: 720px; margin-bottom: 2.5rem; }
.section-tag {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--color-accent);
  margin-bottom: 1rem;
  font-weight: 600;
}
.section-title {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin-bottom: 1rem;
}
.section-lead {
  color: var(--color-text-secondary);
  font-size: 1.05rem;
  line-height: 1.5;
}
.service-grid { display: flex; flex-direction: column; }
.service-row {
  display: grid;
  grid-template-columns: 60px 1fr auto 32px;
  gap: 1rem;
  align-items: center;
  padding: 1.25rem 0;
  border-top: 1px solid var(--color-border);
  transition: padding 0.2s var(--ease-out);
}
.service-row:hover { padding-left: 0.5rem; }
.service-row:last-child { border-bottom: 1px solid var(--color-border); }
.service-row__num {
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
.service-row__name {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--color-text-primary);
}
.service-row__icon {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(225, 29, 72, 0.1);
  font-size: 0.95rem;
}
.service-row__meta {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.service-row__count { color: var(--color-text-muted); }
.service-row__price { color: var(--color-text-primary); font-weight: 600; }
.service-row__arrow {
  width: 32px; height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  transition: all 0.15s ease;
}
.service-row:hover .service-row__arrow {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}
.service-row--skeleton .service-row__name {
  height: 1rem;
  background: var(--color-surface-2);
  border-radius: 4px;
  width: 40%;
  color: transparent;
}
.service-row--skeleton .service-row__count {
  height: 0.8rem;
  background: var(--color-surface-2);
  width: 80px;
  border-radius: 4px;
  color: transparent;
}

.services-cta { margin-top: 1.5rem; }
.all-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.4rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text-primary);
  font-weight: 500;
  text-decoration: none;
  transition: all 0.15s ease;
}
.all-link:hover { border-color: var(--color-accent); color: var(--color-accent); }

/* ============ CTA STRIP ============ */
.cta-strip {
  padding: 4rem 0 6rem;
  position: relative;
}
.cta-strip__inner {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2rem;
  align-items: center;
  padding: 2.5rem;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  position: relative;
  overflow: hidden;
}
.cta-strip__inner::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 100% 0%, rgba(225, 29, 72, 0.08), transparent 50%);
  pointer-events: none;
}
.cta-strip__text h2 {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0 0 0.5rem;
  color: var(--color-text-primary);
}
.cta-strip__text p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 1rem;
  position: relative;
}
.cta-strip__btn {
  display: inline-flex;
  align-items: center;
  padding: 0.85rem 1.75rem;
  background: var(--color-accent);
  color: white;
  font-weight: 600;
  border-radius: var(--radius-md);
  text-decoration: none;
  font-size: 1rem;
  position: relative;
  white-space: nowrap;
}
.cta-strip__btn:hover { background: var(--color-accent-hover); }

/* ============ EMPTY STATE ============ */
.empty-state { padding: 6rem 0; text-align: center; color: var(--color-text-muted); }
.empty-state h1 { font-family: var(--font-display); font-size: 1.75rem; margin-bottom: 0.5rem; }

@media (max-width: 800px) {
  .hero { padding: 3rem 0 2rem; }
  .bento-card--0, .bento-card--1, .bento-card--2, .bento-card--3 {
    grid-column: span 12;
  }
  .cta-strip__inner {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .service-row {
    grid-template-columns: 36px 1fr auto;
    gap: 0.6rem;
  }
  .service-row__arrow { display: none; }
  .stats-row__cell { border-left: none; border-top: 2px solid var(--color-accent); padding: 0.5rem 0; }
  .stats-row__cell:first-child { border-top: none; }
}
</style>