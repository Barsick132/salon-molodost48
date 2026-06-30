<script setup lang="ts">
/**
 * ServicesPage — публичный прайс-лист.
 *
 * Загружает /api/services, рендерит категории как табы,
 * услуги внутри категории — accordion с ценой и временем.
 *
 * Анимации: IntersectionObserver fade-up при появлении.
 */
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { api } from '@/api/client';
import type { Service } from '@molodost/shared';

interface CategoryWithServices {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  order: number;
  isActive: boolean;
  services: Service[];
}

const categories = ref<CategoryWithServices[]>([]);
const activeSlug = ref<string>('');
const expanded = ref<Set<string>>(new Set());
const loading = ref(true);
const error = ref('');
const query = ref('');

const filtered = computed(() => {
  if (!query.value.trim()) return categories.value;
  const q = query.value.toLowerCase();
  return categories.value
    .map((c) => ({
      ...c,
      services: c.services.filter(
        (s) => s.name.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
      ),
    }))
    .filter((c) => c.services.length > 0);
});

const totalServices = computed(() =>
  categories.value.reduce((sum, c) => sum + c.services.length, 0),
);

const priceRanges = computed(() => {
  const cats = categories.value;
  const all = cats.flatMap((c) => c.services);
  const withPrice = all.filter((s) => s.priceFrom != null);
  if (withPrice.length === 0) return null;
  const min = Math.min(...withPrice.map((s) => s.priceFrom ?? 0));
  const max = Math.max(...withPrice.map((s) => s.priceTo ?? s.priceFrom ?? 0));
  return { min, max };
});

function formatPrice(s: Service): string {
  const from = s.priceFrom ?? 0;
  const to = s.priceTo ?? 0;
  const fmt = (n: number) => n.toLocaleString('ru-RU');
  if (from === to || to === 0) return `${fmt(from)} ₽`;
  return `от ${fmt(from)} до ${fmt(to)} ₽`;
}

function formatDuration(s: Service): string | null {
  if (!s.durationMinutes) return null;
  const h = Math.floor(s.durationMinutes / 60);
  const m = s.durationMinutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

function setActive(slug: string) {
  activeSlug.value = slug;
  const el = document.getElementById(`cat-${slug}`);
  if (el) {
    const offset = 100; // sticky header + tabs
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

function toggleService(id: string) {
  if (expanded.value.has(id)) {
    expanded.value.delete(id);
  } else {
    expanded.value.add(id);
  }
}

function isExpanded(id: string): boolean {
  return expanded.value.has(id);
}

// Reveal animation
const reveals = ref<HTMLElement[]>([]);
let observer: IntersectionObserver | null = null;

onMounted(async () => {
  try {
    const res = await api<{ categories: CategoryWithServices[] }>('/services');
    categories.value = res.categories;
    if (res.categories.length > 0) {
      activeSlug.value = res.categories[0]?.slug ?? '';
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить услуги';
  } finally {
    loading.value = false;
  }

  // Scroll spy for active tab
  const observer2 = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const slug = (entry.target as HTMLElement).id.replace('cat-', '');
          activeSlug.value = slug;
        }
      }
    },
    { rootMargin: '-150px 0px -60% 0px', threshold: 0 },
  );
  for (const c of categories.value) {
    const el = document.getElementById(`cat-${c.slug}`);
    if (el) observer2.observe(el);
  }

  // Reveal observer
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer?.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.05 },
  );
  for (const el of reveals.value) observer.observe(el);
});

onUnmounted(() => observer?.disconnect());

function registerReveal(el: unknown) {
  if (el instanceof HTMLElement && !reveals.value.includes(el)) {
    reveals.value.push(el);
  }
}
</script>

<template>
  <div class="services-page">
    <!-- HERO -->
    <section class="hero">
      <div class="hero-bg" aria-hidden="true">
        <div class="hero-glow"></div>
      </div>
      <div class="container hero-inner">
        <div class="eyebrow" :ref="registerReveal">
          <span class="dot"></span>
          Прайс-лист · обновлено {{ new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) }}
        </div>
        <h1 class="hero-title" :ref="registerReveal">
          Услуги и <em>цены</em>.
        </h1>
        <p class="hero-lead" :ref="registerReveal">
          Полный спектр услуг салона «Молодость» — от стрижки до SPA.
          <span v-if="totalServices > 0"> {{ totalServices }} услуг в {{ categories.length }} категориях.</span>
          <span v-if="priceRanges">
            Цены от {{ priceRanges.min.toLocaleString('ru-RU') }}
            до {{ priceRanges.max.toLocaleString('ru-RU') }} ₽.
          </span>
        </p>

        <div class="search-wrap" :ref="registerReveal">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" />
            <path d="M11 11l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <input
            v-model="query"
            type="search"
            placeholder="Найти услугу или категорию…"
            class="search-input"
          />
          <button v-if="query" class="search-clear" aria-label="Очистить" @click="query = ''">✕</button>
        </div>
      </div>
    </section>

    <!-- Loading / Error -->
    <div v-if="loading" class="container state-message">Загружаем услуги…</div>
    <div v-else-if="error" class="container state-message error">{{ error }}</div>

    <!-- Empty state after filter -->
    <div v-else-if="filtered.length === 0" class="container state-message">
      <p>По запросу «{{ query }}» ничего не нашли.</p>
      <button class="reset-btn" @click="query = ''">Сбросить фильтр</button>
    </div>

    <!-- Sticky category tabs -->
    <nav v-if="!loading && !error && filtered.length > 0" class="cat-tabs" aria-label="Категории услуг">
      <div class="container tabs-inner">
        <button
          v-for="cat in filtered"
          :key="cat.slug"
          :class="['tab', { 'tab--active': activeSlug === cat.slug }]"
          @click="setActive(cat.slug)"
        >
          <span v-if="cat.icon" class="tab__icon">{{ cat.icon }}</span>
          <span class="tab__name">{{ cat.name }}</span>
          <span class="tab__count">{{ cat.services.length }}</span>
        </button>
      </div>
    </nav>

    <!-- Categories -->
    <template v-if="!loading && !error">
      <section
        v-for="cat in filtered"
        :id="`cat-${cat.slug}`"
        :key="cat.slug"
        class="category"
        :ref="registerReveal"
      >
        <div class="container">
          <header class="category-head">
            <div class="category-tag">
              <span v-if="cat.icon" class="category-tag__icon">{{ cat.icon }}</span>
              <span class="category-tag__name">{{ cat.name }}</span>
            </div>
            <h2 class="category-title">{{ cat.name }}</h2>
            <p v-if="cat.description" class="category-desc">{{ cat.description }}</p>
          </header>

          <div class="service-list">
            <article
              v-for="(svc, idx) in cat.services"
              :key="svc.id"
              :class="['service-row', { 'service-row--open': isExpanded(svc.id) }]"
              :style="{ '--delay': `${idx * 20}ms` }"
            >
              <button class="service-row__main" @click="toggleService(svc.id)">
                <span class="service-row__num">{{ String(idx + 1).padStart(2, '0') }}</span>
                <span class="service-row__name">{{ svc.name }}</span>
                <span class="service-row__meta">
                  <span v-if="formatDuration(svc)" class="service-row__time">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.2" />
                      <path d="M6 3v3l2 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
                    </svg>
                    {{ formatDuration(svc) }}
                  </span>
                  <span class="service-row__price">{{ formatPrice(svc) }}</span>
                  <span class="service-row__arrow" :class="{ 'service-row__arrow--open': isExpanded(svc.id) }">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>
                </span>
              </button>
              <Transition name="expand">
                <div v-if="isExpanded(svc.id) || svc.description" class="service-row__details" :class="{ 'service-row__details--collapsed': !isExpanded(svc.id) && !svc.description }">
                  <div class="service-row__details-inner">
                    <p v-if="svc.description" class="service-row__desc">{{ svc.description }}</p>
                    <a
                      v-if="isExpanded(svc.id)"
                      :href="`https://dikidi.ru/#widget=212727`"
                      class="service-row__book"
                    >
                      Записаться
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </Transition>
            </article>
          </div>
        </div>
      </section>
    </template>

    <!-- Bottom CTA -->
    <section v-if="!loading && !error" class="cta-bottom">
      <div class="container cta-bottom__inner">
        <h2>Не нашли подходящую услугу?</h2>
        <p>Позвоните или напишите — подберём решение для вашей задачи.</p>
        <div class="cta-bottom__buttons">
          <a href="tel:+74742719380" class="bottom-link">8 (474) 271-93-80</a>
          <a href="https://dikidi.ru/#widget=212727" class="bottom-link bottom-link--accent">
            Записаться онлайн
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.services-page { --tabs-height: 64px; }

/* ===== HERO ===== */
.hero {
  position: relative;
  padding: clamp(4rem, 10vh, 7rem) 0 clamp(2rem, 5vh, 3.5rem);
  overflow: hidden;
  isolation: isolate;
}
.hero-bg {
  position: absolute; inset: 0;
  z-index: -1;
  background: var(--color-bg);
}
.hero-glow {
  position: absolute;
  width: 600px; height: 600px;
  border-radius: 50%;
  filter: blur(140px);
  opacity: 0.35;
  top: -200px; right: -150px;
  background: radial-gradient(circle, var(--color-accent) 0%, transparent 70%);
}
.hero-inner { text-align: left; max-width: 800px; }
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.9rem 0.4rem 0.7rem;
  border: 1px solid var(--color-border-strong);
  border-radius: 999px;
  font-size: 0.825rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.02);
  margin-bottom: clamp(1.25rem, 3vw, 2rem);
}
.eyebrow .dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 8px var(--color-accent-glow);
}
.hero-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(2.5rem, 7vw, 4.5rem);
  line-height: 1.05;
  letter-spacing: -0.035em;
  margin-bottom: clamp(1rem, 2.5vw, 1.5rem);
}
.hero-title em {
  font-style: italic;
  font-weight: 400;
  color: var(--color-accent);
}
.hero-lead {
  font-size: clamp(1rem, 1.4vw, 1.1rem);
  color: var(--color-text-secondary);
  line-height: 1.55;
  max-width: 60ch;
  margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
}

/* ===== SEARCH ===== */
.search-wrap {
  position: relative;
  max-width: 520px;
}
.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}
.search-input {
  width: 100%;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-full);
  padding: 0.85rem 2.75rem 0.85rem 2.75rem;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 0.95rem;
  transition: border-color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out);
}
.search-input:focus {
  outline: none;
  border-color: var(--color-accent);
  background: var(--color-surface-2);
}
.search-input::placeholder { color: var(--color-text-muted); }
.search-clear {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--color-surface-3);
  color: var(--color-text-secondary);
  font-size: 12px;
}
.search-clear:hover { background: var(--color-accent); color: white; }

/* ===== STATE MESSAGES ===== */
.state-message {
  padding: 4rem 1rem;
  text-align: center;
  color: var(--color-text-secondary);
}
.state-message.error { color: var(--color-danger); }
.reset-btn {
  margin-top: 1rem;
  padding: 0.5rem 1.5rem;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-full);
  color: var(--color-text-primary);
}
.reset-btn:hover { border-color: var(--color-accent); color: var(--color-accent); }

/* ===== TABS ===== */
.cat-tabs {
  position: sticky;
  top: var(--header-height);
  z-index: 50;
  background: rgba(10, 10, 10, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
}
.tabs-inner {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.75rem 1.25rem;
  scrollbar-width: none;
}
.tabs-inner::-webkit-scrollbar { display: none; }
.tab {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  color: var(--color-text-secondary);
  background: transparent;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}
.tab:hover { color: var(--color-text-primary); border-color: var(--color-border); }
.tab--active {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
  box-shadow: 0 4px 14px var(--color-accent-glow);
}
.tab__icon { font-size: 0.95rem; line-height: 1; }
.tab__count {
  font-size: 0.7rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  font-weight: 600;
}
.tab--active .tab__count { background: rgba(255, 255, 255, 0.2); }

/* ===== CATEGORY ===== */
.category {
  padding: clamp(3rem, 6vw, 5rem) 0;
  scroll-margin-top: calc(var(--header-height) + var(--tabs-height) + 16px);
}
.category:nth-child(odd) {
  background: linear-gradient(180deg, transparent, var(--color-surface-1), transparent);
}
.category-head { margin-bottom: 2rem; }
.category-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 0.75rem;
}
.category-tag__icon { font-size: 0.95rem; }
.category-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin-bottom: 0.5rem;
}
.category-desc { color: var(--color-text-secondary); }

/* ===== SERVICE LIST ===== */
.service-list {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--color-border);
}
.service-row {
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  opacity: 0;
  transform: translateY(8px);
  animation: rowIn 0.5s var(--ease-out) forwards;
  animation-delay: var(--delay, 0ms);
  transition: background var(--duration-fast) var(--ease-out);
}
@keyframes rowIn {
  to { opacity: 1; transform: translateY(0); }
}
.service-row:hover { background: var(--color-surface-1); }
.service-row--open { background: var(--color-surface-1); }

.service-row__main {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 1.25rem;
  align-items: center;
  width: 100%;
  padding: 1.1rem 0.5rem;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.service-row__num {
  font-family: var(--font-display);
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-weight: 500;
}
.service-row__name {
  font-family: var(--font-display);
  font-size: clamp(1.05rem, 1.6vw, 1.2rem);
  font-weight: 500;
  letter-spacing: -0.01em;
}
.service-row__meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
}
.service-row__time {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}
.service-row__price {
  font-weight: 600;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.service-row__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  transition: all var(--duration-fast) var(--ease-out);
}
.service-row__arrow--open {
  transform: rotate(180deg);
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

.service-row__details {
  overflow: hidden;
}
.service-row__details-inner {
  padding: 0 0.5rem 1.25rem calc(48px + 1.25rem + 0.5rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.service-row__desc {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  line-height: 1.55;
}
.service-row__book {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  align-self: flex-start;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  transition: background var(--duration-fast) var(--ease-out);
}
.service-row__book:hover { background: var(--color-accent-hover); color: white; }

.expand-enter-active,
.expand-leave-active {
  transition: max-height 0.3s var(--ease-out), opacity 0.25s var(--ease-out);
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 300px;
  opacity: 1;
}

@media (max-width: 700px) {
  .service-row__main { grid-template-columns: 32px 1fr; }
  .service-row__meta { grid-column: 1 / -1; padding-left: 32px; font-size: 0.85rem; }
  .service-row__details-inner { padding-left: 32px; }
}

/* ===== BOTTOM CTA ===== */
.cta-bottom {
  margin-top: 4rem;
  padding: clamp(3rem, 6vw, 5rem) 0;
  background: var(--color-surface-1);
  border-top: 1px solid var(--color-border);
}
.cta-bottom__inner { text-align: center; }
.cta-bottom h2 {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}
.cta-bottom p { color: var(--color-text-secondary); margin-bottom: 2rem; }
.cta-bottom__buttons { display: inline-flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
.bottom-link {
  padding: 0.85rem 1.5rem;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-full);
  font-weight: 600;
  transition: all var(--duration-fast) var(--ease-out);
}
.bottom-link:hover { border-color: var(--color-accent); color: var(--color-accent); }
.bottom-link--accent {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
  box-shadow: 0 4px 14px var(--color-accent-glow);
}
.bottom-link--accent:hover { background: var(--color-accent-hover); color: white; border-color: var(--color-accent-hover); }

/* ===== REVEAL ===== */
[class*='category'],
.hero-lead,
.hero-title,
.eyebrow,
.search-wrap {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.8s var(--ease-out), transform 0.8s var(--ease-out);
}
.is-visible { opacity: 1; transform: translateY(0); }
</style>