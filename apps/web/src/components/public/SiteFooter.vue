<script setup lang="ts">
/**
 * Public site footer — phone, working-hours string, socials and the
 * central booking CTA (read from site.settings.cta).
 *
 * Note: we keep phone numbers + email as a clean column without bullet
 * markers (the <ul>/<li> list-style:none hack) — feels much less "busy"
 * for a beauty-salon aesthetic. The CTA only renders when admin enabled
 * the toolbar slot for it (showInCtaStrip / showInToolbar as decided in
 * the design: footer uses the same primary CTA as the toolbar).
 */
import { computed } from 'vue';
import { useSiteStore } from '@/stores/site';

const site = useSiteStore();
const phones = computed(() => site.settings.contact.phones.filter(Boolean));
const hours = computed(() => site.settings.contact.workingHours ?? '');
const socials = computed(() => {
  const raw = site.settings.contact.socials || {};
  return Object.entries(raw).filter(([, url]) => !!url);
});
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
          <div class="footer-list">
            <a
              v-for="p in phones"
              :key="p"
              :href="`tel:${p.replace(/[^\d+]/g, '')}`"
              class="footer-link"
            >{{ p }}</a>
            <a
              v-if="site.settings.contact.email"
              :href="`mailto:${site.settings.contact.email}`"
              class="footer-link"
            >{{ site.settings.contact.email }}</a>
          </div>
          <div v-if="socials.length" class="footer-socials">
            <a
              v-for="[key, url] in socials"
              :key="key"
              :href="url"
              target="_blank"
              rel="noopener"
              class="footer-social"
              :aria-label="key"
            >{{ key }}</a>
          </div>
        </div>

        <div class="footer-col">
          <h4>Часы работы</h4>
          <p class="footer-hours">{{ hours }}</p>
        </div>

        <div v-if="site.settings.cta.showInCtaStrip" class="footer-col footer-col--cta">
          <a
            :href="site.settings.cta.url"
            target="_blank"
            rel="noopener"
            class="btn btn--primary btn--md btn--block"
          >{{ site.settings.cta.label }}</a>
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
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.95rem;
}
.footer-link {
  color: var(--color-text-primary);
  text-decoration: none;
  transition: color 0.15s ease;
}
.footer-link:hover { color: var(--color-accent); }

.footer-socials {
  margin-top: 1.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
.footer-social {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  text-decoration: none;
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.footer-social:hover { color: var(--color-accent); border-color: var(--color-accent); }

.footer-hours {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0;
  white-space: pre-line;
}

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