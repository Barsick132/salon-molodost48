<script setup lang="ts">
/**
 * Admin BlocksPage — edit every block on the homepage.
 *
 * Each row shows:
 *  - type badge
 *  - isActive toggle
 *  - up/down reorder
 *  - edit (opens type-specific form)
 *  - delete (with confirm)
 *
 * Type-specific editors (the "form" drawer):
 *   hero       — eyebrow / title / lead / primary CTA / secondary CTA
 *   stats      — repeatable list of {value, label}
 *   advantages — repeatable list of {icon, title, description}
 *   cta-strip  — eyebrow / title / lead / ctaLabel / ctaHref
 *
 *   • `Reset defaults` wipes everything and re-seeds the canonical demo set.
 */
import { ref, computed, onMounted } from 'vue';
import { api, ApiError } from '@/api/client';
import { useBlocksStore, type BlockBase, type BlockType, type HeroPayload, type StatItem, type AdvantageItem, type CtaStripPayload } from '@/stores/blocks';

const store = useBlocksStore();
const message = ref<{ type: 'ok' | 'error'; text: string } | null>(null);

const editing = ref<null | { kind: 'existing'; block: BlockBase } | { kind: 'new' }>(null);
const formSaving = ref(false);
const formError = ref('');

// Per-type form state. When editing we copy values into these refs.
const newType = ref<BlockType>('hero');
const heroForm = ref<HeroPayload>(emptyHero());
const statsForm = ref<StatItem[]>([]);
const advForm = ref<AdvantageItem[]>([]);
const ctaForm = ref<CtaStripPayload>(emptyCta());

function emptyHero(): HeroPayload {
  return {
    eyebrow: '',
    titleBefore: '',
    titleAccent: '',
    title: '',
    lead: '',
    primaryCtaLabel: 'Записаться',
    primaryCtaHref: '',
    secondaryCtaLabel: '',
    secondaryCtaHref: '',
    imageUrl: '',
    textAlign: 'center',
    textAlignHorizontal: 'center',
    showScrollCue: true,
    showOverlay: true,
  };
}
function emptyCta(): CtaStripPayload {
  return { eyebrow: '', title: '', lead: '', ctaLabel: 'Записаться', ctaHref: '' };
}

// Hero image uploader (uses /api/admin/media)
const heroImageUploading = ref(false);
async function uploadHeroImage() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/webp';
  input.onchange = async () => {
    const f = input.files?.[0];
    if (!f) return;
    heroImageUploading.value = true;
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/admin/media', { method: 'POST', body: fd, credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { url: string };
      heroForm.value.imageUrl = data.url;
    } catch (e) {
      alert(e instanceof Error ? e.message : 'upload failed');
    } finally {
      heroImageUploading.value = false;
    }
  };
  input.click();
}

const sortedBlocks = computed(() => [...store.blocks].sort((a, b) => a.order - b.order));

const TYPE_LABEL: Record<BlockType, string> = {
  hero: 'Баннерный блок',
  stats: 'Статистика',
  advantages: 'Преимущества',
  'cta-strip': 'CTA-полоса',
};

function flash(type: 'ok' | 'error', text: string) {
  message.value = { type, text };
  setTimeout(() => {
    if (message.value?.text === text) message.value = null;
  }, 4000);
}

async function moveUp(b: BlockBase) {
  const list = sortedBlocks.value;
  const idx = list.findIndex((x) => x.id === b.id);
  if (idx <= 0) return;
  const reordered = [list[idx - 1]!, b, ...list.slice(idx + 1)];
  await api('/admin/blocks/reorder', {
    method: 'POST',
    body: { orderedIds: reordered.map((r) => r.id) },
  }).catch((e) => flash('error', e instanceof ApiError ? e.message : 'reorder fail'));
  await store.fetchAdmin();
}
async function moveDown(b: BlockBase) {
  const list = sortedBlocks.value;
  const idx = list.findIndex((x) => x.id === b.id);
  if (idx === -1 || idx === list.length - 1) return;
  const reordered = [...list.slice(0, idx), list[idx + 1]!, b, ...list.slice(idx + 2)];
  await api('/admin/blocks/reorder', {
    method: 'POST',
    body: { orderedIds: reordered.map((r) => r.id) },
  }).catch((e) => flash('error', e instanceof ApiError ? e.message : 'reorder fail'));
  await store.fetchAdmin();
}

async function toggleEnabled(b: BlockBase) {
  try {
    await api(`/admin/blocks/${b.id}`, { method: 'PATCH', body: { enabled: !b.enabled } });
    b.enabled = !b.enabled;
  } catch (e) {
    flash('error', e instanceof ApiError ? e.message : 'Не удалось');
  }
}

async function deleteBlock(b: BlockBase) {
  if (!confirm(`Удалить блок «${TYPE_LABEL[b.type]}»?`)) return;
  try {
    await api(`/admin/blocks/${b.id}`, { method: 'DELETE' });
    await store.fetchAdmin();
    flash('ok', 'Блок удалён');
  } catch (e) {
    flash('error', e instanceof ApiError ? e.message : 'Не удалось');
  }
}

function openEdit(b: BlockBase) {
  editing.value = { kind: 'existing', block: b };
  formError.value = '';
  populateForm(b);
}
function openCreate() {
  editing.value = { kind: 'new' };
  formError.value = '';
  newType.value = 'hero';
  heroForm.value = emptyHero();
  statsForm.value = [{ value: '', label: '' }];
  advForm.value = [{ icon: '', title: '', description: '' }];
  ctaForm.value = emptyCta();
}
function closeEdit() {
  editing.value = null;
  formError.value = '';
}
function populateForm(b: BlockBase) {
  const p = b.payload as any;
  if (b.type === 'hero') heroForm.value = { ...emptyHero(), ...p };
  else if (b.type === 'stats') statsForm.value = Array.isArray(p.items) ? p.items.map((x: any) => ({ ...x })) : [];
  else if (b.type === 'advantages') advForm.value = Array.isArray(p.items) ? p.items.map((x: any) => ({ ...x })) : [];
  else if (b.type === 'cta-strip') ctaForm.value = { ...emptyCta(), ...p };
}

function buildPayload(type: BlockType) {
  if (type === 'hero') return { ...heroForm.value };
  if (type === 'stats') {
    return { items: statsForm.value.filter((s) => s.value || s.label) };
  }
  if (type === 'advantages') {
    return { items: advForm.value.filter((a) => a.title || a.description || a.icon) };
  }
  return { ...ctaForm.value };
}

async function save() {
  if (!editing.value) return;
  formSaving.value = true;
  formError.value = '';
  try {
    if (editing.value.kind === 'existing') {
      const b = editing.value.block;
      const payload = buildPayload(b.type);
      await api(`/admin/blocks/${b.id}`, { method: 'PATCH', body: { payload } });
      flash('ok', 'Блок сохранён');
    } else {
      const payload = buildPayload(newType.value);
      await api('/admin/blocks', {
        method: 'POST',
        body: { type: newType.value, enabled: true, order: store.blocks.length, payload },
      });
      flash('ok', 'Блок создан');
    }
    await store.fetchAdmin();
    closeEdit();
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : 'Не удалось сохранить';
  } finally {
    formSaving.value = false;
  }
}

async function resetDefaults() {
  if (!confirm('Удалить все блоки и пересоздать дефолтные 4 блока? Текущие изменения будут потеряны.')) return;
  try {
    await api('/admin/blocks/reset-defaults', { method: 'POST' });
    await store.fetchAdmin();
    flash('ok', 'Дефолтные блоки восстановлены');
  } catch (e) {
    flash('error', e instanceof ApiError ? e.message : 'Не удалось');
  }
}

function addStatRow() { statsForm.value.push({ value: '', label: '' }); }
function removeStatRow(i: number) { statsForm.value.splice(i, 1); }
function addAdvRow() { advForm.value.push({ icon: '', title: '', description: '' }); }
function removeAdvRow(i: number) { advForm.value.splice(i, 1); }

const summary = (b: BlockBase): string => {
  const p = b.payload as any;
  if (b.type === 'hero') return (p.title as string) || '— без заголовка —';
  if (b.type === 'stats') return `${(p.items as any[])?.length ?? 0} цифр`;
  if (b.type === 'advantages') return `${(p.items as any[])?.length ?? 0} преимуществ`;
  return (p.title as string) || '— без заголовка —';
};

onMounted(store.fetchAdmin);
</script>

<template>
  <div class="admin-blocks">
    <header class="page-head">
      <div>
        <h1>Блоки лендинга</h1>
        <p class="page-sub">
          {{ sortedBlocks.length }} блок{{ sortedBlocks.length === 1 ? '' : 'ов' }} ·
          меняйте порядок, текст, иконки и состав
        </p>
      </div>
      <div class="page-actions">
        <button class="btn" @click="resetDefaults">Сбросить к дефолтам</button>
      </div>
    </header>

    <div v-if="message" :class="['flash', `flash--${message.type}`]">{{ message.text }}</div>

    <div v-if="store.loading" class="alert">Загружаем…</div>
    <div v-else-if="!sortedBlocks.length" class="alert">
      Блоков пока нет. Нажмите «Сбросить к дефолтам».
    </div>

    <ul v-else class="block-list">
      <li v-for="(b, idx) in sortedBlocks" :key="b.id" class="block-row" :class="{ 'block-row--off': !b.enabled }">
        <div class="block-row__order">
          <button :disabled="idx === 0" @click="moveUp(b)" title="Выше">↑</button>
          <button :disabled="idx === sortedBlocks.length - 1" @click="moveDown(b)" title="Ниже">↓</button>
        </div>
        <div class="block-row__main">
          <div class="block-row__title">
            <span :class="['tag', `tag--${b.type}`]">{{ TYPE_LABEL[b.type] }}</span>
            <span class="block-row__summary">{{ summary(b) }}</span>
          </div>
        </div>
        <div class="block-row__actions">
          <button
            :class="['status-toggle', b.enabled ? 'status-toggle--on' : 'status-toggle--off']"
            @click="toggleEnabled(b)"
            :title="b.enabled ? 'Скрыть' : 'Показать'"
          >{{ b.enabled ? '●' : '○' }}</button>
          <button class="btn btn--ghost" @click="openEdit(b)">Изменить</button>
          <button class="icon-btn icon-btn--danger" @click="deleteBlock(b)" title="Удалить">✕</button>
        </div>
      </li>
    </ul>

    <!-- ============ EDIT DRAWER ============ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="editing" class="drawer-backdrop" @click.self="closeEdit">
          <div class="drawer">
            <header class="drawer__head">
              <h2>
                {{ editing.kind === 'new' ? 'Новый блок' : 'Редактировать блок' }}
              </h2>
              <button class="icon-btn" @click="closeEdit" aria-label="Закрыть">✕</button>
            </header>

            <form class="drawer__body" @submit.prevent="save">
              <div v-if="formError" class="flash flash--error">{{ formError }}</div>

              <!-- New block type picker -->
              <label v-if="editing.kind === 'new'" class="field">
                <span class="field__label">Тип блока</span>
                <select v-model="newType" class="field__input">
                  <option v-for="(label, key) in TYPE_LABEL" :key="key" :value="key">{{ label }}</option>
                </select>
              </label>

              <!-- HERO -->
              <template v-if="(editing.kind === 'existing' ? editing.block.type : newType) === 'hero'">
                <label class="field">
                  <span class="field__label">Картинка-обложка (full-bleed на всю ширину)</span>
                  <div class="image-uploader">
                    <div class="image-uploader__preview image-uploader__preview--wide">
                      <img v-if="heroForm.imageUrl" :src="heroForm.imageUrl" alt="" />
                      <span v-else class="image-uploader__placeholder">не выбрана</span>
                    </div>
                    <div class="image-uploader__actions">
                      <button type="button" class="btn" :disabled="heroImageUploading" @click="uploadHeroImage">
                        {{ heroImageUploading ? 'Загружаем…' : 'Загрузить' }}
                      </button>
                      <button v-if="heroForm.imageUrl" type="button" class="btn btn--ghost" @click="heroForm.imageUrl = ''">Удалить</button>
                    </div>
                  </div>
                </label>

                <div class="row row--3">
                  <label class="field">
                    <span class="field__label">Расположение по вертикали</span>
                    <select v-model="heroForm.textAlign" class="field__input">
                      <option value="top">Сверху</option>
                      <option value="center">По центру</option>
                      <option value="bottom">Снизу</option>
                    </select>
                  </label>
                  <label class="field">
                    <span class="field__label">Расположение по горизонтали</span>
                    <select v-model="heroForm.textAlignHorizontal" class="field__input">
                      <option value="left">Слева</option>
                      <option value="center">По центру</option>
                      <option value="right">Справа</option>
                    </select>
                  </label>
                  <label class="field">
                    <span class="field__label">Стрелка ↓ для скролла</span>
                    <select v-model="heroForm.showScrollCue" class="field__input">
                      <option :value="true">Показывать</option>
                      <option :value="false">Скрыть</option>
                    </select>
                  </label>
                  <label class="field field--toggle">
                    <input
                      id="hero-show-overlay"
                      v-model="heroForm.showOverlay"
                      type="checkbox"
                      class="field__checkbox"
                    />
                    <span class="field__label">Градиентная подложка под текст</span>
                  </label>
                </div>

                <label class="field">
                  <span class="field__label">Eyebrow (мелкий текст над заголовком)</span>
                  <input v-model="heroForm.eyebrow" class="field__input" />
                </label>

                <div class="row row--3">
                  <label class="field">
                    <span class="field__label">Заголовок — часть 1</span>
                    <input v-model="heroForm.titleBefore" class="field__input" placeholder="Красота — это ритуал" />
                  </label>
                  <label class="field">
                    <span class="field__label">Заголовок — акцент</span>
                    <input v-model="heroForm.titleAccent" class="field__input" placeholder="заботы о себе" />
                    <span class="field__hint">отображается italic + красным градиентом</span>
                  </label>
                </div>

                <label class="field">
                  <span class="field__label">Подзаголовок</span>
                  <textarea v-model="heroForm.lead" class="field__input" rows="2" />
                </label>
                <div class="row">
                  <label class="field">
                    <span class="field__label">Кнопка 1 · текст</span>
                    <input v-model="heroForm.primaryCtaLabel" class="field__input" />
                  </label>
                  <label class="field">
                    <span class="field__label">Кнопка 1 · ссылка</span>
                    <input v-model="heroForm.primaryCtaHref" class="field__input" placeholder="/services или https://dikidi.ru/#widget=..." />
                  </label>
                </div>
                <div class="row">
                  <label class="field">
                    <span class="field__label">Кнопка 2 · текст</span>
                    <input v-model="heroForm.secondaryCtaLabel" class="field__input" />
                  </label>
                  <label class="field">
                    <span class="field__label">Кнопка 2 · ссылка</span>
                    <input v-model="heroForm.secondaryCtaHref" class="field__input" />
                  </label>
                </div>
              </template>

              <!-- STATS -->
              <template v-else-if="(editing.kind === 'existing' ? editing.block.type : newType) === 'stats'">
                <div class="repeater">
                  <div v-for="(s, i) in statsForm" :key="i" class="repeater__row">
                    <input v-model="s.value" class="field__input" placeholder="12+" />
                    <input v-model="s.label" class="field__input" placeholder="лет на рынке" />
                    <button type="button" class="icon-btn icon-btn--danger" @click="removeStatRow(i)">✕</button>
                  </div>
                  <button type="button" class="link-btn" @click="addStatRow">+ добавить</button>
                </div>
              </template>

              <!-- ADVANTAGES -->
              <template v-else-if="(editing.kind === 'existing' ? editing.block.type : newType) === 'advantages'">
                <p class="hint">
                  Иконка: одно из ключевых слов —
                  <code>tag</code> · <code>shield</code> · <code>clock</code> · <code>coffee</code> ·
                  <code>star</code> · <code>scissors</code> · <code>sparkles</code>.
                  Любой другой текст появится как есть.
                </p>
                <div class="repeater">
                  <div v-for="(a, i) in advForm" :key="i" class="repeater__row repeater__row--3">
                    <input v-model="a.icon" class="field__input" placeholder="tag" />
                    <input v-model="a.title" class="field__input" placeholder="Заголовок" />
                    <input v-model="a.description" class="field__input" placeholder="Описание" />
                    <button type="button" class="icon-btn icon-btn--danger" @click="removeAdvRow(i)">✕</button>
                  </div>
                  <button type="button" class="link-btn" @click="addAdvRow">+ добавить</button>
                </div>
              </template>

              <!-- CTA STRIP -->
              <template v-else-if="(editing.kind === 'existing' ? editing.block.type : newType) === 'cta-strip'">
                <label class="field">
                  <span class="field__label">Eyebrow</span>
                  <input v-model="ctaForm.eyebrow" class="field__input" />
                </label>
                <label class="field">
                  <span class="field__label">Заголовок</span>
                  <input v-model="ctaForm.title" class="field__input" />
                </label>
                <label class="field">
                  <span class="field__label">Подзаголовок</span>
                  <textarea v-model="ctaForm.lead" class="field__input" rows="2" />
                </label>
                <div class="row">
                  <label class="field">
                    <span class="field__label">Кнопка · текст</span>
                    <input v-model="ctaForm.ctaLabel" class="field__input" />
                  </label>
                  <label class="field">
                    <span class="field__label">Кнопка · ссылка</span>
                    <input v-model="ctaForm.ctaHref" class="field__input" />
                  </label>
                </div>
              </template>

              <footer class="drawer__foot">
                <button type="button" class="btn" @click="closeEdit">Отмена</button>
                <button type="submit" class="btn btn--primary" :disabled="formSaving">
                  {{ formSaving ? 'Сохраняем…' : 'Сохранить' }}
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
.admin-blocks { max-width: 900px; }

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
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
.page-actions { display: flex; gap: 0.5rem; }

.alert {
  padding: 0.75rem 1rem;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
}

.block-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.block-row {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.block-row--off { opacity: 0.55; }
.block-row__order { display: flex; flex-direction: column; gap: 0.2rem; }
.block-row__order button {
  width: 26px; height: 22px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
  color: var(--color-text-secondary);
}
.block-row__order button:disabled { opacity: 0.3; }
.block-row__title { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.block-row__summary {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text-primary);
}
.block-row__actions { display: flex; align-items: center; gap: 0.35rem; }

.tag {
  font-size: 0.65rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: white;
}
.tag--hero { background: #6366f1; }
.tag--stats { background: #0ea5e9; }
.tag--advantages { background: #10b981; }
.tag--cta-strip { background: #e11d48; }

.btn {
  padding: 0.45rem 0.9rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
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

.icon-btn {
  width: 28px; height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
}
.icon-btn:hover { background: var(--color-surface-2); color: var(--color-text-primary); }
.icon-btn--danger:hover { color: var(--color-danger); background: rgba(239, 68, 68, 0.1); }

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

.flash {
  padding: 0.55rem 0.85rem;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  margin-bottom: 1rem;
}
.flash--ok { background: rgba(34, 197, 94, 0.12); color: var(--color-success); border: 1px solid rgba(34, 197, 94, 0.3); }
.flash--error { background: rgba(239, 68, 68, 0.12); color: var(--color-danger); border: 1px solid rgba(239, 68, 68, 0.3); }

/* Drawer (same UX as AdminLayout mobile menu) */
.drawer-backdrop {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
}
.drawer {
  width: min(560px, 100vw);
  background: var(--color-surface-1);
  border-left: 1px solid var(--color-border);
  height: 100%;
  overflow-y: auto;
}
.drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  background: var(--color-surface-1);
  z-index: 1;
}
.drawer__head h2 { font-size: 1.05rem; font-weight: 600; }
.drawer__body { padding: 1.25rem 1.5rem 2rem; display: flex; flex-direction: column; gap: 0.85rem; }
.drawer__foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  margin-top: 0.5rem;
  position: sticky;
  bottom: 0;
  background: var(--color-surface-1);
}

.field { display: flex; flex-direction: column; gap: 0.3rem; }
.field--toggle { flex-direction: row; align-items: center; gap: 0.6rem; cursor: pointer; }
.field--toggle .field__label { cursor: pointer; }
.field__checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--color-accent);
  cursor: pointer;
  flex-shrink: 0;
}
.field__label { font-size: 0.8rem; color: var(--color-text-secondary); font-weight: 500; }
.field__input {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.55rem 0.8rem;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 0.9rem;
  width: 100%;
  box-sizing: border-box;
}
.field__input:focus { outline: none; border-color: var(--color-accent); }

.row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.row--3 { grid-template-columns: 1fr 1fr 1fr; }

.repeater { display: flex; flex-direction: column; gap: 0.4rem; }
.repeater__row { display: grid; grid-template-columns: 1fr 2fr auto; gap: 0.5rem; align-items: center; }
.repeater__row--3 { grid-template-columns: 80px 1.2fr 2fr auto; }
.link-btn {
  background: transparent;
  border: 1px dashed var(--color-border);
  padding: 0.4rem 0.7rem;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 0.825rem;
  cursor: pointer;
  align-self: start;
}
.link-btn:hover { color: var(--color-accent); border-color: var(--color-accent); }

.image-uploader { display: flex; align-items: center; gap: 0.85rem; }
.image-uploader__preview {
  width: 96px; height: 96px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-2);
  display: grid;
  place-items: center;
  overflow: hidden;
  flex-shrink: 0;
}
.image-uploader__preview--wide {
  width: 160px; height: 90px;
}
.image-uploader__preview img {
  width: 100%; height: 100%;
  object-fit: cover;
}
.image-uploader__placeholder {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
.image-uploader__actions { display: flex; flex-direction: column; gap: 0.4rem; }
.image-uploader__actions .btn { font-size: 0.8rem; padding: 0.4rem 0.8rem; width: fit-content; }
.btn--ghost-btn { background: transparent; }

.hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}
.hint code {
  background: var(--color-surface-3);
  padding: 0.05rem 0.35rem;
  border-radius: 4px;
  font-family: ui-monospace, monospace;
  font-size: 0.85em;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-active .drawer, .fade-leave-active .drawer { transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-from .drawer, .fade-leave-to .drawer { transform: translateX(100%); }

@media (max-width: 600px) {
  .row, .row--3 { grid-template-columns: 1fr; }
  .repeater__row, .repeater__row--3 { grid-template-columns: 1fr; }
  .block-row { grid-template-columns: 50px 1fr; }
  .block-row__actions { grid-column: 1 / -1; justify-content: flex-end; }
}
</style>