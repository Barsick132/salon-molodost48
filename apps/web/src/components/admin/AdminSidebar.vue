<script setup lang="ts">
/**
 * AdminSidebar — navigation links.
 * On mobile, this is rendered inside AdminMobileMenu drawer instead of inline.
 */
import { RouterLink } from 'vue-router';

defineProps<{
  compact?: boolean;
}>();

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
      <RouterLink v-for="i in items" :key="i.to" :to="i.to">
        <span class="ico">{{ i.icon }}</span>
        <span class="lbl">{{ i.label }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  background: var(--color-surface-1);
  border-right: 1px solid var(--color-border);
  padding: var(--space-6) var(--space-4);
  overflow-y: auto;
  width: 100%;
  box-sizing: border-box;
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