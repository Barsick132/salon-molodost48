<script setup lang="ts">
/**
 * Public ContactsPage — address, phones, working hours, socials, embedded map.
 *
 * - Map: Yandex iframe by default. Custom iframe overrides everything.
 * - "Как проехать?" opens a modal so the visitor can paste their address;
 *   we build a Yandex Routes URL and open in a new tab.
 * - Hides any field that's empty (phones, socials, hours)
 * - Hidden entirely when siteStore.settings.pages.contactsEnabled === false.
 */
import { computed, ref } from 'vue';
import { useSiteStore } from '@/stores/site';

const site = useSiteStore();
const visible = computed(() => site.settings.loaded && site.settings.pages.contactsEnabled);

const showRouteModal = ref(false);
const startPoint = ref('');

function telHref(phone: string) {
  // Strip spaces/dashes/parens for tel: links
  const digits = phone.replace(/[^\d+]/g, '');
  return `tel:${digits}`;
}

function mailto(email: string) {
  return `mailto:${email}`;
}

function socialIcon(key: string): string {
  const k = key.toLowerCase();
  if (k.includes('vk')) return 'VK';
  if (k.includes('telegram') || k === 'tg') return 'TG';
  if (k.includes('whatsapp') || k === 'wa') return 'WA';
  if (k.includes('instagram') || k === 'ig' || k.includes('insta')) return 'IG';
  if (k.includes('youtube') || k === 'yt') return 'YT';
  return key.toUpperCase().slice(0, 3);
}

const mapIframeSrc = computed(() => {
  const m = site.settings.map;
  if (!m) return '';
  if (m.iframeUrl) return m.iframeUrl;
  if (m.markerLat == null || m.markerLng == null) return '';

  // Yandex "Map Widget v1" — no API key required, free.
  const lat = m.markerLat;
  const lng = m.markerLng;
  const z = m.zoom ?? 15;
  const label = encodeURIComponent(site.settings.contact.address || '');
  // `pt=` adds a marker; `pm2bll` makes it look like a stylized pin
  return `https://yandex.ru/map-widget/v1/?ll=${lng},${lat}&z=${z}&pt=${lng},${lat},pm2bll~${label}`;
});

function openRouteModal() {
  startPoint.value = '';
  showRouteModal.value = true;
}

function goToRoute() {
  const m = site.settings.map;
  const addr = site.settings.contact.address || '';
  if (m.markerLat != null && m.markerLng != null) {
    // Yandex Routes URL — `rtext` is "from~to", supports an empty point
    const url = new URL('https://yandex.ru/maps/');
    url.searchParams.set('mode', 'routes');
    url.searchParams.set('rtt', 'auto');
    if (startPoint.value.trim()) url.searchParams.set('rtext', `${startPoint.value}~${addr}`);
    else url.searchParams.set('rtext', `~${addr}`);
    window.open(url.toString(), '_blank', 'noopener');
  } else {
    // fall back to plain map search
    window.open(`https://yandex.ru/maps/?text=${encodeURIComponent(addr)}`, '_blank', 'noopener');
  }
  showRouteModal.value = false;
}

function dayOrder() {
  const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  return order;
}

function isToday(d: { day: string }): boolean {
  const jsDay = (new Date().getDay() + 6) % 7;
  return order().includes(d.day) ? d.day === order()[jsDay] : false;
}
function order() { return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']; }
</script>

<template>
  <div v-if="!visible" class="contact-page contact-page--hidden">
    <div class="container">
      <h1>Раздел временно недоступен</h1>
      <p>Попробуйте зайти позже.</p>
    </div>
  </div>

  <div v-else class="contact-page">
    <!-- HERO -->
    <section class="contact-hero">
      <div class="container">
        <div class="eyebrow">Контакты</div>
        <h1>Будем рады видеть вас в гостях.</h1>
        <p class="lead">
          Уютная студия в самом центре Липецка. Запишитесь заранее — мы
          подготовим для вас идеальный момент.
        </p>
      </div>
    </section>

    <!-- MAIN GRID: contact card + map -->
    <section class="contact-main">
      <div class="container">
        <div class="contact-grid">
          <!-- ================= CARD ================= -->
          <aside class="contact-card">
            <div class="block">
              <div class="block__label">Адрес</div>
              <div class="address">{{ site.settings.contact.address }}</div>
              <button class="route-btn" @click="openRouteModal">Как проехать?</button>
            </div>

            <div v-if="site.settings.contact.phones.length" class="block">
              <div class="block__label">Телефоны</div>
              <ul class="phones">
                <li v-for="p in site.settings.contact.phones" :key="p">
                  <a :href="telHref(p)">{{ p }}</a>
                </li>
              </ul>
            </div>

            <div v-if="site.settings.contact.email" class="block">
              <div class="block__label">Email</div>
              <a :href="mailto(site.settings.contact.email)" class="email">
                {{ site.settings.contact.email }}
              </a>
            </div>

            <div v-if="site.settings.contact.workingHours?.length" class="block">
              <div class="block__label">Часы работы</div>
              <ul class="hours">
                <li
                  v-for="d in site.settings.contact.workingHours"
                  :key="d.day"
                  :class="['hours-row', { 'hours-row--today': isToday(d), 'hours-row--off': d.isDayOff }]"
                >
                  <span class="hours-row__day">{{ d.label }}</span>
                  <span class="hours-row__time">
                    <template v-if="d.isDayOff || !d.open">выходной</template>
                    <template v-else>{{ d.open }} — {{ d.close }}</template>
                  </span>
                </li>
              </ul>
            </div>

            <div v-if="Object.keys(site.settings.contact.socials || {}).length" class="block">
              <div class="block__label">Мы в соцсетях</div>
              <ul class="socials">
                <li v-for="(url, key) in site.settings.contact.socials" :key="key">
                  <a :href="url" target="_blank" rel="noopener" class="social">
                    <span class="social__icon">{{ socialIcon(String(key)) }}</span>
                    <span class="social__name">{{ key }}</span>
                  </a>
                </li>
              </ul>
            </div>

            <div class="block block--cta">
              <a :href="`tel:${(site.settings.contact.phones[0] || '').replace(/[^\d+]/g, '')}`" class="cta-call">
                Позвонить
              </a>
            </div>
          </aside>

          <!-- ================= MAP ================= -->
          <div class="map-wrap">
            <div class="map-toolbar">
              <div class="map-address">
                <span class="map-address__dot" />
                {{ site.settings.contact.address }}
              </div>
              <button class="route-btn route-btn--small" @click="openRouteModal">
                Как проехать?
              </button>
            </div>

            <div v-if="mapIframeSrc" class="map-iframe">
              <iframe
                :src="mapIframeSrc"
                loading="lazy"
                allowfullscreen
                referrerpolicy="no-referrer-when-downgrade"
                title="Карта проезда"
              />
              <img v-if="site.settings.map.customMarkerUrl" :src="site.settings.map.customMarkerUrl" alt="" class="map-custom-marker" aria-hidden="true" />
            </div>
            <div v-else class="map-placeholder">
              <p>Адрес ещё не добавлен. Заполните раздел «Контакты» в админке.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ROUTE MODAL -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showRouteModal" class="modal-backdrop" @click.self="showRouteModal = false">
          <div class="modal">
            <header class="modal__head">
              <h2>Построить маршрут</h2>
              <button class="icon-btn" @click="showRouteModal = false" aria-label="Закрыть">✕</button>
            </header>
            <div class="modal__body">
              <p class="modal__hint">Откуда вам удобнее добраться?</p>
              <label class="field">
                <span class="field__label">Точка отправления</span>
                <input
                  v-model="startPoint"
                  type="text"
                  :placeholder="site.settings.map.routeStartHint || 'г. Липецк, ул. ...'"
                  class="field__input"
                  autofocus
                  @keydown.enter="goToRoute"
                />
                <span class="field__hint">Адрес, остановка или название места</span>
              </label>
              <p class="modal__target">
                <strong>Куда:</strong> {{ site.settings.contact.address }}
              </p>
            </div>
            <footer class="modal__foot">
              <button class="btn" @click="showRouteModal = false">Отмена</button>
              <button class="btn btn--primary" @click="goToRoute">Открыть в Яндекс.Картах</button>
            </footer>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.contact-page { padding-bottom: 5rem; }
.contact-page--hidden { padding: 6rem 0; text-align: center; color: var(--color-text-muted); }

/* HERO */
.contact-hero { padding: 4rem 0 2rem; }
.eyebrow {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--color-accent);
  margin-bottom: 1rem;
}
.contact-hero h1 {
  font-family: var(--font-display);
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-bottom: 1rem;
  max-width: 720px;
}
.lead { color: var(--color-text-secondary); font-size: 1.1rem; max-width: 560px; }

/* GRID */
.contact-main { padding: 2rem 0 4rem; }
.contact-grid {
  display: grid;
  grid-template-columns: minmax(280px, 360px) 1fr;
  gap: 2rem;
}

/* CARD */
.contact-card {
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  align-self: start;
}
.block + .block { border-top: 1px solid var(--color-border); padding-top: 1.25rem; margin-top: 0.25rem; }
.block__label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
  font-weight: 600;
}
.address { font-size: 1.05rem; line-height: 1.4; margin-bottom: 0.75rem; }

.route-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.825rem;
  padding: 0.45rem 0.9rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;
}
.route-btn:hover { border-color: var(--color-accent); color: var(--color-accent); }
.route-btn--small { font-size: 0.75rem; padding: 0.3rem 0.7rem; }

.phones { display: flex; flex-direction: column; gap: 0.45rem; }
.phones a {
  font-size: 1.1rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--color-text-primary);
  text-decoration: none;
}
.phones a:hover { color: var(--color-accent); }

.email {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  text-decoration: underline;
  text-decoration-color: var(--color-border);
  text-underline-offset: 3px;
}
.email:hover { color: var(--color-accent); text-decoration-color: var(--color-accent); }

.hours { display: flex; flex-direction: column; gap: 0.35rem; }
.hours-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}
.hours-row--today { color: var(--color-text-primary); font-weight: 600; }
.hours-row--off .hours-row__time { color: var(--color-text-muted); }

.socials { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.social {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.7rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  font-size: 0.825rem;
  text-transform: capitalize;
  color: var(--color-text-secondary);
}
.social:hover { color: var(--color-accent); border-color: var(--color-accent); }
.social__icon {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--color-accent);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
}

.block--cta { border-top: none !important; padding-top: 0.25rem; }
.cta-call {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 0.85rem 1.25rem;
  background: var(--color-accent);
  color: white;
  border-radius: var(--radius-md);
  font-weight: 600;
  text-decoration: none;
}
.cta-call:hover { background: var(--color-accent-hover); }

/* MAP */
.map-wrap {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-surface-1);
  display: flex;
  flex-direction: column;
  min-height: 480px;
}
.map-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-2);
}
.map-address { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; }
.map-address__dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.2);
}

.map-iframe { position: relative; flex: 1; }
.map-iframe iframe {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 480px;
  border: none;
}
.map-custom-marker { display: none; } /* Custom marker shown via iframe-built svg */

.map-placeholder {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 2rem;
  text-align: center;
  color: var(--color-text-muted);
}

/* MODAL */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: grid; place-items: center;
  padding: 1rem;
}
.modal {
  width: 100%;
  max-width: 480px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.modal__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}
.modal__head h2 { font-size: 1.125rem; font-weight: 600; }
.icon-btn {
  width: 32px; height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
}
.icon-btn:hover { color: var(--color-text-primary); background: var(--color-surface-2); }

.modal__body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.modal__hint { color: var(--color-text-secondary); font-size: 0.875rem; }
.modal__target { font-size: 0.875rem; color: var(--color-text-secondary); padding-top: 0.5rem; border-top: 1px solid var(--color-border); }

.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field__label { font-size: 0.8rem; color: var(--color-text-secondary); }
.field__input {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.65rem 0.85rem;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 0.95rem;
}
.field__input:focus { outline: none; border-color: var(--color-accent); }
.field__hint { font-size: 0.75rem; color: var(--color-text-muted); }

.modal__foot {
  display: flex; justify-content: flex-end; gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
}
.btn {
  padding: 0.55rem 1.05rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid var(--color-border);
  background: var(--color-surface-1);
  color: var(--color-text-primary);
  cursor: pointer;
}
.btn--primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}
.btn--primary:hover { background: var(--color-accent-hover); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 800px) {
  .contact-grid { grid-template-columns: 1fr; }
  .map-wrap, .map-iframe iframe { min-height: 360px; }
}
</style>