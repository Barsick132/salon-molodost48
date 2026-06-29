<script setup lang="ts">
import { onMounted } from 'vue';
import { useIntegrationsStore } from '@/stores/integrations';
import DikidiBookingButton from '@/components/public/DikidiBookingButton.vue';

const integrations = useIntegrationsStore();
onMounted(() => integrations.load());
</script>

<template>
  <header class="site-header">
    <div class="container">
      <a href="/" class="logo">Молодость</a>
      <nav>
        <a href="/services">Услуги</a>
        <a href="/masters">Мастера</a>
        <a href="/contacts">Контакты</a>
      </nav>
      <div class="cta">
        <DikidiBookingButton variant="primary" size="sm" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  background: rgba(10, 10, 10, 0.7);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}
.site-header .container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
}
.logo {
  font-size: var(--font-size-xl);
  font-weight: 700;
  letter-spacing: -0.02em;
}
nav {
  display: flex;
  gap: var(--space-6);
  flex: 1;
  margin-left: var(--space-8);
}
nav a {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
nav a:hover { color: var(--color-accent); }
.cta { display: flex; gap: var(--space-3); }

@media (max-width: 768px) {
  nav { display: none; }
}
</style>