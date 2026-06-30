<script setup lang="ts">
/**
 * SiteHeader — desktop: brand + inline nav + booking CTA.
 *            mobile: brand + booking CTA + burger; tap burger opens slide-down menu.
 */
import { ref, onMounted, onUnmounted } from 'vue';
import { useIntegrationsStore } from '@/stores/integrations';
import { useSiteStore } from '@/stores/site';
import DikidiBookingButton from '@/components/public/DikidiBookingButton.vue';

const integrations = useIntegrationsStore();
const site = useSiteStore();

const menuOpen = ref(false);
const isMobile = ref(false);

function sync() {
  isMobile.value = window.innerWidth < 900;
  if (!isMobile.value) menuOpen.value = false;
}

function go(selector: string) {
  menuOpen.value = false;
  // Smooth scroll for hash links; full nav for paths
  if (selector.startsWith('#')) {
    const el = document.querySelector(selector);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

onMounted(() => {
  sync();
  integrations.fetch();
  window.addEventListener('resize', sync);
});
onUnmounted(() => window.removeEventListener('resize', sync));

const navLinks = [
  { to: '/services', show: () => site.settings.pages.servicesInNavEnabled, label: 'Услуги' },
  { to: '/contacts', show: () => true, label: 'Контакты' },
];
</script>

<template>
  <header class="site-header" :class="{ 'site-header--mobile-menu': menuOpen }">
    <div class="container">
      <a href="/" class="logo" @click="menuOpen = false">{{ site.settings.brand.name }}</a>
      <nav v-if="!isMobile" class="nav-desktop">
        <template v-for="link in navLinks.filter((l) => l.show())" :key="link.to">
          <a :href="link.to">{{ link.label }}</a>
        </template>
      </nav>
      <div class="spacer" />
      <div v-if="!isMobile" class="cta">
        <DikidiBookingButton size="sm" />
      </div>
      <button
        v-if="isMobile"
        class="burger"
        @click="menuOpen = !menuOpen"
        :aria-expanded="menuOpen"
        aria-label="Меню"
      >
        <svg v-if="!menuOpen" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <!-- Mobile menu -->
    <Transition name="dropdown">
      <div v-if="isMobile && menuOpen" class="mobile-menu">
        <nav class="mobile-menu__nav">
          <a
            v-for="link in navLinks.filter((l) => l.show())"
            :key="link.to"
            :href="link.to"
            class="mobile-menu__link"
            @click.prevent="go(link.to)"
          >{{ link.label }}</a>
        </nav>
        <div class="mobile-menu__cta">
          <DikidiBookingButton variant="primary" size="md" block @click="menuOpen = false" />
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.site-header {
  background: rgba(10, 10, 10, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}
.site-header > .container {
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 64px;
}
.logo {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
  text-decoration: none;
}
.nav-desktop {
  display: flex;
  gap: 1.5rem;
  margin-left: 2rem;
}
.nav-desktop a {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 0.15s ease;
}
.nav-desktop a:hover { color: var(--color-accent); }
.spacer { flex: 1; }
.cta { display: flex; align-items: center; }

.burger {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface-1);
  color: var(--color-text-secondary);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.burger:hover { background: var(--color-surface-2); color: var(--color-text-primary); }

/* Mobile menu */
.mobile-menu {
  border-top: 1px solid var(--color-border);
  padding: 0.5rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.mobile-menu__nav {
  display: flex;
  flex-direction: column;
}
.mobile-menu__link {
  padding: 0.85rem 0.5rem;
  color: var(--color-text-primary);
  font-size: 1rem;
  font-weight: 500;
  text-decoration: none;
  border-radius: var(--radius-sm);
  border-bottom: 1px solid var(--color-border);
}
.mobile-menu__link:last-child { border-bottom: none; }
.mobile-menu__link:hover { color: var(--color-accent); }
.mobile-menu__cta {
  margin-top: 0.5rem;
}

.dropdown-enter-active, .dropdown-leave-active {
  transition: max-height 0.25s var(--ease-out), opacity 0.2s ease;
  overflow: hidden;
}
.dropdown-enter-from, .dropdown-leave-to {
  max-height: 0;
  opacity: 0;
}
.dropdown-enter-to, .dropdown-leave-from {
  max-height: 400px;
  opacity: 1;
}
</style>