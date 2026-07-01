<script setup lang="ts">
/**
 * AdminSidebar — navigation links.
 * Used both inline (desktop) and inside AdminLayout drawer (mobile).
 *
 * Emits `navigate` so the parent layout can close the drawer after a click.
 */
import { RouterLink } from 'vue-router';

defineEmits<{ (e: 'navigate'): void }>();

const items = [
  { to: '/admin/services', label: 'Услуги и цены', icon: '✂' },
  { to: '/admin/blocks', label: 'Блоки лендинга', icon: '◧' },
  { to: '/admin/settings', label: 'Настройки', icon: '⚙' },
  { to: '/admin/integrations', label: 'Интеграции', icon: '↗' },
];
</script>

<template>
  <aside class="admin-sidebar">
    <div class="brand">Молодость · admin</div>
    <nav>
      <RouterLink v-for="i in items" :key="i.to" :to="i.to" @click="$emit('navigate')">
        <span class="ico">{{ i.icon }}</span>
        <span class="lbl">{{ i.label }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
/* Single, simple, full-height column. No sticky/100vh inside — those caused
   a double scrollbar and links not responding inside the mobile drawer. */
.admin-sidebar {
  background: var(--color-surface-1);
  border-right: 1px solid var(--color-border);
  padding: var(--space-6) var(--space-4);
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  /* Fill the height of whatever parent contains us (desktop sticky column
     OR mobile drawer). We don't fix a viewport height here so we don't fight
     the parent. */
  flex: 1 1 auto;
  min-height: 0;
}
.brand {
  font-size: var(--font-size-lg);
  font-weight: 700;
  padding: 0 var(--space-2);
}
nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1 1 auto;
  min-height: 0;
}
nav a {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.8rem;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  transition: all var(--duration-fast) var(--ease-out);
  text-decoration: none;
}
nav a:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}
nav a.router-link-active {
  background: var(--color-accent);
  color: white;
}
.ico {
  display: inline-grid;
  place-items: center;
  width: 22px;
  font-size: 1rem;
}
</style>