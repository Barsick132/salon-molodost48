<script setup lang="ts">
/**
 * Public site footer — pulls phone + working hours + nav from /api/settings
 * so the site stays consistent with what the admin edits.
 */
import { computed } from 'vue';
import { useSiteStore } from '@/stores/site';
import DikidiBookingButton from '@/components/public/DikidiBookingButton.vue';

const site = useSiteStore();
const phones = computed(() => site.settings.contact.phones);
const hours = computed(() => site.settings.contact.workingHours ?? []);

function todayLabel() {
  return hours.value.find((h) => {
    if (!h.open) return false;
    return true;
  });
}
</script>

<template>
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <h3>{{ site.settings.brand.name }}</h3>
          <p class="footer-tag">{{ site.settings.brand.tagline }}</p>
          <p class="footer-addr">{{ site.settings.contact.address }}</p>
        </div>

        <div class="footer-col">
          <h4>Контакты</h4>
          <ul class="footer-list">
            <li v-for="p in phones" :key="p">
              <a :href="`tel:${p.replace(/[^\d+]/g, '')}`">{{ p }}</a>
            </li>
            <li v-if="site.settings.contact.email">
              <a :href="`mailto:${site.settings.contact.email}`">{{ site.settings.contact.email }}</a>
            </li>
          </ul>
        </div>

        <div class="footer-col">
          <h4>Часы работы</h4>
          <ul class="footer-list footer-list--tight">
            <li v-for="h in hours" :key="h.day" class="hours-row">
              <span class="hours-row__day">{{ h.label }}</span>
              <span class="hours-row__time">
                <template v-if="h.isDayOff || !h.open">вых.</template>
                <template v-else>{{ h.open }}–{{ h.close }}</template>
              </span>
            </li>
          </ul>
        </div>

        <div class="footer-col footer-col--cta">
          <DikidiBookingButton variant="primary" size="md" block />
        </div>
      </div>

      <div class="footer-bottom">
        <span>© {{ new Date().getFullYear() }} {{ site.settings.brand.name }}</span>
        <span class="footer-bottom__sep">·</span>
        <span>г. Липецк</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: 6rem;
  padding: 4rem 0 2rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-1);
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  gap: 2.5rem;
  margin-bottom: 3rem;
}
.footer-brand h3 {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin-bottom: 0.4rem;
}
.footer-tag {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  margin: 0 0 1rem;
}
.footer-addr {
  font-size: 0.95rem;
  color: var(--color-text-primary);
  margin: 0;
}

.footer-col h4 {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
  font-weight: 600;
  margin-bottom: 0.85rem;
}
.footer-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 0.9rem;
}
.footer-list a {
  color: var(--color-text-primary);
  text-decoration: none;
  transition: color 0.15s ease;
}
.footer-list a:hover { color: var(--color-accent); }
.footer-list--tight {
  font-size: 0.825rem;
  color: var(--color-text-secondary);
}
.hours-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
.hours-row__day { font-weight: 500; }
.hours-row__time { color: var(--color-text-muted); }

.footer-col--cta {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-top: 1.5rem;
}

.footer-bottom {
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.8rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.footer-bottom__sep { opacity: 0.5; }

@media (max-width: 900px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }
  .footer-col--cta { grid-column: 1 / -1; padding-top: 0; }
}
@media (max-width: 500px) {
  .footer-grid { grid-template-columns: 1fr; }
}
</style>