<script setup lang="ts">
/**
 * HomePage — modern bento-style landing.
 * Renders the salon's value prop, advantages, services preview, and booking CTA.
 * Animations use IntersectionObserver for fade-up reveal on scroll.
 */
import { onMounted, onUnmounted, ref } from 'vue';
import { useIntegrationsStore } from '@/stores/integrations';

const integrations = useIntegrationsStore();

// Reveal-on-scroll
const reveals = ref<HTMLElement[]>([]);
let observer: IntersectionObserver | null = null;

onMounted(async () => {
  await integrations.load();
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer?.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -50px 0px' },
  );
  for (const el of reveals.value) observer.observe(el);
});

onUnmounted(() => observer?.disconnect());

function registerReveal(el: unknown) {
  if (el instanceof HTMLElement && !reveals.value.includes(el)) {
    reveals.value.push(el);
  }
}

const advantages = [
  {
    title: 'Бизнес-класс',
    text: 'Премиальный сервис, который ощущается в каждой детали — от напитка на ресепшене до финального результата.',
    icon: '✦',
  },
  {
    title: 'Команда профи',
    text: 'Стилисты с опытом 8+ лет, регулярные стажировки в Москве и Европе.',
    icon: '◆',
  },
  {
    title: "Только L'Oréal",
    text: 'Профессиональная косметика, которой доверяют лучшие салоны мира.',
    icon: '●',
  },
  {
    title: 'В центре Липецка',
    text: 'Удобная парковка, тихий двор на Пушкина — заходите как к себе домой.',
    icon: '▲',
  },
];

const services = [
  { name: 'Парикмахерский зал', count: '12 услуг', from: 'от 800 ₽' },
  { name: 'Ногтевой сервис', count: '8 услуг', from: 'от 600 ₽' },
  { name: 'Брови и ресницы', count: '6 услуг', from: 'от 500 ₽' },
  { name: 'Макияж', count: '4 услуги', from: 'от 1 200 ₽' },
  { name: 'SPA и уход', count: '6 услуг', from: 'от 1 500 ₽' },
];

const stats = [
  { value: '12+', label: 'лет на рынке' },
  { value: '15 000+', label: 'довольных клиентов' },
  { value: '8', label: 'мастеров' },
  { value: '4.9', label: 'средняя оценка' },
];
</script>

<template>
  <div class="home">
    <!-- HERO -->
    <section class="hero">
      <div class="hero-bg" aria-hidden="true">
        <div class="hero-glow hero-glow--1"></div>
        <div class="hero-glow hero-glow--2"></div>
        <div class="hero-grid"></div>
      </div>

      <div class="container hero-inner">
        <div class="eyebrow" :ref="registerReveal">
          <span class="dot"></span>
          Салон красоты в Липецке · с 2013 года
        </div>

        <h1 class="hero-title" :ref="registerReveal">
          Молодость —<br />
          это не возраст.<br />
          <span class="accent">Это состояние.</span>
        </h1>

        <p class="hero-lead" :ref="registerReveal">
          Премиальный салон красоты в центре Липецка.
          Стилисты с мировым опытом, косметика L'Oréal,
          атмосфера, в которую хочется возвращаться.
        </p>

        <div class="hero-cta" :ref="registerReveal">
          <a
            href="https://dikidi.ru/#widget=212727"
            class="hero-dikidi-btn"
            target="_self"
          >
            Записаться онлайн
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
          <a href="/services" class="hero-link">
            Смотреть услуги
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>

        <div class="hero-stats" :ref="registerReveal">
          <div v-for="s in stats" :key="s.label" class="hero-stat">
            <div class="hero-stat__value">{{ s.value }}</div>
            <div class="hero-stat__label">{{ s.label }}</div>
          </div>
        </div>
      </div>

      <div class="hero-scroll-hint" aria-hidden="true">
        <span>прокрутите</span>
        <div class="hero-scroll-line"></div>
      </div>
    </section>

    <!-- ADVANTAGES (bento) -->
    <section class="advantages">
      <div class="container">
        <div class="section-head" :ref="registerReveal">
          <div class="section-tag">Почему мы</div>
          <h2 class="section-title">Детали решают.</h2>
          <p class="section-lead">
            Мы уделяем внимание тем мелочам, которые превращают обычный визит в салон
            в ритуал, к которому хочется возвращаться.
          </p>
        </div>

        <div class="bento">
          <article
            v-for="(adv, i) in advantages"
            :key="adv.title"
            class="bento-card"
            :class="`bento-card--${i + 1}`"
            :ref="registerReveal"
          >
            <div class="bento-card__icon">{{ adv.icon }}</div>
            <h3 class="bento-card__title">{{ adv.title }}</h3>
            <p class="bento-card__text">{{ adv.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- SERVICES PREVIEW -->
    <section class="services">
      <div class="container">
        <div class="section-head" :ref="registerReveal">
          <div class="section-tag">Услуги</div>
          <h2 class="section-title">Полный спектр.</h2>
          <p class="section-lead">
            От стрижки до комплексного ухода — всё в одном месте.
            Записывайтесь онлайн, выбирайте мастера и удобное время.
          </p>
        </div>

        <div class="service-grid" :ref="registerReveal">
          <article v-for="(s, i) in services" :key="s.name" class="service-row">
            <div class="service-row__num">{{ String(i + 1).padStart(2, '0') }}</div>
            <div class="service-row__name">{{ s.name }}</div>
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

        <div class="services-cta" :ref="registerReveal">
          <a href="/services" class="all-link">
            Все услуги и цены
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
      </div>
    </section>

    <!-- CTA STRIP -->
    <section class="cta-strip">
      <div class="container cta-strip__inner">
        <div class="cta-strip__text" :ref="registerReveal">
          <h2>Готовы записаться?</h2>
          <p>Выберите мастера и время в один клик — без звонков и ожидания.</p>
        </div>
        <div :ref="registerReveal">
          <a
            href="https://dikidi.ru/#widget=212727"
            class="hero-dikidi-btn"
            target="_self"
          >
            Записаться в Dikidi
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  --gutter: clamp(1.25rem, 4vw, 2rem);
}

/* ===== HERO ===== */
.hero {
  position: relative;
  min-height: clamp(640px, 100vh, 880px);
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: clamp(4rem, 12vh, 9rem) 0 clamp(3rem, 8vh, 6rem);
  isolation: isolate;
}
.hero-bg {
  position: absolute; inset: 0;
  z-index: -1;
  background: var(--color-bg);
}
.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.4;
  pointer-events: none;
}
.hero-glow--1 {
  width: 520px; height: 520px;
  top: -120px; right: -120px;
  background: radial-gradient(circle, var(--color-accent) 0%, transparent 70%);
  animation: float-a 14s ease-in-out infinite alternate;
}
.hero-glow--2 {
  width: 420px; height: 420px;
  bottom: -100px; left: -100px;
  background: radial-gradient(circle, #6366f1 0%, transparent 70%);
  opacity: 0.25;
  animation: float-b 18s ease-in-out infinite alternate;
}
.hero-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 80px 80px;
  mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
}
@keyframes float-a { from { transform: translate(0, 0); } to { transform: translate(-60px, 40px); } }
@keyframes float-b { from { transform: translate(0, 0); } to { transform: translate(80px, -30px); } }

.hero-inner {
  position: relative;
  z-index: 1;
}
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
  backdrop-filter: blur(8px);
  margin-bottom: clamp(1.5rem, 4vw, 2.5rem);
}
.eyebrow .dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 8px var(--color-accent-glow);
  animation: pulse 2.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.85); }
}

.hero-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(2.5rem, 7.5vw, 5.5rem);
  line-height: 1.02;
  letter-spacing: -0.035em;
  max-width: 16ch;
  margin-bottom: clamp(1.25rem, 3vw, 2rem);
  color: var(--color-text-primary);
}
.hero-title .accent {
  font-style: italic;
  font-weight: 400;
  color: var(--color-accent);
}

.hero-lead {
  font-size: clamp(1.05rem, 1.5vw, 1.2rem);
  line-height: 1.55;
  color: var(--color-text-secondary);
  max-width: 48ch;
  margin-bottom: clamp(2rem, 5vw, 3rem);
}

.hero-cta {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: clamp(3rem, 7vw, 5rem);
}
.hero-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border-strong);
  transition: all var(--duration-base) var(--ease-out);
}
.hero-link:hover {
  color: var(--color-text-primary);
  border-color: var(--color-accent);
  gap: 0.75rem;
}
.hero-dikidi-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  background: var(--color-accent);
  color: white;
  padding: 1rem 1.75rem;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 1.05rem;
  box-shadow: 0 6px 20px var(--color-accent-glow), 0 1px 2px rgba(0,0,0,0.3);
  transition: all var(--duration-base) var(--ease-out);
}
.hero-dikidi-btn:hover {
  background: var(--color-accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 10px 28px var(--color-accent-glow), 0 2px 4px rgba(0,0,0,0.4);
  color: white;
  gap: 0.875rem;
}
.hero-dikidi-btn svg { transition: transform var(--duration-base) var(--ease-out); }
.hero-dikidi-btn:hover svg { transform: translateX(3px); }

.hero-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
  max-width: 720px;
}
.hero-stat__value {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 2.5vw, 2.2rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1;
  margin-bottom: 0.4rem;
}
.hero-stat__label {
  font-size: 0.825rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.hero-scroll-hint {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  z-index: 2;
}
.hero-scroll-line {
  width: 1px; height: 32px;
  background: linear-gradient(to bottom, var(--color-text-muted), transparent);
  animation: scroll-pulse 2s ease-in-out infinite;
}
@keyframes scroll-pulse {
  0%, 100% { opacity: 0.3; transform: scaleY(0.6); transform-origin: top; }
  50% { opacity: 1; transform: scaleY(1); }
}

/* ===== SECTION HEAD (shared) ===== */
.section-head {
  max-width: 720px;
  margin: 0 auto clamp(2.5rem, 6vw, 4rem);
  text-align: center;
}
.section-tag {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 1rem;
}
.section-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(2rem, 4.5vw, 3rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin-bottom: 1rem;
}
.section-lead {
  font-size: 1.05rem;
  line-height: 1.55;
  color: var(--color-text-secondary);
}

/* ===== ADVANTAGES (bento) ===== */
.advantages {
  padding: clamp(4rem, 10vw, 8rem) 0;
}
.bento {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1rem;
}
.bento-card {
  grid-column: span 3;
  position: relative;
  padding: 2rem 1.75rem;
  background: linear-gradient(180deg, var(--color-surface-1) 0%, var(--color-surface-2) 100%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: all var(--duration-base) var(--ease-out);
}
.bento-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at top right, rgba(225, 29, 72, 0.08), transparent 60%);
  opacity: 0;
  transition: opacity var(--duration-base) var(--ease-out);
  pointer-events: none;
}
.bento-card:hover {
  border-color: var(--color-border-strong);
  transform: translateY(-2px);
}
.bento-card:hover::before { opacity: 1; }
.bento-card--1 { grid-column: span 4; min-height: 280px; }
.bento-card--2 { grid-column: span 2; min-height: 280px; }
.bento-card--3 { grid-column: span 2; min-height: 280px; }
.bento-card--4 { grid-column: span 4; min-height: 280px; }
.bento-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px; height: 44px;
  border-radius: var(--radius-md);
  background: rgba(225, 29, 72, 0.12);
  border: 1px solid rgba(225, 29, 72, 0.25);
  color: var(--color-accent);
  font-size: 1.1rem;
  margin-bottom: 1.25rem;
}
.bento-card--1 .bento-card__icon,
.bento-card--4 .bento-card__icon {
  width: 56px; height: 56px;
  font-size: 1.5rem;
}
.bento-card__title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-bottom: 0.5rem;
}
.bento-card--1 .bento-card__title,
.bento-card--4 .bento-card__title {
  font-size: 1.875rem;
}
.bento-card__text {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  line-height: 1.55;
  max-width: 42ch;
}

@media (max-width: 900px) {
  .bento { grid-template-columns: 1fr 1fr; }
  .bento-card, .bento-card--1, .bento-card--2, .bento-card--3, .bento-card--4 {
    grid-column: span 1;
    min-height: 0;
  }
}

/* ===== SERVICES ===== */
.services {
  padding: clamp(4rem, 10vw, 8rem) 0;
  background: linear-gradient(180deg, transparent, var(--color-surface-1), transparent);
}
.service-grid {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--color-border);
}
.service-row {
  display: grid;
  grid-template-columns: 60px 1fr auto 40px;
  gap: 1.5rem;
  align-items: center;
  padding: 1.5rem 0.5rem;
  border-bottom: 1px solid var(--color-border);
  transition: background var(--duration-fast) var(--ease-out);
}
.service-row:hover {
  background: var(--color-surface-1);
  padding-left: 1rem;
}
.service-row__num {
  font-family: var(--font-display);
  font-size: 0.95rem;
  color: var(--color-text-muted);
  font-weight: 500;
}
.service-row__name {
  font-family: var(--font-display);
  font-size: clamp(1.2rem, 2vw, 1.5rem);
  font-weight: 500;
  letter-spacing: -0.02em;
}
.service-row__meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}
.service-row__count { font-weight: 500; }
.service-row__dot { color: var(--color-text-muted); }
.service-row__price { color: var(--color-text-muted); }
.service-row__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px; height: 40px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  color: var(--color-text-secondary);
  transition: all var(--duration-fast) var(--ease-out);
}
.service-row:hover .service-row__arrow {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
  transform: translateX(2px);
}

@media (max-width: 700px) {
  .service-row { grid-template-columns: 40px 1fr auto; }
  .service-row__arrow { display: none; }
  .service-row__meta { font-size: 0.8rem; }
}

.services-cta {
  margin-top: 2.5rem;
  text-align: center;
}
.all-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--color-text-primary);
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--color-border-strong);
  border-radius: 999px;
  transition: all var(--duration-base) var(--ease-out);
}
.all-link:hover {
  background: var(--color-surface-2);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* ===== CTA STRIP ===== */
.cta-strip {
  padding: clamp(3rem, 6vw, 5rem) 0;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}
.cta-strip__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  flex-wrap: wrap;
}
.cta-strip__text h2 {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-bottom: 0.4rem;
}
.cta-strip__text p {
  color: var(--color-text-secondary);
}

/* ===== REVEAL ANIMATIONS ===== */
[class*='section-head'],
.hero-stats,
.hero-cta,
.hero-lead,
.hero-title,
.eyebrow,
.bento-card,
.service-grid,
.services-cta,
.cta-strip__text,
.cta-strip__inner > div:last-child {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.8s var(--ease-out), transform 0.8s var(--ease-out);
}
.is-visible {
  opacity: 1;
  transform: translateY(0);
}
.bento-card.is-visible { transition-delay: 0.05s; }
.bento-card:nth-child(2).is-visible { transition-delay: 0.1s; }
.bento-card:nth-child(3).is-visible { transition-delay: 0.15s; }
.bento-card:nth-child(4).is-visible { transition-delay: 0.2s; }
</style>