<script setup lang="ts">
import { RouterView } from 'vue-router';
import SiteHeader from '@/components/public/SiteHeader.vue';
import SiteFooter from '@/components/public/SiteFooter.vue';
</script>

<template>
  <SiteHeader />
  <main>
    <RouterView />
  </main>
  <SiteFooter />
</template>