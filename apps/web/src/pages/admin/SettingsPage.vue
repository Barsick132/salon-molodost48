<script setup lang="ts">
/**
 * Admin SettingsPage — manages SiteSettings.
 *
 * Sections:
 *   • Brand       — name, tagline, SEO, accent color, **logo upload**, **favicon upload**
 *   • Contact     — short/long address, phones, email, hours, socials
 *   • Map         — provider (Yandex by default), coords, custom iframe, custom marker URL, zoom
 *   • Visibility  — page and section toggles (services, masters, contacts …)
 *
 * Each section saves independently via PUT /admin/site/{section}.
 */
import { ref, computed, onMounted } from 'vue';
import { api, ApiError } from '@/api/client';

// Working hours are a single free-form text field. Examples:
//   "пн-пт 10:00–20:00, сб-вс выходной"
//   "Ежедневно 10:00–20:00"
//   "пн-сб 09:00–21:00, вс — выходной"
const PLACEHOLDER_HOURS = 'пн-пт 10:00–20:00, сб-вс выходной'

// Accent colour presets for the picker UI. Each one is balanced for
// the dark theme (saturation + lightness picked together) so nothing
// looks washed out or harsh on the surface. The default #E11D48
// (rose-600) is the current brand colour and is always present.
const ACCENT_PRESETS = [
  '#E11D48', // rose-600, current default
  '#DC2626', // red-600, pure fire
  '#F59E0B', // amber-500, warm gold
  '#10B981', // emerald-500, fresh green
  '#0EA5E9', // sky-500, cool blue
  '#8B5CF6', // violet-500, mystical purple
  '#EC4899', // pink-500, flirty pink
  '#F97316', // orange-500, citrus pop
] as const

type Section = 'contact' | 'map' | 'visibility' | 'brand' | 'cta';
const saving = ref<Record<Section, boolean>>({ contact: false, map: false, visibility: false, brand: false, cta: false });
const message = ref<Record<Section, { type: 'ok' | 'error'; text: string } | null>>({
  contact: null, map: null, visibility: null, brand: null, cta: null,
});
const uploadError = ref<string | null>(null);

// Brand
const brand = ref({
  brandName: 'Молодость',
  brandTagline: 'Салон красоты бизнес-класса',
  seoTitle: '',
  seoDescription: '',
  accentColor: '#E11D48',
  logoUrl: '',
  faviconUrl: '',
});
const logoUploading = ref(false);
const faviconUploading = ref(false);

async function uploadImage(field: 'logo' | 'favicon', file: File) {
  if (field === 'logo') logoUploading.value = true;
  else faviconUploading.value = true;
  uploadError.value = null;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/media', {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || `${res.status}`);
    }
    const data = await res.json() as { url: string };
    if (field === 'logo') brand.value.logoUrl = data.url;
    else brand.value.faviconUrl = data.url;
  } catch (e) {
    uploadError.value = e instanceof Error ? e.message : 'upload failed';
  } finally {
    if (field === 'logo') logoUploading.value = false;
    else faviconUploading.value = false;
  }
}

function pickFile(field: 'logo' | 'favicon') {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp,image/svg+xml';
  input.onchange = () => {
    const f = input.files?.[0];
    if (f) uploadImage(field, f);
  };
  input.click();
}

async function clearImage(field: 'logo' | 'favicon') {
  if (field === 'logo') brand.value.logoUrl = '';
  else brand.value.faviconUrl = '';
}

// Contact
const contact = ref({
  shortAddress: '',
  fullAddress: '',
  phones: [''],
  email: '',
  workingHours: PLACEHOLDER_HOURS,
  socials: { vk: '', telegram: '', whatsapp: '', instagram: '' } as Record<string, string>,
});

// Map: only three things matter — provider (yandex / custom / hidden),
// iframeUrl (only when provider = "custom"), zoom. No more
// coords / custom marker / route start hint.
const map_ = ref({
  provider: 'yandex' as 'yandex' | 'custom' | 'hidden',
  iframeUrl: '',
  zoom: 15,
});

// Visibility: only the services module toggle now.
const visibility = ref({
  servicesPageEnabled: true,
  homeServicesSectionEnabled: true,
  servicesInNavEnabled: true,
});

// CTA — single source of truth for the "Записаться онлайн" button.
const cta = ref({
  ctaLabel: 'Записаться онлайн',
  ctaUrl: 'https://dikidi.ru/#widget=212727',
  ctaShowInToolbar: true,
  ctaShowInBanner: true,
  ctaShowInCtaStrip: true,
});

const accentPresets = ACCENT_PRESETS

// Map preview iframe src. Yandex has a free map-widget generator that
// takes a query string. When provider = "yandex" we point the iframe
// at the address — no coords, no API key. When provider = "custom"
// we just embed the user-supplied iframe URL. Hidden -> no iframe.
const mapPreviewSrc = computed(() => {
  const m = map_.value;
  if (m.provider === 'hidden') return '';
  if (m.provider === 'custom') return m.iframeUrl || '';
  const q = encodeURIComponent(contact.value.shortAddress || contact.value.fullAddress || '');
  const z = m.zoom ?? 15;
  return `https://yandex.ru/map-widget/v1/?text=${q}&z=${z}`;
});

async function loadAll() {
  const pub = await api<any>('/settings');
  brand.value.brandName = pub.brand.name;
  brand.value.brandTagline = pub.brand.tagline;
  brand.value.seoTitle = pub.seo.title || '';
  brand.value.seoDescription = pub.seo.description || '';
  brand.value.accentColor = pub.accentColor || '#E11D48';
  brand.value.logoUrl = pub.logoUrl || '';
  brand.value.faviconUrl = pub.faviconUrl || '';

  contact.value.shortAddress = pub.contact.address;
  contact.value.fullAddress = pub.contact.fullAddress || '';
  contact.value.phones = pub.contact.phones?.length ? pub.contact.phones : [''];
  contact.value.email = pub.contact.email || '';
  contact.value.workingHours = pub.contact.workingHours || PLACEHOLDER_HOURS;
  if (pub.contact.socials && Object.keys(pub.contact.socials).length) {
    contact.value.socials = { vk: '', telegram: '', whatsapp: '', instagram: '', ...pub.contact.socials };
  }

  map_.value.provider = pub.map.provider || 'yandex';
  map_.value.iframeUrl = pub.map.iframeUrl || '';
  map_.value.zoom = pub.map.zoom || 15;

  Object.assign(visibility.value, pub.pages);

  if (pub.cta) {
    cta.value.ctaLabel = pub.cta.label || 'Записаться онлайн';
    cta.value.ctaUrl = pub.cta.url || 'https://dikidi.ru/#widget=212727';
    cta.value.ctaShowInToolbar = pub.cta.showInToolbar !== false;
    cta.value.ctaShowInBanner = pub.cta.showInBanner !== false;
    cta.value.ctaShowInCtaStrip = pub.cta.showInCtaStrip !== false;
  }
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
      workingHoursText: contact.value.workingHours,
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
      zoom: map_.value.zoom,
    };
    await api('/admin/site/map', { method: 'PUT', body });
    setMsg('map', 'ok', 'Настройки карты сохранены');
  } catch (e) {
    setMsg('map', 'error', e instanceof ApiError ? e.message : 'Не удалось');
  } finally {
    saving.value.map = false;
  }
}

async function saveCta() {
  saving.value.cta = true;
  try {
    await api('/admin/site/cta', { method: 'PUT', body: cta.value });
    setMsg('cta', 'ok', 'Кнопка «Записаться онлайн» обновлена');
  } catch (e) {
    setMsg('cta', 'error', e instanceof ApiError ? e.message : 'Не удалось');
  } finally {
    saving.value.cta = false;
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




onMounted(loadAll);
</script>

<template>
  <div class="admin-settings">
    <header class="page-head">
      <h1>Настройки сайта</h1>
      <p class="page-sub">Бренд, контакты, карта и видимость разделов</p>
    </header>

    <!-- ====== DESIGN ====== -->
    <section class="card card--accent">
      <header class="card__head">
        <div>
          <h2>Дизайн</h2>
          <p>Акцентный цвет — определяет кнопки, ссылки, hover-состояния и hero accent.</p>
        </div>
        <button class="btn btn--primary" :disabled="saving.brand" @click="saveBrand">
          {{ saving.brand ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </header>
      <div v-if="message.brand" :class="['flash', `flash--${message.brand.type}`]">{{ message.brand.text }}</div>

      <div class="accent-picker">
        <label class="accent-picker__swatch-wrap">
          <input
            v-model="brand.accentColor"
            type="color"
            class="accent-picker__native"
            aria-label="Выбор акцентного цвета"
          />
          <span class="accent-picker__swatch" :style="{ background: brand.accentColor }" />
        </label>
        <div class="accent-picker__controls">
          <label class="field">
            <span class="field__label">HEX</span>
            <input
              v-model="brand.accentColor"
              class="field__input field__input--mono"
              spellcheck="false"
              maxlength="7"
            />
          </label>
          <div class="accent-picker__presets">
            <button
              v-for="preset in accentPresets"
              :key="preset"
              type="button"
              class="accent-picker__preset"
              :style="{ background: preset }"
              :aria-label="`Пресет ${preset}`"
              @click="brand.accentColor = preset"
            />
          </div>
        </div>
        <div class="accent-picker__preview">
          <span class="field__hint">Где используется</span>
          <div class="accent-picker__chips">
            <span class="accent-chip accent-chip--bg" :style="{ background: brand.accentColor }">Кнопка</span>
            <span class="accent-chip accent-chip--text" :style="{ color: brand.accentColor }">Ссылка / hover</span>
            <span class="accent-chip accent-chip--border" :style="{ borderColor: brand.accentColor }">Граница</span>
            <span class="accent-chip accent-chip--dot" :style="{ background: brand.accentColor }" />
          </div>
        </div>
      </div>
    </section>

    <!-- ====== BRAND ====== -->
    <section class="card">
      <header class="card__head">
        <div>
          <h2>Бренд</h2>
          <p>Название, слоган, логотип, SEO</p>
        </div>
      </header>

      <!-- Logo + Favicon uploaders -->
      <div class="grid grid--two">
        <div class="image-uploader">
          <div class="image-uploader__label">Логотип</div>
          <div class="image-uploader__preview">
            <img v-if="brand.logoUrl" :src="brand.logoUrl" alt="Логотип" />
            <span v-else class="image-uploader__placeholder">Логотип не загружен</span>
          </div>
          <div class="image-uploader__actions">
            <button class="btn" :disabled="logoUploading" @click="pickFile('logo')">
              {{ logoUploading ? 'Загружаем…' : 'Загрузить' }}
            </button>
            <button v-if="brand.logoUrl" class="btn btn--ghost" @click="clearImage('logo')">Удалить</button>
          </div>
        </div>
        <div class="image-uploader">
          <div class="image-uploader__label">Иконка вкладки (favicon)</div>
          <div class="image-uploader__preview image-uploader__preview--sq">
            <img v-if="brand.faviconUrl" :src="brand.faviconUrl" alt="Favicon" />
            <span v-else class="image-uploader__placeholder">—</span>
          </div>
          <div class="image-uploader__actions">
            <button class="btn" :disabled="faviconUploading" @click="pickFile('favicon')">
              {{ faviconUploading ? 'Загружаем…' : 'Загрузить' }}
            </button>
            <button v-if="brand.faviconUrl" class="btn btn--ghost" @click="clearImage('favicon')">Удалить</button>
          </div>
        </div>
      </div>
      <div v-if="uploadError" class="flash flash--error">{{ uploadError }}</div>

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
          <input
            v-model="contact.workingHours"
            class="field__input"
            :placeholder="PLACEHOLDER_HOURS"
          />
          <span class="field__hint">
            Одна строка в свободной форме. Примеры: «пн-пт 10:00–20:00, сб-вс выходной», «Ежедневно 10:00–20:00».
          </span>
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
          <p>Яндекс.Карты бесплатно, генерируются по адресу автоматически. Можно скрыть или вставить свой iframe.</p>
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
            <option value="yandex">Яндекс.Карты (по адресу, бесплатно)</option>
            <option value="custom">Кастомный iframe</option>
            <option value="hidden">Скрыть карту</option>
          </select>
        </label>
        <label class="field" v-if="map_.provider !== 'hidden'">
          <span class="field__label">Масштаб</span>
          <input v-model.number="map_.zoom" type="number" min="1" max="21" class="field__input" />
        </label>

        <label class="field" v-if="map_.provider === 'custom'" style="grid-column: 1 / -1;">
          <span class="field__label">URL iframe (любой провайдер)</span>
          <input v-model="map_.iframeUrl" class="field__input" placeholder="https://yandex.ru/map-widget/v1/?text=г.%20Липецк&z=15" />
          <span class="field__hint">Вставьте полный src из встраивания любого картографического сервиса.</span>
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
      </div>
    </section>

    <!-- ====== CTA ====== -->
    <section class="card">
      <header class="card__head">
        <div>
          <h2>Кнопка «Записаться онлайн»</h2>
          <p>Один источник для тулбара, баннера и блока «Готовы записаться». Везде одинаковый текст и ссылка.</p>
        </div>
        <button class="btn btn--primary" :disabled="saving.cta" @click="saveCta">
          {{ saving.cta ? 'Сохраняем…' : 'Сохранить' }}
        </button>
      </header>
      <div v-if="message.cta" :class="['flash', `flash--${message.cta.type}`]">{{ message.cta.text }}</div>

      <div class="grid">
        <label class="field">
          <span class="field__label">Текст кнопки</span>
          <input v-model="cta.ctaLabel" class="field__input" placeholder="Записаться онлайн" />
        </label>
        <label class="field" style="grid-column: 1 / -1;">
          <span class="field__label">Ссылка (URL)</span>
          <input v-model="cta.ctaUrl" class="field__input" placeholder="https://dikidi.ru/#widget=..." />
          <span class="field__hint">Куда ведёт кнопка: запись через Dikidi, WhatsApp, прямой телефон — что угодно.</span>
        </label>

        <div style="grid-column: 1 / -1; display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center; padding: 0.5rem 0;">
          <strong style="font-size: 0.8rem; color: var(--color-text-secondary); width: 100%;">Показывать на:</strong>
          <label class="check">
            <input type="checkbox" v-model="cta.ctaShowInToolbar" />
            <span>Тулбар (вверху страницы)</span>
          </label>
          <label class="check">
            <input type="checkbox" v-model="cta.ctaShowInBanner" />
            <span>Баннерный блок (главная)</span>
          </label>
          <label class="check">
            <input type="checkbox" v-model="cta.ctaShowInCtaStrip" />
            <span>Блок «Готовы записаться» (если включён)</span>
          </label>
        </div>
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

/* ===== Accent colour picker (Дизайн card) =====
   The native <input type="color"> is visually tiny and ugly on every
   browser, so we hide it and overlay a big swatch button that proxies
   clicks to it. The HEX input + preset chips give precise control
   without making people hand-type a 6-digit hex. */
.card--accent { border-top: 2px solid var(--color-accent); }

.accent-picker {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  gap: 1.5rem;
  align-items: start;
}
.accent-picker__swatch-wrap {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: var(--radius-md, 8px);
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 4px 14px -4px rgba(0, 0, 0, 0.4);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.accent-picker__swatch-wrap:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px -4px rgba(0, 0, 0, 0.5);
}
.accent-picker__swatch {
  display: block;
  width: 100%;
  height: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
/* Native picker is invisible but receives clicks via the wrap. */
.accent-picker__native {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: 0;
  padding: 0;
}

.accent-picker__controls { display: flex; flex-direction: column; gap: 0.85rem; }
.field__input--mono { font-family: ui-monospace, 'SF Mono', Menlo, monospace; letter-spacing: 0.04em; text-transform: uppercase; }

.accent-picker__presets {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 0.4rem;
}
.accent-picker__preset {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.12s ease;
  padding: 0;
}
.accent-picker__preset:hover {
  transform: scale(1.08);
  border-color: rgba(255, 255, 255, 0.4);
}

.accent-picker__preview { display: flex; flex-direction: column; gap: 0.55rem; }
.accent-picker__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.accent-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.7rem;
  font-size: 0.78rem;
  border-radius: 6px;
  font-weight: 600;
}
.accent-chip--bg { color: #fff; }
.accent-chip--text {
  background: var(--color-surface-2, #1f1f1f);
  border: 1px solid var(--color-border, #2a2a2a);
}
.accent-chip--border {
  background: transparent;
  color: var(--color-text-primary, #fff);
  border: 2px solid;
}
.accent-chip--dot {
  width: 14px;
  height: 14px;
  padding: 0;
  border-radius: 50%;
}

@media (max-width: 800px) {
  .accent-picker {
    grid-template-columns: 1fr;
  }
  .accent-picker__swatch-wrap { width: 72px; height: 72px; }
  .accent-picker__presets { grid-template-columns: repeat(8, 1fr); }
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  padding: 1.25rem 1.5rem 1.5rem;
}
.grid--two {
  grid-template-columns: 1fr 1fr;
  padding-bottom: 0.5rem;
}

.image-uploader {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.image-uploader__label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}
.image-uploader__preview {
  height: 80px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}
.image-uploader__preview--sq {
  width: 80px;
}
.image-uploader__preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.image-uploader__placeholder {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
.image-uploader__actions { display: flex; gap: 0.4rem; }

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
.btn--ghost { background: transparent; }
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
  .grid--two { grid-template-columns: 1fr; }
  .hours-table { grid-template-columns: 50px 1fr 1fr 60px; gap: 0.35rem; font-size: 0.85rem; }
}
</style>