<script setup lang="ts">
import { onMounted } from 'vue';
import { useIntegrationsStore } from '@/stores/integrations';
import { useSiteStore } from '@/stores/site';
import DikidiBookingButton from '@/components/public/DikidiBookingButton.vue';

const integrations = useIntegrationsStore();
const site = useSiteStore();

onMounted(() => integrations.fetch());
</script>

<template>
  <header class="site-header">
    <div class="container">
      <a href="/" class="logo">{{ site.settings.brand.name }}</a>
      <nav>
        <a v-if="site.settings.pages.servicesInNavEnabled" href="/services">Услуги</a>
        <!-- masters nav link removed in v1 -->
        <a href="/contacts">Контакты</a>
      </nav>
      <div class="cta">
        <DikidiBookingButton size="sm" />
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