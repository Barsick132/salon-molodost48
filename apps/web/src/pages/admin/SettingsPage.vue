<script setup lang="ts">
/**
 * Admin SettingsPage — manages SiteSettings.
 *
 * Sections:
 *   • Brand       — name, tagline, SEO, accent color
 *   • Contact     — short/long address, phones, email, hours, socials
 *   • Map         — provider (Yandex by default), coords, custom iframe, custom marker URL, zoom
 *   • Visibility  — page and section toggles (services, masters, contacts …)
 *
 * Each section saves independently via PUT /admin/site/{section}.
 */
import { ref, computed, onMounted, watch } from 'vue';
import { api, ApiError } from '@/api/client';

interface WorkingHour { day: string; label: string; open: string; close: string; isDayOff: boolean; }

const emptyHours = (): WorkingHour[] => ([
  { day: 'mon', label: 'Пн', open: '09:00', close: '21:00', isDayOff: false },
  { day: 'tue', label: 'Вт', open: '09:00', close: '21:00', isDayOff: false },
  { day: 'wed', label: 'Ср', open: '09:00', close: '21:00', isDayOff: false },
  { day: 'thu', label: 'Чт', open: '09:00', close: '21:00', isDayOff: false },
  { day: 'fri', label: 'Пт', open: '09:00', close: '21:00', isDayOff: false },
  { day: 'sat', label: 'Сб', open: '09:00', close: '20:00', isDayOff: false },
  { day: 'sun', label: 'Вс', open: '', close: '', isDayOff: true },
]);

type Section = 'contact' | 'map' | 'visibility' | 'brand';
const saving = ref<Record<Section, boolean>>({ contact: false, map: false, visibility: false, brand: false });
const message = ref<Record<Section, { type: 'ok' | 'error'; text: string } | null>>({
  contact: null, map: null, visibility: null, brand: null,
});

// Brand
const brand = ref({
  brandName: 'Молодость',
  brandTagline: 'Салон красоты бизнес-класса',
  seoTitle: '',
  seoDescription: '',
  accentColor: '#E11D48',
});

// Contact
const contact = ref({
  shortAddress: '',
  fullAddress: '',
  phones: [''],
  email: '',
  workingHours: emptyHours(),
  socials: { vk: '', telegram: '', whatsapp: '', instagram: '' } as Record<string, string>,
});

// Map
const map_ = ref({
  provider: 'yandex',
  iframeUrl: '',
  markerLat: null as number | null,
  markerLng: null as number | null,
  zoom: 15,
  customMarkerUrl: '',
  routeStartHint: 'Ваш адрес или точка на карте',
});

// Visibility
const visibility = ref({
  servicesPageEnabled: true,
  mastersPageEnabled: true,
  galleryPageEnabled: true,
  promotionsPageEnabled: true,
  reviewsPageEnabled: true,
  vacanciesPageEnabled: true,
  faqPageEnabled: true,
  contactsPageEnabled: true,
  homeServicesSectionEnabled: true,
  servicesInNavEnabled: true,
});

const mapPreviewSrc = computed(() => {
  const m = map_.value;
  if (!m.iframeUrl && (m.markerLat == null || m.markerLng == null)) return '';
  if (m.iframeUrl) return m.iframeUrl;
  const lat = m.markerLat!;
  const lng = m.markerLng!;
  const z = m.zoom ?? 15;
  const label = encodeURIComponent(contact.value.shortAddress || '');
  return `https://yandex.ru/map-widget/v1/?ll=${lng},${lat}&z=${z}&pt=${lng},${lat},pm2bll~${label}`;
});

async function loadAll() {
  // Load everything in one shot via public endpoint so we don't hit auth check
  const pub = await api<any>('/settings');
  contact.value.shortAddress = pub.contact.address;
  contact.value.fullAddress = pub.contact.fullAddress || '';
  contact.value.phones = pub.contact.phones?.length ? pub.contact.phones : [''];
  contact.value.email = pub.contact.email || '';
  if (Array.isArray(pub.contact.workingHours) && pub.contact.workingHours.length) {
    contact.value.workingHours = pub.contact.workingHours;
  }
  if (pub.contact.socials && Object.keys(pub.contact.socials).length) {
    contact.value.socials = { vk: '', telegram: '', whatsapp: '', instagram: '', ...pub.contact.socials };
  }

  brand.value.brandName = pub.brand.name;
  brand.value.brandTagline = pub.brand.tagline;
  brand.value.seoTitle = pub.seo.title || '';
  brand.value.seoDescription = pub.seo.description || '';
  brand.value.accentColor = pub.accentColor || '#E11D48';

  map_.value.provider = pub.map.provider;
  map_.value.iframeUrl = pub.map.iframeUrl || '';
  map_.value.markerLat = pub.map.markerLat;
  map_.value.markerLng = pub.map.markerLng;
  map_.value.zoom = pub.map.zoom;
  map_.value.customMarkerUrl = pub.map.customMarkerUrl || '';
  map_.value.routeStartHint = pub.map.routeStartHint;

  Object.assign(visibility.value, pub.pages);

  // Authoritative view — also pull the full row so any custom fields survive
  try {
    const all = await api<any>('/admin/site');
    // DB row "address" is the long form, "shortAddress" is the landmark one
    if (typeof all.address === 'string') contact.value.fullAddress = all.address;
    if (typeof all.shortAddress === 'string') contact.value.shortAddress = all.shortAddress;
  } catch {/* expected to fail on first run before admin login is required */}
}

function setMsg(s: Section, type: 'ok' | 'error', text: string) {
  message.value[s] = { type, text };
  setTimeout(() => { if (message.value[s]?.text === text) message.value[s] = null; }, 5000);
}

async function saveBrand() {
  saving.value.brand = true;
  try {
    await api('/admin/site/brand', { method: 'PUT', body: brand.value });
    setMsg('brand', 'ok', 'Бренд сохранён');
  } catch (e) {
    setMsg('brand', 'error', e instanceof ApiError ? e.message : 'Не удалось');
  } finally {
    saving.value.brand = false;
  }
}

async function saveContact() {
  saving.value.contact = true;
  try {
    const body: Record<string, unknown> = {
      shortAddress: contact.value.shortAddress,
      fullAddress: contact.value.fullAddress,
      phones: contact.value.phones.map((p) => p.trim()).filter(Boolean),
      email: contact.value.email,
      workingHours: contact.value.workingHours,
      socials: Object.fromEntries(
        Object.entries(contact.value.socials).filter(([, v]) => v.trim()),
      ),
    };
    await api('/admin/site/contact', { method: 'PUT', body });
    setMsg('contact', 'ok', 'Контакты сохранены');
  } catch (e) {
    setMsg('contact', 'error', e instanceof ApiError ? e.message : 'Не удалось');
  } finally {
    saving.value.contact = false;
  }
}

async function saveMap() {
  saving.value.map = true;
  try {
    const body: Record<string, unknown> = {
      provider: map_.value.provider,
      iframeUrl: map_.value.iframeUrl,
      markerLat: map_.value.markerLat,
      markerLng: map_.value.markerLng,
      zoom: map_.value.zoom,
      customMarkerUrl: map_.value.customMarkerUrl,
      routeStartHint: map_.value.routeStartHint,
    };
    await api('/admin/site/map', { method: 'PUT', body });
    setMsg('map', 'ok', 'Настройки карты сохранены');
  } catch (e) {
    setMsg('map', 'error', e instanceof ApiError ? e.message : 'Не удалось');
  } finally {
    saving.value.map = false;
  }
}

async function saveVisibility() {
  saving.value.visibility = true;
  try {
    await api('/admin/site/visibility', { method: 'PUT', body: visibility.value });
    setMsg('visibility', 'ok', 'Видимость обновлена');
  } catch (e) {
    setMsg('visibility', 'error', e instanceof ApiError ? e.message : 'Не удалось');
  } finally {
    saving.value.visibility = false;
  }
}

function addPhone() { contact.value.phones.push(''); }
function removePhone(i: number) { contact.value.phones.splice(i, 1); if (!contact.value.phones.length) contact.value.phones.push(''); }

function addSocial() {
  const key = prompt('Название сети (vk, telegram, whatsapp, instagram, …):')?.toLowerCase();
  if (!key) return;
  if (contact.value.socials[key]) { alert('Уже добавлено'); return; }
  contact.value.socials[key] = '';
}
function removeSocial(key: string) { delete contact.value.socials[key]; }

function onCoord(ev: Event, which: 'lat' | 'lng') {
  const v = (ev.target as HTMLInputElement).value;
  const n = v === '' ? null : Number(v);
  if (which === 'lat') map_.value.markerLat = Number.isFinite(n) ? n : null;
  else map_.value.markerLng = Number.isFinite(n) ? n : null;
}

// Lookup Yandex address → coords client-side via Yandex geocode API
// (uses publicly available JS API without key by hitting https://geocode-maps.yandex.ru/1.x)
async function geocodeYandex() {
  const addr = (contact.value.shortAddress || contact.value.fullAddress || '').trim();
  if (!addr) return;
  try {
    // OpenStreetMap Nominatim — free, no API key. Usage policy requires a User-Agent
    // header, which browsers send automatically as the page URL.
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1&accept-language=ru`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'ru' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: Array<{ lat: string; lon: string }> = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const hit = data[0]!;
      const lat = parseFloat(hit.lat);
      const lng = parseFloat(hit.lon);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        map_.value.markerLat = lat;
        map_.value.markerLng = lng;
        return;
      }
    }
    alert('Координаты не найдены. Введите их вручную или уточните адрес.');
  } catch {
    alert('Сервис геокодирования недоступен. Введите координаты вручную.');
  }
}

watch(() => contact.value.shortAddress, (v) => {
  // Don't auto-stomp existing coords
});

onMounted(loadAll);
</script>

<template>
  <div class="admin-settings">
    <header class="page-head">
      <h1>Настройки сайта</h1>
      <p class="page-sub">Бренд, контакты, карта и видимость разделов</p>
    </header>

    <!-- ====== BRAND ====== -->
    <section class="card">
      <header class="card__head">
        <div>
          <h2>Бренд</h2>
          <p>Название салона, описание, цвета</p>
        </div>
        <button class="btn btn--primary" :disabled="saving.brand" @click="saveBrand">
          {{ saving.brand ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </header>
      <div v-if="message.brand" :class="['flash', `flash--${message.brand.type}`]">{{ message.brand.text }}</div>
      <div class="grid">
        <label class="field">
          <span class="field__label">Название</span>
          <input v-model="brand.brandName" class="field__input" />
        </label>
        <label class="field">
          <span class="field__label">Слоган</span>
          <input v-model="brand.brandTagline" class="field__input" />
        </label>
        <label class="field">
          <span class="field__label">Акцентный цвет</span>
          <input v-model="brand.accentColor" class="field__input" type="color" />
          <span class="field__hint">Цвет кнопок и акцентов</span>
        </label>
        <label class="field">
          <span class="field__label">SEO title</span>
          <input v-model="brand.seoTitle" class="field__input" />
        </label>
        <label class="field" style="grid-column: 1 / -1;">
          <span class="field__label">SEO description</span>
          <textarea v-model="brand.seoDescription" class="field__input" rows="2" />
        </label>
      </div>
    </section>

    <!-- ====== CONTACT ====== -->
    <section class="card">
      <header class="card__head">
        <div>
          <h2>Контакты</h2>
          <p>Адрес, телефоны, email, часы работы, соцсети</p>
        </div>
        <button class="btn btn--primary" :disabled="saving.contact" @click="saveContact">
          {{ saving.contact ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </header>
      <div v-if="message.contact" :class="['flash', `flash--${message.contact.type}`]">{{ message.contact.text }}</div>

      <div class="grid">
        <label class="field">
          <span class="field__label">Короткий адрес (для карты и шапки)</span>
          <input v-model="contact.shortAddress" class="field__input" placeholder="г. Липецк, ул. Пушкина, 4" />
        </label>
        <label class="field">
          <span class="field__label">Полный адрес (для карточки)</span>
          <input v-model="contact.fullAddress" class="field__input" placeholder="г. Липецк, ул. Пушкина, 4, пом. 6" />
        </label>
        <label class="field">
          <span class="field__label">Email</span>
          <input v-model="contact.email" type="email" class="field__input" />
        </label>

        <div class="field">
          <span class="field__label">Телефоны</span>
          <div class="phones">
            <div v-for="(p, i) in contact.phones" :key="i" class="phones__row">
              <input v-model="contact.phones[i]" class="field__input" placeholder="8 (4742) ..." />
              <button type="button" class="icon-btn icon-btn--danger" @click="removePhone(i)">✕</button>
            </div>
            <button type="button" class="link-btn" @click="addPhone">+ телефон</button>
          </div>
        </div>

        <div class="field" style="grid-column: 1 / -1;">
          <span class="field__label">Часы работы</span>
          <div class="hours-table">
            <div class="hours-table__head">
              <span>День</span><span>Открыто</span><span>Закрыто</span><span>Выходной</span>
            </div>
            <div v-for="d in contact.workingHours" :key="d.day" class="hours-table__row">
              <span class="hours-table__day">{{ d.label }}</span>
              <input v-model="d.open" type="time" class="field__input" :disabled="d.isDayOff" />
              <input v-model="d.close" type="time" class="field__input" :disabled="d.isDayOff" />
              <label class="check">
                <input type="checkbox" v-model="d.isDayOff" />
                <span>вых.</span>
              </label>
            </div>
          </div>
        </div>

        <div class="field" style="grid-column: 1 / -1;">
          <span class="field__label">Соцсети</span>
          <div class="socials-list">
            <div v-for="(url, key) in contact.socials" :key="key" class="socials-list__row">
              <span class="socials-list__label">{{ key }}</span>
              <input v-model="contact.socials[key]" class="field__input" :placeholder="`https://${key}.com/...`" />
              <button type="button" class="icon-btn icon-btn--danger" @click="removeSocial(String(key))">✕</button>
            </div>
            <button type="button" class="link-btn" @click="addSocial">+ сеть</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== MAP ====== -->
    <section class="card">
      <header class="card__head">
        <div>
          <h2>Карта</h2>
          <p>Яндекс.Карты бесплатно. Можно вставить и iframe любого провайдера.</p>
        </div>
        <button class="btn btn--primary" :disabled="saving.map" @click="saveMap">
          {{ saving.map ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </header>
      <div v-if="message.map" :class="['flash', `flash--${message.map.type}`]">{{ message.map.text }}</div>

      <div class="grid">
        <label class="field">
          <span class="field__label">Провайдер</span>
          <select v-model="map_.provider" class="field__input">
            <option value="yandex">Яндекс.Карты (рекомендуем)</option>
            <option value="google">Google Maps</option>
            <option value="osm">OpenStreetMap</option>
            <option value="custom-iframe">Кастомный iframe</option>
          </select>
        </label>
        <label class="field">
          <span class="field__label">Масштаб</span>
          <input v-model.number="map_.zoom" type="number" min="1" max="21" class="field__input" />
        </label>

        <label class="field">
          <span class="field__label">Широта (lat)</span>
          <input
            :value="map_.markerLat ?? ''"
            @input="onCoord($event, 'lat')"
            type="number"
            step="any"
            class="field__input"
            placeholder="52.608672"
          />
        </label>
        <label class="field">
          <span class="field__label">Долгота (lng)</span>
          <input
            :value="map_.markerLng ?? ''"
            @input="onCoord($event, 'lng')"
            type="number"
            step="any"
            class="field__input"
            placeholder="39.598543"
          />
        </label>

        <div class="field" style="grid-column: 1 / -1;">
          <button type="button" class="link-btn" @click="geocodeYandex">
            Подставить координаты по адресу
          </button>
          <span class="field__hint">Через OpenStreetMap Nominatim. Бесплатно, ключ не требуется.</span>
        </div>

        <label class="field" style="grid-column: 1 / -1;">
          <span class="field__label">Кастомный iframe URL (необязательно)</span>
          <input v-model="map_.iframeUrl" class="field__input" placeholder="https://yandex.ru/map-widget/v1/?ll=39.598543,52.608672&z=15" />
          <span class="field__hint">Если заполнено — используется вместо автогенерации.</span>
        </label>

        <label class="field" style="grid-column: 1 / -1;">
          <span class="field__label">Кастомный значок на карте (необязательно)</span>
          <input v-model="map_.customMarkerUrl" class="field__input" placeholder="https://molodost48.ru/media/marker.png" />
          <span class="field__hint">
            Для полноценной подмены через Yandex JS API нужен свой ключ — пока используется стандартная
            красная метка. URL хранится для перехода на API-режим в будущем.
          </span>
        </label>

        <label class="field" style="grid-column: 1 / -1;">
          <span class="field__label">Подсказка «Откуда едете?»</span>
          <input v-model="map_.routeStartHint" class="field__input" />
        </label>

        <div v-if="mapPreviewSrc" class="map-preview" style="grid-column: 1 / -1;">
          <p class="map-preview__caption">Предпросмотр</p>
          <iframe :src="mapPreviewSrc" loading="lazy" />
        </div>
      </div>
    </section>

    <!-- ====== VISIBILITY ====== -->
    <section class="card">
      <header class="card__head">
        <div>
          <h2>Видимость разделов</h2>
          <p>Спрятать страницу или секцию без удаления</p>
        </div>
        <button class="btn btn--primary" :disabled="saving.visibility" @click="saveVisibility">
          {{ saving.visibility ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </header>
      <div v-if="message.visibility" :class="['flash', `flash--${message.visibility.type}`]">{{ message.visibility.text }}</div>

      <div class="vis-grid">
        <label class="toggle-row">
          <span>Страница «Услуги»</span>
          <input type="checkbox" v-model="visibility.servicesPageEnabled" />
        </label>
        <label class="toggle-row">
          <span>«Услуги» в навигации</span>
          <input type="checkbox" v-model="visibility.servicesInNavEnabled" />
        </label>
        <label class="toggle-row">
          <span>Секция «Услуги» на главной</span>
          <input type="checkbox" v-model="visibility.homeServicesSectionEnabled" />
        </label>
        <label class="toggle-row">
          <span>Страница «Мастера»</span>
          <input type="checkbox" v-model="visibility.mastersPageEnabled" />
        </label>
        <label class="toggle-row">
          <span>Страница «Галерея»</span>
          <input type="checkbox" v-model="visibility.galleryPageEnabled" />
        </label>
        <label class="toggle-row">
          <span>Страница «Акции»</span>
          <input type="checkbox" v-model="visibility.promotionsPageEnabled" />
        </label>
        <label class="toggle-row">
          <span>Страница «Отзывы»</span>
          <input type="checkbox" v-model="visibility.reviewsPageEnabled" />
        </label>
        <label class="toggle-row">
          <span>Страница «Вакансии»</span>
          <input type="checkbox" v-model="visibility.vacanciesPageEnabled" />
        </label>
        <label class="toggle-row">
          <span>Страница «FAQ»</span>
          <input type="checkbox" v-model="visibility.faqPageEnabled" />
        </label>
        <label class="toggle-row">
          <span>Страница «Контакты»</span>
          <input type="checkbox" v-model="visibility.contactsPageEnabled" />
        </label>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-settings { display: flex; flex-direction: column; gap: 1.25rem; max-width: 880px; }

.page-head { margin-bottom: 0.5rem; }
.page-head h1 { font-family: var(--font-display); font-size: 1.75rem; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 0.25rem; }
.page-sub { color: var(--color-text-muted); font-size: 0.875rem; }

.card {
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-2);
  flex-wrap: wrap;
}
.card__head h2 { font-size: 1.05rem; font-weight: 600; }
.card__head p { font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.15rem; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  padding: 1.25rem 1.5rem 1.5rem;
}

.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field__label { font-size: 0.8rem; color: var(--color-text-secondary); font-weight: 500; }
.field__input {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.55rem 0.8rem;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 0.9rem;
}
.field__input:focus { outline: none; border-color: var(--color-accent); }
.field__hint { font-size: 0.75rem; color: var(--color-text-muted); }

.btn {
  padding: 0.5rem 1rem;
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
.btn--primary:hover { background: var(--color-accent-hover); border-color: var(--color-accent-hover); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.link-btn {
  background: transparent;
  border: 1px dashed var(--color-border);
  padding: 0.45rem 0.8rem;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 0.825rem;
  cursor: pointer;
  width: fit-content;
}
.link-btn:hover { color: var(--color-accent); border-color: var(--color-accent); }

.icon-btn {
  width: 28px; height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
}
.icon-btn:hover { background: var(--color-surface-2); color: var(--color-text-primary); }
.icon-btn--danger:hover { color: var(--color-danger); background: rgba(239, 68, 68, 0.1); }

.phones, .socials-list { display: flex; flex-direction: column; gap: 0.5rem; }
.phones__row, .socials-list__row {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}
.phones__row .field__input, .socials-list__row .field__input { flex: 1; }
.socials-list__label { font-size: 0.8rem; color: var(--color-text-muted); text-transform: capitalize; min-width: 90px; }

.hours-table {
  display: grid;
  grid-template-columns: 60px 1fr 1fr 80px;
  gap: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.75rem;
  background: var(--color-surface-2);
}
.hours-table__head {
  display: contents;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  font-weight: 600;
}
.hours-table__head > span { padding: 0 0.4rem 0.4rem; border-bottom: 1px solid var(--color-border); }
.hours-table__row { display: contents; }
.hours-table__row > .hours-table__day { padding: 0.4rem 0.4rem 0; font-weight: 600; font-size: 0.9rem; }
.hours-table__row .field__input { padding: 0.35rem 0.5rem; font-size: 0.85rem; }
.check { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; padding-top: 0.4rem; }
.check input { accent-color: var(--color-accent); }

.map-preview {
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
}
.map-preview__caption {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  margin: 0;
  padding: 0.5rem 0.85rem;
  background: var(--color-surface-2);
  border-bottom: 1px solid var(--color-border);
  font-weight: 600;
}
.map-preview iframe { display: block; width: 100%; height: 360px; border: none; }

.vis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.4rem;
  padding: 1.25rem 1.5rem 1.5rem;
}
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  cursor: pointer;
}
.toggle-row:hover { border-color: var(--color-accent); }
.toggle-row input { accent-color: var(--color-accent); width: 18px; height: 18px; }

.flash {
  margin: 0 1.5rem;
  padding: 0.5rem 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
}
.flash--ok { background: rgba(34, 197, 94, 0.12); color: var(--color-success); border: 1px solid rgba(34, 197, 94, 0.3); }
.flash--error { background: rgba(239, 68, 68, 0.12); color: var(--color-danger); border: 1px solid rgba(239, 68, 68, 0.3); }

@media (max-width: 700px) {
  .grid { grid-template-columns: 1fr; }
  .hours-table { grid-template-columns: 50px 1fr 1fr 60px; gap: 0.35rem; font-size: 0.85rem; }
}
</style>