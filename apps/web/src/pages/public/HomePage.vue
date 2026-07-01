<script setup lang="ts">
/**
 * HomePage — block-driven landing.
 *
 * Pulls enabled blocks from /api/blocks (cached 30s on the server) and renders
 * each one by `type`. The services preview is always rendered after the
 * advantages block (when services page is enabled) — it's data, not content.
 */
import { onMounted, ref, computed, useTemplateRef } from 'vue';
import { useIntegrationsStore } from '@/stores/integrations';
import { useSiteStore } from '@/stores/site';
import { useBlocksStore, type BlockBase, type HeroPayload, type StatItem, type AdvantageItem, type CtaStripPayload } from '@/stores/blocks';
import { api } from '@/api/client';
import { useHeroOverlay } from '@/composables/useHeroOverlay';

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
const heroPayload = (b: BlockBase): HeroPayload => {
  if (b.type !== 'hero') {
    return {
      eyebrow: '', titleBefore: '', titleAccent: '', titleAfter: '', title: '',
      lead: '', primaryCtaLabel: '', primaryCtaHref: '',
      secondaryCtaLabel: '', secondaryCtaHref: '',
      imageUrl: '', imageOverlay: 55, textAlign: 'center', showScrollCue: true,
      showOverlay: true,
      textAlignHorizontal: 'center',
    };
  }
  return b.payload as unknown as HeroPayload;
};
const ctaPayload = (b: BlockBase): CtaStripPayload => (b.type === 'cta-strip' ? (b.payload as unknown as CtaStripPayload) : { eyebrow: '', title: '', lead: '', ctaLabel: '', ctaHref: '' });

// Map semantic icon names → inline SVG path fragments.
// Admins edit the icon by typing a short keyword: tag / shield / clock / coffee / star / etc.
function renderAdvantageIcon(key: string, size = 22) {
  switch (key) {
    case 'tag':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.18 7.17a2 2 0 0 1-2.82 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`;
    case 'shield':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`;
    case 'clock':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    case 'coffee':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`;
    case 'star':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 8.5 22 9.3 17 14.2 18.2 21 12 17.8 5.8 21 7 14.2 2 9.3 9 8.5 12 2"/></svg>`;
    case 'scissors':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`;
    case 'sparkles':
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M5 12H1M23 12h-4M6.34 6.34l2.83 2.83M14.83 14.83l2.83 2.83M6.34 17.66l2.83-2.83M14.83 9.17l2.83-2.83"/></svg>`;
    default:
      return ''; // fall back to raw text in template
  }
}

function isKnownIcon(key: string): boolean {
  return ['tag', 'shield', 'clock', 'coffee', 'star', 'scissors', 'sparkles'].includes(key);
}

// Map CTA href → integration booking url if it's the magic "dikidi" placeholder
function resolveCta(href: string): string {
  if (!href) return '#';
  // Empty href or '#' → use dikidi widget url when enabled
  if (href === '#' && integrations.dikidi.enabled && integrations.dikidi.widgetUrl) {
    return integrations.dikidi.widgetUrl;
  }
  return href;
}

// Scroll cue handler — find the first non-hero <section> directly under
// `.home` and smooth-scroll to it. Falls back to "just below the hero" if no
// later block exists yet (admin hasn't set up anything).
function scrollPastHero() {
  const root = document.querySelector('.home');
  if (!root) {
    window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
    return;
  }
  const sections = root.querySelectorAll(':scope > section');
  for (const s of Array.from(sections)) {
    if (!s.classList.contains('hero')) {
      s.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
  }
  // No following block — at least skip past the hero so the cue feels responsive.
  window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' });
}

// Always fetch services on mount, independent of whether the visibility flags
// have loaded yet. If the section ends up disabled we still waste one HTTP
// round-trip, but we never get stuck in a skeleton forever.
const servicesFetched = ref(false);
async function loadServices() {
  if (servicesFetched.value) return;
  servicesFetched.value = true;
  try {
    const res = await api<{ categories: ServiceCategorySummary[] }>('/services');
    servicesLive.value = res.categories;
  } catch {
    /* keep empty */
  } finally {
    servicesLoading.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    blocksStore.fetchPublic(),
    loadServices(),
  ]);
});

// ----- hero overlay: samples the photo and chooses a gradient + text tone -----
const heroImageUrl = computed(() => {
  const hero = blocks.value.find(isHero);
  return hero ? heroPayload(hero).imageUrl ?? null : null;
});
const heroElRef = useTemplateRef<HTMLElement>('heroEl');
const heroInnerElRef = useTemplateRef<HTMLElement>('heroInnerEl');
const heroOverlay = useHeroOverlay(heroImageUrl, { hero: heroElRef, text: heroInnerElRef });
const heroOverlayStyle = computed(() => heroOverlay.style.value);
const heroTextTone = computed(() => heroOverlay.textTone.value);
const heroTextColor = computed(() => heroOverlay.textColor.value);
const heroMutedTextColor = computed(() => heroOverlay.mutedTextColor.value);
</script>

<template>
  <div class="home">
    <!-- ============== BLOCKS ============== -->
    <template v-for="(b, idx) in blocks" :key="b.id">
      <!-- ===== HERO ===== -->
      <section v-if="isHero(b)" ref="heroEl" :class="['hero', `hero--${heroPayload(b).textAlign || 'center'}`, `hero--h-${heroPayload(b).textAlignHorizontal || 'center'}`]" :data-text-tone="heroTextTone" :data-overlay-source="heroOverlay.source.value" :data-h-align="heroPayload(b).textAlignHorizontal || 'center'">
        <div v-if="heroPayload(b).imageUrl" class="hero__bg">
          <img :src="heroPayload(b).imageUrl" alt="" />
          <div
            v-if="heroPayload(b).showOverlay !== false"
            class="hero__bg-overlay"
            :style="{
              opacity: 1,
              backgroundImage: heroOverlayStyle,
            }"
            aria-hidden="true"
          ></div>
        </div>
        <div ref="heroInnerEl" class="hero__inner container">
          <div v-if="heroPayload(b).eyebrow" class="hero__eyebrow" :style="{ color: heroMutedTextColor }">{{ heroPayload(b).eyebrow }}</div>
          <h1 class="hero__title" :style="{ color: heroTextColor }">
            <span v-if="heroPayload(b).titleBefore" class="hero__title-before">{{ heroPayload(b).titleBefore }}</span>
            <span v-if="heroPayload(b).titleAccent" class="hero__title-accent">{{ heroPayload(b).titleAccent }}</span>
            <span v-if="heroPayload(b).titleAfter" class="hero__title-after">{{ heroPayload(b).titleAfter }}</span>
            <span v-if="!heroPayload(b).titleBefore && !heroPayload(b).titleAccent && heroPayload(b).title" class="hero__title-before">{{ heroPayload(b).title }}</span>
          </h1>
          <p v-if="heroPayload(b).lead" class="hero__lead" :style="{ color: heroMutedTextColor }">{{ heroPayload(b).lead }}</p>
          <div class="hero__cta">
            <a v-if="heroPayload(b).primaryCtaLabel" :href="resolveCta(heroPayload(b).primaryCtaHref)" class="hero__cta-primary">
              {{ heroPayload(b).primaryCtaLabel }}
            </a>
            <a v-if="heroPayload(b).secondaryCtaLabel" :href="resolveCta(heroPayload(b).secondaryCtaHref)" class="hero__cta-secondary">
              {{ heroPayload(b).secondaryCtaLabel }} →
            </a>
          </div>
        </div>
        <a v-if="heroPayload(b).showScrollCue" href="#" class="hero__scroll-cue" @click.prevent="scrollPastHero" aria-label="Прокрутить вниз">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
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
          <div class="feature-list">
            <article
              v-for="(a, i) in advItems(b)"
              :key="i"
              class="feature-row"
            >
              <span class="feature-row__num">{{ String(i + 1).padStart(2, '0') }}</span>
              <div class="feature-row__icon" v-html="isKnownIcon(a.icon) ? renderAdvantageIcon(a.icon, 26) : ''" />
              <div class="feature-row__body">
                <h3 class="feature-row__title">{{ a.title }}</h3>
                <p class="feature-row__text">{{ a.description }}</p>
              </div>
              <span class="feature-row__deco" aria-hidden="true"></span>
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
        v-if="site.settings.loaded && showServicesSection && idx === servicesInsertAfter"
        class="services"
      >
        <div class="container services__inner">
          <div class="section-head section-head--center">
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

/* ============ HERO (full-bleed) ============ */
.hero {
  position: relative;
  width: 100%;
  min-height: 78vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background: var(--color-bg);
}
/* Vertical anchor — deliberately large padding so the choice is
   obvious even on tall viewports (where 78vh gives lots of room
   to spread out). A decorative accent line marks the anchor edge
   so the eye reads the layout as 'intentionally placed', not just
   'roughly centered'. */
/* Vertical anchor — on wide viewports the inner block fills half
   the hero so the placement is visually unmistakable. The text
   itself is centred *inside that block* (not glued to its top or
   bottom edge), giving the editorial layouts a generous,
   intentional feel. A decorative accent line marks the inner
   edge of the block (top mode: line at the top of the block;
   bottom mode: line at the bottom). On mobile / short viewports
   the block collapses to a sensible min-height so we don't get
   a giant empty block above the nav. */
.hero--top {
  justify-content: flex-start;
}
.hero--top .hero__inner {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  min-height: 55vh;
  padding: 5rem clamp(1.5rem, 6vw, 5rem);
  padding-top: 6rem;
}
.hero--top .hero__inner::before {
  content: '';
  position: absolute;
  top: 4rem;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    var(--color-accent) 0%,
    var(--color-accent) 30%,
    transparent 100%);
  opacity: 0.7;
}

.hero--center {
  justify-content: center;
}
.hero--center .hero__inner {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 3rem 0;
}
.hero--center .hero__inner::before,
.hero--center .hero__inner::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 1px;
  background: var(--color-accent);
  opacity: 0.6;
}
.hero--center .hero__inner::before { top: 0; }
.hero--center .hero__inner::after { bottom: 0; }

.hero--bottom {
  justify-content: flex-end;
}
.hero--bottom .hero__inner {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  min-height: 55vh;
  padding: 5rem clamp(1.5rem, 6vw, 5rem);
  padding-bottom: 6rem;
}
.hero--bottom .hero__inner::after {
  content: '';
  position: absolute;
  bottom: 4rem;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    transparent 0%,
    var(--color-accent) 70%,
    var(--color-accent) 100%);
  opacity: 0.7;
}

/* Horizontal alignment. .hero is a flex column, so cross-axis (horizontal)
   is controlled via align-self on the .hero__inner child. */
.hero--h-left   .hero__inner {
  align-self: flex-start;
  /* Side gutter scales with the viewport but caps at 7rem so the
     column doesn't drift inboard on ultrawide monitors. The old
     formula (100vw - 1280px)/2 + 1.5rem pushed the column over
     340px from the left edge on a 1920 screen, which made the
     editorial layout feel orphaned. 6vw maxes at ~115px on
     1920, ~150px on 2560, with a 1.5rem floor for tiny screens. */
  margin-left: clamp(1.5rem, 6vw, 7rem);
  margin-right: 1.5rem;
  max-width: 600px;
  text-align: left;
}
.hero--h-center .hero__inner {
  align-self: center;
  margin-left: auto;
  margin-right: auto;
  max-width: 880px;
  text-align: center;
}
.hero--h-right  .hero__inner {
  align-self: flex-end;
  margin-right: clamp(1.5rem, 6vw, 7rem);
  margin-left: 1.5rem;
  max-width: 600px;
  text-align: right;
}

.hero__bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.hero__bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Subject (woman's face + hair) sits in the upper-right third of the photo;
     center-cropping shows empty wall on the left and crops the head on
     tall viewports. Anchor to ~30% horizontally and ~25% vertically so the
     face is always visible regardless of viewport aspect. */
  object-position: 30% 25%;
  /* gentle zoom-in over 12s on first paint */
  animation: heroZoom 14s ease-out both;
}
@keyframes heroZoom {
  from { transform: scale(1.05); }
  to   { transform: scale(1); }
}
.hero__bg-overlay {
  position: absolute;
  inset: 0;
  /* background-image is set inline by useHeroOverlay. As a CSS fallback
     (no image yet, no JS) we render a clearly-visible bottom-up
     scrim so the user never sees a 'no overlay' state. The full
     sampled version from the composable will replace this once
     the image has been decoded and analysed. */
  background:
    /* 0deg = bottom-to-top: dense black at the bottom, transparent
       at the top. The composable will replace this inline with the
       photo's colour-tinted version once it samples the image. */
    linear-gradient(0deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0) 100%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0) 30%);
  z-index: 1;
  pointer-events: none;
  transition: background-image 0.4s ease;
}

/* Text colours are set inline by useHeroOverlay: it picks a tinted
   version of the dominant photo colour (warm-white for dark scrims,
   warm-black for light scrims). The accent portion of the headline
   keeps the brand crimson regardless of tone — see below. */

.hero__inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  color: #fff;
  /* max-width is set per horizontal mode (h-left/right: 600,
     h-center: 880). No padding here — each vertical mode sets
     its own so the block has consistent inner padding in every
     layout. */
}
/* Vertical alignment tweaks only — horizontal alignment is handled
   by .hero--h-* rules above. */


.hero__eyebrow {
  display: inline-block;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--color-accent);
  margin-bottom: 1.5rem;
  font-weight: 600;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  border: 0;
  padding: 0;
}
/* Left/right editorial: vertical accent line beside the eyebrow. */
.hero--h-left .hero__eyebrow {
  border-left: 2px solid var(--color-accent);
  padding-left: 0.85rem;
}
.hero--h-right .hero__eyebrow {
  border-right: 2px solid var(--color-accent);
  padding-right: 0.85rem;
}

.hero__title {
  font-family: var(--font-display);
  font-size: clamp(2.4rem, 7vw, 5rem);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.04;
  margin: 0 auto 1.5rem;
  color: #fff;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.5);
}
/* Narrower, calmer title on left/right editorial modes. */
.hero--h-left .hero__title,
.hero--h-right .hero__title {
  font-size: clamp(2.1rem, 4.6vw, 3.4rem);
  margin: 0 0 1.25rem;
  max-width: 600px;
}
.hero--h-left .hero__title { margin-left: 0; margin-right: auto; }
.hero--h-right .hero__title { margin-left: auto; margin-right: 0; }
.hero__title-before { display: inline; }
.hero__title-accent {
  display: inline;
  font-style: italic;
  font-weight: 500;
  color: var(--color-accent);
  background: linear-gradient(135deg, #ff4d6d 0%, #e11d48 50%, #b91040 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  /* A faint dark stroke around the glyphs keeps the crimson readable
     when the photo's red tones (lipstick, dress, warm light) sit
     behind it. The drop-shadow trick is the cheapest way to add a
     stroke to a background-clip:text element. */
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
}
.hero__title-after { display: inline; }

.hero__lead {
  font-size: clamp(1rem, 1.6vw, 1.2rem);
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 auto 2rem;
  max-width: 580px;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
}
.hero--h-left .hero__lead,
.hero--h-right .hero__lead {
  font-size: clamp(0.95rem, 1.4vw, 1.1rem);
  margin: 0 0 1.75rem;
  max-width: 460px;
}
.hero--h-left .hero__lead { margin-left: 0; margin-right: auto; }
.hero--h-right .hero__lead { margin-left: auto; margin-right: 0; }

.hero__cta {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  justify-content: center;
}
.hero--h-left .hero__cta { justify-content: flex-start; }
.hero--h-right .hero__cta { justify-content: flex-end; }
.hero__cta-primary {
  display: inline-flex;
  align-items: center;
  padding: 0.95rem 1.9rem;
  background: var(--color-accent);
  color: #fff;
  font-weight: 600;
  border-radius: var(--radius-md);
  text-decoration: none;
  font-size: 1rem;
  border: 1px solid var(--color-accent);
  transition: background 0.15s ease, transform 0.15s ease;
  box-shadow: 0 8px 24px -10px rgba(225, 29, 72, 0.6);
}
.hero__cta-primary:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
}
.hero__cta-secondary {
  display: inline-flex;
  align-items: center;
  padding: 0.95rem 1.6rem;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #fff;
  font-weight: 600;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.25);
  text-decoration: none;
  font-size: 1rem;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.hero__cta-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.5);
}

.hero__scroll-cue {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.7);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  text-decoration: none;
  animation: cueBounce 2.4s ease-in-out infinite;
  z-index: 1;
}
.hero__scroll-cue:hover { color: #fff; border-color: rgba(255, 255, 255, 0.5); }
@keyframes cueBounce {
  0%, 100% { transform: translate(-50%, 0); }
  50%      { transform: translate(-50%, 6px); }
}

@media (max-width: 700px) {
  .hero { min-height: 70vh; }

  /* Force horizontal centering on mobile. There isn't room for a
     600px editorial column on a phone, so left/right modes snap to
     centred layout. Vertical (top/center/bottom) is preserved —
     the editor can still anchor the text to the top or bottom of
     the hero even on mobile. */
  .hero--h-left .hero__inner,
  .hero--h-right .hero__inner {
    align-self: center;
    margin-left: auto;
    margin-right: auto;
    max-width: 720px;
    text-align: center;
    padding: 4rem 1.5rem;
  }

  /* Editorial accent lines shrink / hide on small screens —
     they look elegant on a wide hero but noisy on a phone. */
  .hero--top .hero__inner::before,
  .hero--bottom .hero__inner::after {
    height: 1px;
    opacity: 0.5;
  }
  .hero--top .hero__inner::before { top: 2rem; }
  .hero--bottom .hero__inner::after { bottom: 2rem; }
  .hero--center .hero__inner::before,
  .hero--center .hero__inner::after { width: 40px; opacity: 0.4; }

  /* Shrink the half-screen block on mobile — 55vh of a 700px tall
     phone is too much. Cap at a more reasonable 50vh but allow it
     to be smaller if the content is short. */
  .hero--top .hero__inner,
  .hero--bottom .hero__inner {
    min-height: 45vh;
    padding-top: 5rem;
    padding-bottom: 5rem;
  }

  /* CTAs go full-width on mobile so they're easier to tap. */
  .hero--h-left .hero__cta,
  .hero--h-right .hero__cta {
    justify-content: center;
  }
  .hero__cta-primary,
  .hero__cta-secondary {
    flex: 1 1 auto;
    justify-content: center;
  }

  .hero__bg img { object-position: 50% 30%; }
}
@media (min-aspect-ratio: 16/9) {
  /* Wide desktop monitors get the strongest upward crop so the head
     isn't clipped against the top edge. */
  .hero__bg img { object-position: 28% 22%; }
}
@media (min-aspect-ratio: 21/9) {
  .hero__bg img { object-position: 24% 20%; }
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

/* ============ ADVANTAGES (feature rows) ============ */
.advantages { padding: 5rem 0 3rem; }
.feature-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-top: 1px solid var(--color-border);
}
.feature-row {
  position: relative;
  display: grid;
  grid-template-columns: 80px 60px 1fr 60px;
  align-items: center;
  gap: 1.5rem;
  padding: 2.25rem 0;
  border-bottom: 1px solid var(--color-border);
  transition: padding 0.25s var(--ease-out);
}
.feature-row:hover {
  padding-left: 1rem;
}
.feature-row__num {
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}
.feature-row__icon {
  display: inline-grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  background: rgba(225, 29, 72, 0.1);
  color: var(--color-accent);
  border: 1px solid rgba(225, 29, 72, 0.18);
  transition: background 0.25s ease, color 0.25s ease, transform 0.25s ease;
}
.feature-row:hover .feature-row__icon {
  background: var(--color-accent);
  color: white;
  transform: rotate(-4deg) scale(1.05);
}
.feature-row__icon :deep(svg) { display: block; }
.feature-row__title {
  font-family: var(--font-display);
  font-size: clamp(1.25rem, 2vw, 1.6rem);
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0 0 0.3rem;
  color: var(--color-text-primary);
}
.feature-row__text {
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--color-text-secondary);
  margin: 0;
  max-width: 60ch;
}
.feature-row__deco {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.85rem;
  opacity: 0;
  transform: translateX(-8px);
  transition: opacity 0.2s ease, transform 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
.feature-row:hover .feature-row__deco {
  opacity: 1;
  transform: translateX(0);
  border-color: var(--color-accent);
  color: var(--color-accent);
}
@media (max-width: 700px) {
  .feature-row {
    grid-template-columns: 40px 1fr;
    gap: 1rem;
    padding: 1.5rem 0;
  }
  .feature-row__num { grid-row: 1; grid-column: 1 / -1; text-align: right; }
  .feature-row__icon { grid-row: 2; grid-column: 1; }
  .feature-row__body { grid-row: 2; grid-column: 2; }
  .feature-row__deco { display: none; }
}

/* ============ SERVICES ============ */
.services { padding: 4rem 0 3rem; }
.services__inner { max-width: 880px; margin: 0 auto; }
.section-head { max-width: 720px; margin: 0 auto 2.5rem; }
.section-head--center {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
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
  max-width: 60ch;
  margin: 0 auto;
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
