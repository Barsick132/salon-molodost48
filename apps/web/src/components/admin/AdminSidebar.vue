<script setup lang="ts">
/**
 * AdminSidebar — navigation links.
 * On mobile, this is rendered inside AdminLayout drawer instead of inline.
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
    <div class="admin-sidebar__inner">
      <div class="brand">Молодость · admin</div>
      <nav>
        <RouterLink v-for="i in items" :key="i.to" :to="i.to" @click="$emit('navigate')">
          <span class="ico">{{ i.icon }}</span>
          <span class="lbl">{{ i.label }}</span>
        </RouterLink>
      </nav>
    </div>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  background: var(--color-surface-1);
  border-right: 1px solid var(--color-border);
  width: 100%;
  box-sizing: border-box;
  min-height: 100vh;
  flex: 1;
}
.admin-sidebar__inner {
  position: sticky;
  top: 0;
  padding: var(--space-6) var(--space-4);
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.brand {
  font-size: var(--font-size-lg);
  font-weight: 700;
  margin-bottom: var(--space-8);
  padding: 0 var(--space-2);
}
nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
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