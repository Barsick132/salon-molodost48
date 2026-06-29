<script setup lang="ts">
/**
 * HomePage — renders enabled blocks dynamically from API.
 * Will be implemented fully in the next phase; placeholder for now.
 */
import { onMounted } from 'vue';
import { useIntegrationsStore } from '@/stores/integrations';
import DikidiBookingButton from '@/components/public/DikidiBookingButton.vue';

const integrations = useIntegrationsStore();
onMounted(() => integrations.load());
</script>

<template>
  <div class="container home">
    <section class="hero">
      <h1>Салон красоты бизнес-класса «Молодость»</h1>
      <p class="lead">
        Профессиональные стилисты, косметика L'Oréal, уютная атмосфера — и всё это в самом центре Липецка.
      </p>
      <div class="cta-row">
        <DikidiBookingButton variant="primary" size="lg" />
        <a href="/services" class="cta-secondary">Посмотреть услуги →</a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home { padding: var(--space-16) 0 var(--space-24); }
.hero {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
}
h1 {
  font-size: clamp(2rem, 6vw, var(--font-size-6xl));
  max-width: 800px;
  letter-spacing: -0.03em;
  background: linear-gradient(180deg, var(--color-text-primary) 0%, var(--color-text-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.lead {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  max-width: 600px;
}
.cta-row {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  justify-content: center;
}
.cta-secondary {
  padding: var(--space-4) var(--space-6);
  font-weight: 500;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}
.cta-secondary:hover { color: var(--color-accent); border-color: var(--color-accent); }
</style>