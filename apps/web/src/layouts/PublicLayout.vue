<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import SiteHeader from '@/components/public/SiteHeader.vue';
import SiteFooter from '@/components/public/SiteFooter.vue';
import { useSiteStore } from '@/stores/site';
import { useIntegrationsStore } from '@/stores/integrations';

const site = useSiteStore();
const integrations = useIntegrationsStore();

// Preload both stores on first paint; they use 60-s server cache.
onMounted(async () => {
  await Promise.all([site.fetch(), integrations.fetch()]);
});
</script>

<template>
  <SiteHeader />
  <main>
    <RouterView />
  </main>
  <SiteFooter />
</template>