<script setup lang="ts">
/**
 * Integrations admin page — Dikidi configuration.
 *
 * We intentionally keep the surface area tiny: a single widget URL plus a
 * global on/off toggle. Field-truth source: packages/shared/src/integrations.ts.
 */
import { ref, onMounted } from 'vue';
import { api, ApiError } from '@/api/client';

interface Dikidi {
  enabled: boolean;
  widgetUrl: string;
  buttonLabel: string;
}

const dikidi = ref<Dikidi>({
  enabled: true,
  widgetUrl: 'https://dikidi.ru/#widget=212727',
  buttonLabel: 'Записаться',
});

const loading = ref(true);
const saving = ref(false);
const message = ref<{ type: 'ok' | 'error'; text: string } | null>(null);

async function load() {
  loading.value = true;
  try {
    const data = await api<Dikidi>('/admin/integrations/dikidi');
    dikidi.value = data;
  } catch (e) {
    message.value = { type: 'error', text: e instanceof ApiError ? e.message : 'Ошибка загрузки' };
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  message.value = null;
  try {
    await api('/admin/integrations/dikidi', { method: 'PUT', body: dikidi.value });
    message.value = { type: 'ok', text: 'Сохранено. Изменения вступят в силу сразу.' };
  } catch (e) {
    message.value = { type: 'error', text: e instanceof ApiError ? e.message : 'Не удалось сохранить' };
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="admin-integrations">
    <header class="page-head">
      <h1>Интеграции</h1>
      <p class="page-sub">Сторонние сервисы, к которым подключён сайт</p>
    </header>

    <article v-if="!loading" class="int-card">
      <header class="int-card__head">
        <div class="int-card__title">
          <h2>DiKiDi</h2>
          <span class="int-card__sub">Онлайн-запись на услуги салона</span>
        </div>
        <label class="switch" :title="dikidi.enabled ? 'Кнопка записи показывается везде' : 'Кнопка записи скрыта'">
          <input
            type="checkbox"
            v-model="dikidi.enabled"
            :disabled="saving"
          />
          <span class="switch__track"><span class="switch__thumb" /></span>
          <span class="switch__label">{{ dikidi.enabled ? 'Включено' : 'Выключено' }}</span>
        </label>
      </header>

      <div class="int-card__body">
        <div v-if="message" :class="['int-message', `int-message--${message.type}`]">{{ message.text }}</div>

        <label class="field">
          <span class="field__label">Ссылка виджета</span>
          <input
            v-model="dikidi.widgetUrl"
            type="url"
            class="field__input"
            placeholder="https://dikidi.ru/#widget=212727"
            :disabled="saving"
          />
          <span class="field__hint">
            Один URL — для модального виджета используйте формат
            <code>https://dikidi.ru/#widget=212727</code>,
            для публичной страницы салона — <code>https://dikidi.ru/1475188</code>.
            Скрипт Dikidi сам обработает клик и откроет запись в модальном окне;
            без скрипта ссылка откроется в новой вкладке.
          </span>
        </label>

        <label class="field">
          <span class="field__label">Текст кнопки по умолчанию</span>
          <input
            v-model="dikidi.buttonLabel"
            type="text"
            maxlength="40"
            class="field__input"
            :disabled="saving"
          />
        </label>

        <div class="preview">
          <p class="preview__caption">Предпросмотр</p>
          <a
            v-if="dikidi.enabled"
            :href="dikidi.widgetUrl"
            target="_blank"
            rel="noopener"
            :class="['booking-preview-btn', `booking-preview-btn--${dikidi.enabled ? 'primary' : ''}`]"
          >
            {{ dikidi.buttonLabel || 'Записаться' }}
          </a>
          <span v-else class="preview__hidden">Кнопка скрыта по всему сайту.</span>
        </div>

        <footer class="int-card__foot">
          <button type="button" class="btn btn--primary" :disabled="saving" @click="save">
            {{ saving ? 'Сохраняем…' : 'Сохранить' }}
          </button>
        </footer>
      </div>
    </article>

    <p v-if="loading" class="loading">Загружаем…</p>
  </div>
</template>

<style scoped>
.admin-integrations { max-width: 720px; }

.page-head { margin-bottom: 1.5rem; }
.page-head h1 {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-bottom: 0.25rem;
}
.page-sub { color: var(--color-text-muted); font-size: 0.875rem; }

.int-card {
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.int-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-2);
  gap: 1rem;
}
.int-card__title h2 { font-size: 1.125rem; font-weight: 600; }
.int-card__sub {
  font-size: 0.825rem;
  color: var(--color-text-muted);
  display: block;
  margin-top: 0.15rem;
}
.int-card__body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.int-card__foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
}

.switch {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  user-select: none;
}
.switch input { position: absolute; opacity: 0; pointer-events: none; }
.switch__track {
  width: 38px;
  height: 22px;
  background: var(--color-surface-3);
  border-radius: 999px;
  position: relative;
  transition: background 0.2s ease;
}
.switch__thumb {
  position: absolute;
  top: 2px; left: 2px;
  width: 18px; height: 18px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.switch input:checked + .switch__track { background: var(--color-accent); }
.switch input:checked + .switch__track .switch__thumb { transform: translateX(16px); }
.switch__label { font-size: 0.85rem; color: var(--color-text-secondary); }
.switch input:disabled + .switch__track { opacity: 0.5; }

.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field__label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}
.field__input {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.85rem;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 0.95rem;
  transition: border-color 0.15s ease;
}
.field__input:focus { outline: none; border-color: var(--color-accent); }
.field__input:disabled { opacity: 0.6; }
.field__hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  line-height: 1.45;
}
.field__hint code {
  background: var(--color-surface-3);
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  font-size: 0.85em;
  font-family: ui-monospace, monospace;
}

.preview {
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  background: var(--color-surface-2);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-items: flex-start;
}
.preview__caption {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  margin: 0;
  font-weight: 600;
}
.preview__hidden {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.booking-preview-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.65rem 1.25rem;
  background: var(--color-accent);
  color: white;
  border-radius: var(--radius-md);
  font-weight: 600;
  text-decoration: none;
  font-size: 0.95rem;
}
.booking-preview-btn:hover { background: var(--color-accent-hover); }

.btn {
  padding: 0.55rem 1.1rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid var(--color-border);
  background: var(--color-surface-1);
  color: var(--color-text-primary);
}
.btn--primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}
.btn--primary:hover { background: var(--color-accent-hover); border-color: var(--color-accent-hover); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.int-message {
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
}
.int-message--ok { background: rgba(34, 197, 94, 0.12); color: var(--color-success); border: 1px solid rgba(34, 197, 94, 0.3); }
.int-message--error { background: rgba(239, 68, 68, 0.12); color: var(--color-danger); border: 1px solid rgba(239, 68, 68, 0.3); }

.loading { padding: 2rem; text-align: center; color: var(--color-text-muted); }
</style>