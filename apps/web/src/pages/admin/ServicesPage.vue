<script setup lang="ts">
/**
 * AdminServicesPage — управление категориями и услугами.
 *
 * Layout:
 *   - Tab toggle: Категории | Услуги
 *   - Categories tab: список с inline edit, кнопки reorder, добавление
 *   - Services tab: таблица с фильтром по категории, inline status toggle,
 *     кнопки reorder, modal для create/edit
 *
 * Использует /api/admin/services/* (auth required).
 */
import { ref, onMounted } from 'vue';
import { api, ApiError } from '@/api/client';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  order: number;
  isActive: boolean;
  serviceCount: number;
}
interface Service {
  id: string;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  name: string;
  description: string;
  priceFrom: number | null;
  priceTo: number | null;
  durationMinutes: number | null;
  isPopular: boolean;
  isActive: boolean;
  order: number;
}

type Tab = 'services' | 'categories';
const tab = ref<Tab>('services');

const categories = ref<Category[]>([]);
const services = ref<Service[]>([]);
const loading = ref(true);
const error = ref('');
const filterCategoryId = ref<string>('');
const showInactive = ref(false);

// ====== Modal (create/edit service) ======
const editingService = ref<Partial<Service> | null>(null);
const editingSaving = ref(false);
const editingError = ref('');

function openCreate() {
  editingService.value = {
    name: '',
    description: '',
    categoryId: filterCategoryId.value || categories.value[0]?.id || '',
    priceFrom: null,
    priceTo: null,
    durationMinutes: 60,
    isPopular: false,
    isActive: true,
  };
  editingError.value = '';
}
function openEdit(svc: Service) {
  editingService.value = { ...svc };
  editingError.value = '';
}
function closeEdit() {
  editingService.value = null;
  editingError.value = '';
}

async function saveService() {
  if (!editingService.value) return;
  editingSaving.value = true;
  editingError.value = '';
  try {
    const body: Record<string, unknown> = {
      name: editingService.value.name,
      description: editingService.value.description ?? '',
      priceFrom: editingService.value.priceFrom || null,
      priceTo: editingService.value.priceTo || null,
      durationMinutes: editingService.value.durationMinutes || null,
      isPopular: !!editingService.value.isPopular,
      isActive: editingService.value.isActive !== false,
      categoryId: editingService.value.categoryId,
    };
    if (editingService.value.id) {
      await api(`/admin/services/${editingService.value.id}`, { method: 'PATCH', body });
    } else {
      await api('/admin/services', { method: 'POST', body });
    }
    await loadServices();
    closeEdit();
  } catch (e) {
    editingError.value = e instanceof ApiError ? e.message : 'Не удалось сохранить';
  } finally {
    editingSaving.value = false;
  }
}

async function deleteService(svc: Service) {
  if (!confirm(`Удалить «${svc.name}»?`)) return;
  try {
    await api(`/admin/services/${svc.id}`, { method: 'DELETE' });
    await loadServices();
  } catch (e) {
    alert(e instanceof ApiError ? e.message : 'Не удалось удалить');
  }
}

async function toggleServiceActive(svc: Service) {
  try {
    await api(`/admin/services/${svc.id}`, {
      method: 'PATCH',
      body: { isActive: !svc.isActive },
    });
    svc.isActive = !svc.isActive;
  } catch (e) {
    alert(e instanceof ApiError ? e.message : 'Не удалось обновить');
  }
}

// ====== Reorder services ======
async function moveServiceUp(svc: Service) {
  const idx = filteredServices.value.findIndex((s) => s.id === svc.id);
  if (idx <= 0) return;
  const prev = filteredServices.value[idx - 1];
  if (!prev) return;
  const reordered = [prev, svc, ...filteredServices.value.slice(idx + 1)];
  filteredServices.value = reordered;
  await api('/admin/services/reorder', {
    method: 'POST',
    body: { categoryId: svc.categoryId, orderedIds: reordered.map((s) => s.id) },
  }).catch(() => loadServices());
}
async function moveServiceDown(svc: Service) {
  const idx = filteredServices.value.findIndex((s) => s.id === svc.id);
  if (idx === -1 || idx === filteredServices.value.length - 1) return;
  const next = filteredServices.value[idx + 1];
  if (!next) return;
  const reordered = [
    ...filteredServices.value.slice(0, idx),
    next,
    svc,
    ...filteredServices.value.slice(idx + 2),
  ];
  filteredServices.value = reordered;
  await api('/admin/services/reorder', {
    method: 'POST',
    body: { categoryId: svc.categoryId, orderedIds: reordered.map((s) => s.id) },
  }).catch(() => loadServices());
}

// ====== Categories ======
const newCategory = ref({ name: '', slug: '', icon: '', description: '', isActive: true });
const creatingCategory = ref(false);
const categoryError = ref('');

async function createCategory() {
  if (!newCategory.value.name || !newCategory.value.slug) {
    categoryError.value = 'Имя и slug обязательны';
    return;
  }
  creatingCategory.value = true;
  categoryError.value = '';
  try {
    await api('/admin/services/categories', {
      method: 'POST',
      body: {
        name: newCategory.value.name,
        slug: newCategory.value.slug,
        icon: newCategory.value.icon,
        description: newCategory.value.description,
        isActive: newCategory.value.isActive,
        order: categories.value.length,
      },
    });
    newCategory.value = { name: '', slug: '', icon: '', description: '', isActive: true };
    await loadCategories();
  } catch (e) {
    categoryError.value = e instanceof ApiError ? e.message : 'Не удалось создать';
  } finally {
    creatingCategory.value = false;
  }
}

async function toggleCategoryActive(cat: Category) {
  try {
    await api(`/admin/services/categories/${cat.id}`, {
      method: 'PATCH',
      body: { isActive: !cat.isActive },
    });
    cat.isActive = !cat.isActive;
    if (!cat.isActive) filterCategoryId.value = '';
  } catch (e) {
    alert(e instanceof ApiError ? e.message : 'Не удалось обновить');
  }
}

async function deleteCategory(cat: Category) {
  const msg = cat.serviceCount > 0
    ? `Удалить категорию «${cat.name}» и ${cat.serviceCount} услуг в ней?`
    : `Удалить категорию «${cat.name}»?`;
  if (!confirm(msg)) return;
  try {
    await api(`/admin/services/categories/${cat.id}`, { method: 'DELETE' });
    await loadCategories();
    await loadServices();
  } catch (e) {
    alert(e instanceof ApiError ? e.message : 'Не удалось удалить');
  }
}

async function moveCategoryUp(cat: Category) {
  const idx = categories.value.findIndex((c) => c.id === cat.id);
  if (idx <= 0) return;
  const prev = categories.value[idx - 1];
  if (!prev) return;
  const reordered = [prev, cat, ...categories.value.slice(idx + 1)];
  categories.value = reordered;
  await api('/admin/services/categories/reorder', {
    method: 'POST',
    body: { orderedIds: reordered.map((c) => c.id) },
  }).catch(() => loadCategories());
}
async function moveCategoryDown(cat: Category) {
  const idx = categories.value.findIndex((c) => c.id === cat.id);
  if (idx === -1 || idx === categories.value.length - 1) return;
  const next = categories.value[idx + 1];
  if (!next) return;
  const reordered = [...categories.value.slice(0, idx), next, cat, ...categories.value.slice(idx + 2)];
  categories.value = reordered;
  await api('/admin/services/categories/reorder', {
    method: 'POST',
    body: { orderedIds: reordered.map((c) => c.id) },
  }).catch(() => loadCategories());
}

// ====== Loaders ======
async function loadCategories() {
  try {
    const res = await api<{ categories: Category[] }>('/admin/services/categories');
    categories.value = res.categories;
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Не удалось загрузить категории';
  }
}

async function loadServices() {
  try {
    const qs = new URLSearchParams();
    if (filterCategoryId.value) qs.set('categoryId', filterCategoryId.value);
    if (showInactive.value) qs.set('includeInactive', 'true');
    const path = `/admin/services${qs.toString() ? '?' + qs : ''}`;
    const res = await api<{ services: Service[] }>(path);
    services.value = res.services;
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Не удалось загрузить услуги';
  }
}

onMounted(async () => {
  loading.value = true;
  await Promise.all([loadCategories(), loadServices()]);
  loading.value = false;
});

// ====== Computed ======
// filteredServices — просто services (фильтрация уже на сервере)
const filteredServices = services;

function formatPrice(s: Service): string {
  const from = s.priceFrom ?? 0;
  const to = s.priceTo ?? 0;
  const fmt = (n: number) => n.toLocaleString('ru-RU');
  if (from === to || to === 0) return from ? `${fmt(from)} ₽` : '—';
  return `от ${fmt(from)} до ${fmt(to)} ₽`;
}

function formatDuration(s: Service): string {
  if (!s.durationMinutes) return '—';
  const h = Math.floor(s.durationMinutes / 60);
  const m = s.durationMinutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}
</script>

<template>
  <div class="admin-services">
    <header class="page-head">
      <div>
        <h1>Услуги и цены</h1>
        <p class="page-sub">{{ categories.length }} категорий, {{ services.length }} услуг</p>
      </div>
      <div class="tab-switch">
        <button :class="['tab-btn', { 'tab-btn--active': tab === 'services' }]" @click="tab = 'services'">
          Услуги
        </button>
        <button :class="['tab-btn', { 'tab-btn--active': tab === 'categories' }]" @click="tab = 'categories'">
          Категории
        </button>
      </div>
    </header>

    <div v-if="error" class="alert alert--error">{{ error }}</div>
    <div v-if="loading" class="alert">Загружаем…</div>

    <!-- ===== SERVICES TAB ===== -->
    <section v-if="!loading && tab === 'services'" class="services-tab">
      <div class="toolbar">
        <div class="filters">
          <label class="filter">
            <span>Категория</span>
            <select v-model="filterCategoryId" @change="loadServices">
              <option value="">Все</option>
              <option v-for="c in categories.filter((c) => c.isActive)" :key="c.id" :value="c.id">
                {{ c.icon }} {{ c.name }}
              </option>
            </select>
          </label>
          <label class="filter filter--check">
            <input type="checkbox" v-model="showInactive" @change="loadServices" />
            <span>Показывать неактивные</span>
          </label>
        </div>
        <button class="btn btn--primary" @click="openCreate">+ Добавить услугу</button>
      </div>

      <div v-if="filteredServices.length === 0" class="empty">
        <p>Услуг пока нет.</p>
      </div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th class="col-order">#</th>
            <th class="col-name">Название</th>
            <th class="col-cat">Категория</th>
            <th class="col-duration">Время</th>
            <th class="col-price">Цена</th>
            <th class="col-status">Статус</th>
            <th class="col-actions">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(svc, idx) in filteredServices"
            :key="svc.id"
            :class="['data-row', { 'data-row--inactive': !svc.isActive }]"
          >
            <td class="col-order">
              <div class="order-controls">
                <button :disabled="idx === 0" @click="moveServiceUp(svc)" title="Выше">↑</button>
                <button :disabled="idx === filteredServices.length - 1" @click="moveServiceDown(svc)" title="Ниже">↓</button>
              </div>
            </td>
            <td class="col-name">
              <div class="svc-name">
                {{ svc.name }}
                <span v-if="svc.isPopular" class="badge">популярная</span>
              </div>
              <div v-if="svc.description" class="svc-desc">{{ svc.description }}</div>
            </td>
            <td class="col-cat">{{ svc.category.name }}</td>
            <td class="col-duration">{{ formatDuration(svc) }}</td>
            <td class="col-price">{{ formatPrice(svc) }}</td>
            <td class="col-status">
              <button
                :class="['status-toggle', svc.isActive ? 'status-toggle--on' : 'status-toggle--off']"
                @click="toggleServiceActive(svc)"
                :title="svc.isActive ? 'Деактивировать' : 'Активировать'"
              >
                {{ svc.isActive ? '●' : '○' }}
              </button>
            </td>
            <td class="col-actions">
              <button class="icon-btn" @click="openEdit(svc)" title="Редактировать">✎</button>
              <button class="icon-btn icon-btn--danger" @click="deleteService(svc)" title="Удалить">✕</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ===== CATEGORIES TAB ===== -->
    <section v-if="!loading && tab === 'categories'" class="categories-tab">
      <div class="cat-list">
        <article v-for="(cat, idx) in categories" :key="cat.id" class="cat-card" :class="{ 'cat-card--inactive': !cat.isActive }">
          <div class="cat-card__icon">{{ cat.icon || '•' }}</div>
          <div class="cat-card__main">
            <div class="cat-card__title">
              {{ cat.name }}
              <span class="cat-card__slug">/{{ cat.slug }}</span>
            </div>
            <div class="cat-card__meta">
              <span>{{ cat.serviceCount }} {{ cat.serviceCount === 1 ? 'услуга' : cat.serviceCount < 5 ? 'услуги' : 'услуг' }}</span>
              <span v-if="!cat.isActive" class="badge badge--inactive">скрыта</span>
            </div>
          </div>
          <div class="cat-card__actions">
            <button class="icon-btn" :disabled="idx === 0" @click="moveCategoryUp(cat)" title="Выше">↑</button>
            <button class="icon-btn" :disabled="idx === categories.length - 1" @click="moveCategoryDown(cat)" title="Ниже">↓</button>
            <button
              :class="['status-toggle', cat.isActive ? 'status-toggle--on' : 'status-toggle--off']"
              @click="toggleCategoryActive(cat)"
              :title="cat.isActive ? 'Деактивировать' : 'Активировать'"
            >{{ cat.isActive ? '●' : '○' }}</button>
            <button class="icon-btn icon-btn--danger" @click="deleteCategory(cat)" title="Удалить">✕</button>
          </div>
        </article>
      </div>

      <form class="cat-create" @submit.prevent="createCategory">
        <h3>Добавить категорию</h3>
        <div v-if="categoryError" class="alert alert--error">{{ categoryError }}</div>
        <div class="form-grid">
          <label>
            <span>Имя *</span>
            <input v-model="newCategory.name" required placeholder="Например: Маникюр" />
          </label>
          <label>
            <span>Slug *</span>
            <input v-model="newCategory.slug" required pattern="[a-z0-9-]+" placeholder="manikyur" />
          </label>
          <label>
            <span>Иконка (emoji)</span>
            <input v-model="newCategory.icon" placeholder="💅" maxlength="4" />
          </label>
          <label>
            <span>Описание</span>
            <input v-model="newCategory.description" placeholder="Короткое описание" />
          </label>
          <label class="form-check">
            <input type="checkbox" v-model="newCategory.isActive" />
            <span>Активна</span>
          </label>
        </div>
        <button type="submit" class="btn btn--primary" :disabled="creatingCategory">
          {{ creatingCategory ? 'Создаём…' : 'Создать' }}
        </button>
      </form>
    </section>

    <!-- ===== EDIT MODAL ===== -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="editingService" class="modal-backdrop" @click.self="closeEdit">
          <div class="modal">
            <header class="modal__head">
              <h2>{{ editingService.id ? 'Редактировать услугу' : 'Новая услуга' }}</h2>
              <button class="icon-btn" @click="closeEdit" aria-label="Закрыть">✕</button>
            </header>

            <form @submit.prevent="saveService" class="modal__body">
              <div v-if="editingError" class="alert alert--error">{{ editingError }}</div>

              <label class="field">
                <span>Название *</span>
                <input v-model="editingService.name" required maxlength="160" />
              </label>

              <label class="field">
                <span>Категория *</span>
                <select v-model="editingService.categoryId" required>
                  <option v-for="c in categories" :key="c.id" :value="c.id">
                    {{ c.icon }} {{ c.name }}
                  </option>
                </select>
              </label>

              <label class="field">
                <span>Описание</span>
                <textarea v-model="editingService.description" rows="2" maxlength="800" />
              </label>

              <div class="field-row">
                <label class="field">
                  <span>Цена от (₽)</span>
                  <input type="number" min="0" v-model.number="editingService.priceFrom" />
                </label>
                <label class="field">
                  <span>Цена до (₽)</span>
                  <input type="number" min="0" v-model.number="editingService.priceTo" />
                </label>
                <label class="field">
                  <span>Длительность (мин)</span>
                  <input type="number" min="0" step="5" v-model.number="editingService.durationMinutes" />
                </label>
              </div>

              <div class="field-row">
                <label class="form-check">
                  <input type="checkbox" v-model="editingService.isPopular" />
                  <span>Популярная (показывать на главной)</span>
                </label>
                <label class="form-check">
                  <input type="checkbox" v-model="editingService.isActive" />
                  <span>Активна</span>
                </label>
              </div>

              <footer class="modal__foot">
                <button type="button" class="btn" @click="closeEdit">Отмена</button>
                <button type="submit" class="btn btn--primary" :disabled="editingSaving">
                  {{ editingSaving ? 'Сохраняем…' : 'Сохранить' }}
                </button>
              </footer>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.admin-services { padding: 0; }

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.page-head h1 {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-bottom: 0.25rem;
}
.page-sub { color: var(--color-text-muted); font-size: 0.875rem; }

.tab-switch {
  display: flex;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.25rem;
}
.tab-btn {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: transparent;
}
.tab-btn--active {
  background: var(--color-accent);
  color: white;
}

.alert {
  padding: 0.75rem 1rem;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
}
.alert--error { border-color: var(--color-danger); color: var(--color-danger); }

/* ===== SERVICES TAB ===== */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.filters { display: flex; gap: 1rem; flex-wrap: wrap; }
.filter {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}
.filter select,
.filter input {
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.6rem;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 0.875rem;
}
.filter--check { gap: 0.4rem; }
.filter--check input { accent-color: var(--color-accent); }

.btn {
  padding: 0.55rem 1.1rem;
  border-radius: var(--radius-sm);
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

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.data-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-2);
}
.data-row td {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.9rem;
  vertical-align: top;
}
.data-row:last-child td { border-bottom: none; }
.data-row--inactive td { opacity: 0.5; }

.col-order { width: 60px; }
.col-cat { color: var(--color-text-secondary); }
.col-duration { color: var(--color-text-secondary); white-space: nowrap; }
.col-price { font-weight: 600; white-space: nowrap; }
.col-status { width: 40px; }
.col-actions { width: 90px; text-align: right; }

.order-controls { display: flex; flex-direction: column; gap: 0.2rem; }
.order-controls button {
  width: 22px; height: 22px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  padding: 0;
  background: var(--color-surface-2);
}
.order-controls button:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
.order-controls button:disabled { opacity: 0.3; }

.svc-name { font-weight: 500; display: inline-flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.svc-desc { color: var(--color-text-muted); font-size: 0.825rem; margin-top: 0.2rem; }

.badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  background: var(--color-accent);
  color: white;
  border-radius: 999px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.badge--inactive { background: var(--color-surface-3); color: var(--color-text-muted); }

.status-toggle {
  width: 26px; height: 26px;
  border-radius: 50%;
  font-size: 1rem;
  line-height: 1;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
}
.status-toggle--on { color: var(--color-success); border-color: var(--color-success); }
.status-toggle--off { color: var(--color-text-muted); }

.icon-btn {
  width: 30px; height: 30px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
}
.icon-btn:hover { background: var(--color-surface-2); color: var(--color-text-primary); }
.icon-btn--danger:hover { color: var(--color-danger); background: rgba(239, 68, 68, 0.1); }
.icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.empty { padding: 4rem 2rem; text-align: center; color: var(--color-text-muted); }

/* ===== CATEGORIES TAB ===== */
.cat-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 2rem;
}
.cat-card {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 1rem;
  align-items: center;
  padding: 0.875rem 1rem;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.cat-card--inactive { opacity: 0.55; }
.cat-card__icon {
  width: 36px; height: 36px;
  display: grid; place-items: center;
  background: rgba(225, 29, 72, 0.12);
  border-radius: var(--radius-sm);
  font-size: 1.2rem;
}
.cat-card__title {
  font-weight: 600;
  font-size: 0.95rem;
  display: flex; align-items: center; gap: 0.5rem;
}
.cat-card__slug {
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-weight: 400;
}
.cat-card__meta {
  font-size: 0.825rem;
  color: var(--color-text-muted);
  display: flex; align-items: center; gap: 0.5rem;
  margin-top: 0.2rem;
}
.cat-card__actions { display: flex; align-items: center; gap: 0.25rem; }

.cat-create {
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
}
.cat-create h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}
.form-grid label {
  display: flex; flex-direction: column; gap: 0.3rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}
.form-grid input {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.7rem;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 0.9rem;
}
.form-grid input:focus {
  outline: none;
  border-color: var(--color-accent);
}
.form-check {
  display: inline-flex; align-items: center; gap: 0.5rem;
  font-size: 0.875rem; color: var(--color-text-secondary);
  align-self: end;
  padding-bottom: 0.5rem;
}
.form-check input { accent-color: var(--color-accent); }

/* ===== MODAL ===== */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: grid; place-items: center;
  padding: 1rem;
}
.modal {
  width: 100%;
  max-width: 560px;
  max-height: calc(100vh - 32px);
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: auto;
}
.modal__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}
.modal__head h2 { font-size: 1.125rem; font-weight: 600; }
.modal__body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.modal__foot {
  display: flex; justify-content: flex-end; gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
  margin-top: 0.5rem;
  padding: 1rem 0 0 0;
}

.field { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; color: var(--color-text-secondary); }
.field input, .field select, .field textarea {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.55rem 0.75rem;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 0.95rem;
}
.field input:focus, .field select:focus, .field textarea:focus {
  outline: none; border-color: var(--color-accent);
}
.field-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.field-row .field-row { grid-template-columns: repeat(2, 1fr); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 700px) {
  .data-table { font-size: 0.8rem; }
  .data-table th, .data-row td { padding: 0.6rem 0.5rem; }
  .col-cat, .col-duration { display: none; }
  .field-row { grid-template-columns: 1fr; }
}
</style>