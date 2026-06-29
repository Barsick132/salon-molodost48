<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import { api } from '@/api/client';
import type { DikidiConfig } from '@molodost/shared';

const loading = ref(true);
const saving = ref(false);
const syncing = ref(false);
const error = ref('');
const success = ref('');

const form = reactive<{
  enabled: boolean;
  publicPageUrl: string;
  businessId: string;
  widgetUrl: string;
  buttonLabel: string;
  stickyMobile: boolean;
  apiToken: string;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
}>({
  enabled: true,
  publicPageUrl: 'https://dikidi.ru/1475188',
  businessId: '1475188',
  widgetUrl: 'https://dikidi.ru/widget/1475188',
  buttonLabel: 'Записаться',
  stickyMobile: true,
  apiToken: '',
  lastSyncAt: null,
  lastSyncStatus: null,
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = await api<DikidiConfig & { lastSyncAt: string | null; lastSyncStatus: string | null }>(
      '/admin/integrations/dikidi',
    );
    if (data) {
      Object.assign(form, data);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось загрузить настройки';
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  error.value = '';
  success.value = '';
  try {
    await api('/admin/integrations/dikidi', { method: 'PUT', body: form });
    success.value = 'Сохранено';
    setTimeout(() => (success.value = ''), 2500);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось сохранить';
  } finally {
    saving.value = false;
  }
}

async function sync() {
  syncing.value = true;
  error.value = '';
  success.value = '';
  try {
    const res = await api<{ ok: boolean; message?: string }>('/admin/integrations/dikidi/sync', { method: 'POST' });
    success.value = res.message ?? 'Синхронизация поставлена в очередь';
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не удалось синхронизировать';
  } finally {
    syncing.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="page">
    <header>
      <h1>Интеграции</h1>
      <p class="muted">Подключённые внешние сервисы</p>
    </header>

    <section v-if="loading" class="loading">Загрузка…</section>

    <section v-else class="card">
      <div class="card-header">
        <div>
          <h2>Dikidi — онлайн-запись</h2>
          <p class="muted">
            Виджет бронирования на нашем сайте + синхронизация каталога через Dikidi Business API.
            <a href="https://dikidi.ru" target="_blank" rel="noopener">dikidi.ru ↗</a>
          </p>
        </div>
        <label class="switch">
          <input v-model="form.enabled" type="checkbox" />
          <span>Включено</span>
        </label>
      </div>

      <form @submit.prevent="save">
        <div class="grid">
          <label>
            <span>Публичная страница (URL)</span>
            <input v-model="form.publicPageUrl" type="url" required />
          </label>
          <label>
            <span>Business ID</span>
            <input v-model="form.businessId" type="text" required />
          </label>
          <label class="full">
            <span>Widget URL (для iframe)</span>
            <input v-model="form.widgetUrl" type="url" required />
          </label>
          <label>
            <span>Текст кнопки</span>
            <input v-model="form.buttonLabel" type="text" maxlength="40" />
          </label>
          <label class="switch-label">
            <input v-model="form.stickyMobile" type="checkbox" />
            <span>Sticky-кнопка на мобильных</span>
          </label>
          <label class="full">
            <span>Dikidi Business API token <em>(опционально, для синхронизации каталога)</em></span>
            <input v-model="form.apiToken" type="password" placeholder="оставьте пустым, если не используете API" />
          </label>
        </div>

        <div v-if="form.lastSyncAt" class="sync-info">
          <p><strong>Последняя синхронизация:</strong> {{ new Date(form.lastSyncAt).toLocaleString('ru-RU') }}</p>
          <p v-if="form.lastSyncStatus" :class="form.lastSyncStatus.startsWith('ok') ? 'ok' : 'pending'">
            {{ form.lastSyncStatus }}
          </p>
        </div>

        <div class="actions">
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'Сохраняем…' : 'Сохранить' }}
          </button>
          <button
            type="button"
            class="btn-secondary"
            :disabled="syncing || !form.apiToken"
            :title="!form.apiToken ? 'Сначала добавьте API token' : ''"
            @click="sync"
          >
            {{ syncing ? 'Синхронизируем…' : 'Синхронизировать каталог' }}
          </button>
          <p v-if="success" class="ok">{{ success }}</p>
          <p v-if="error" class="err">{{ error }}</p>
        </div>
      </form>
    </section>

    <section class="card info">
      <h3>Как получить Dikidi Business API token</h3>
      <ol>
        <li>Зайдите в <a href="https://business.dikidi.ru" target="_blank" rel="noopener">business.dikidi.ru</a> как владелец салона.</li>
        <li>Раздел «Настройки» → «Интеграции» → «API».</li>
        <li>Создайте новый API-ключ с правами на чтение каталога и расписания.</li>
        <li>Скопируйте токен и вставьте в поле выше.</li>
      </ol>
      <p class="muted">
        Когда токен добавлен, кнопка «Синхронизировать каталог» подтянет актуальные услуги и мастеров из Dikidi.
        Сейчас синхронизация — заглушка; полная реализация появится, как только у нас будет реальный токен.
      </p>
    </section>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: var(--space-8); }
header h1 { font-size: var(--font-size-2xl); margin-bottom: var(--space-1); }
.muted { color: var(--color-text-secondary); font-size: var(--font-size-sm); }

.card {
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-6);
}
.card-header h2 { font-size: var(--font-size-xl); margin-bottom: var(--space-2); }

.switch {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}
.switch input { width: 40px; height: 22px; accent-color: var(--color-accent); }

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.grid .full { grid-column: 1 / -1; }
label {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
label > span {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
label > span em { color: var(--color-text-muted); font-style: normal; }
input[type=text], input[type=url], input[type=password] {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  font-family: inherit;
}
input:focus { outline: none; border-color: var(--color-accent); }

.switch-label { flex-direction: row; align-items: center; gap: var(--space-2); }

.sync-info {
  margin-top: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-2);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}
.sync-info .ok { color: var(--color-success); }
.sync-info .pending { color: var(--color-warning); }

.actions {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  margin-top: var(--space-6);
  flex-wrap: wrap;
}
.btn-primary, .btn-secondary {
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-primary { background: var(--color-accent); color: white; }
.btn-primary:hover:not(:disabled) { background: var(--color-accent-hover); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: var(--color-surface-2); color: var(--color-text-primary); border-color: var(--color-border); }
.btn-secondary:hover:not(:disabled) { border-color: var(--color-accent); }
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
.ok { color: var(--color-success); }
.err { color: var(--color-danger); }

.info h3 { margin-bottom: var(--space-3); font-size: var(--font-size-base); }
.info ol { padding-left: var(--space-6); margin-bottom: var(--space-3); }
.info li { margin-bottom: var(--space-2); }

a { color: var(--color-accent); }
a:hover { color: var(--color-accent-hover); }

@media (max-width: 768px) {
  .grid { grid-template-columns: 1fr; }
  .card-header { flex-direction: column; }
}
</style>