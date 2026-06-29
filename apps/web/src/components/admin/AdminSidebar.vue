<script setup lang="ts">
import { RouterLink } from 'vue-router';

const items = [
  { to: '/admin', label: 'Дашборд', icon: '◧' },
  { to: '/admin/blocks', label: 'Блоки лендинга', icon: '◧' },
  { to: '/admin/services', label: 'Услуги и цены', icon: '◧' },
  { to: '/admin/masters', label: 'Мастера', icon: '◧' },
  { to: '/admin/gallery', label: 'Галерея', icon: '◧' },
  { to: '/admin/promotions', label: 'Акции', icon: '◧' },
  { to: '/admin/rooms', label: 'Залы', icon: '◧' },
  { to: '/admin/reviews', label: 'Отзывы', icon: '◧' },
  { to: '/admin/faq', label: 'FAQ', icon: '◧' },
  { to: '/admin/vacancies', label: 'Вакансии', icon: '◧' },
  { to: '/admin/pages', label: 'Страницы', icon: '◧' },
  { to: '/admin/navigation', label: 'Навигация', icon: '◧' },
  { to: '/admin/media', label: 'Медиа-библиотека', icon: '◧' },
  { to: '/admin/import', label: 'Импорт Yandex', icon: '◧' },
  { to: '/admin/integrations', label: 'Интеграции', icon: '◧' },
  { to: '/admin/settings', label: 'Настройки', icon: '◧' },
  { to: '/admin/users', label: 'Пользователи', icon: '◧' },
  { to: '/admin/audit', label: 'Audit log', icon: '◧' },
];
</script>

<template>
  <aside class="admin-sidebar">
    <div class="brand">Молодость · admin</div>
    <nav>
      <RouterLink v-for="i in items" :key="i.to" :to="i.to">{{ i.label }}</RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  background: var(--color-surface-1);
  border-right: 1px solid var(--color-border);
  padding: var(--space-6) var(--space-4);
  overflow-y: auto;
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
  padding: var(--space-3) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  transition: all var(--duration-fast) var(--ease-out);
}
nav a:hover {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
}
nav a.router-link-active {
  background: var(--color-accent);
  color: white;
}
</style>