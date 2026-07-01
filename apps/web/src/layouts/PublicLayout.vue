<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import SiteHeader from '@/components/public/SiteHeader.vue';
import SiteFooter from '@/components/public/SiteFooter.vue';
import { useSiteStore } from '@/stores/site';

const site = useSiteStore();

// Preload both stores on first paint; they use 60-s server cache.
onMounted(async () => {
  await site.fetch();
});
</script>

<template>
  <SiteHeader />
  <main>
    <RouterView />
  </main>
  <SiteFooter />
</template>