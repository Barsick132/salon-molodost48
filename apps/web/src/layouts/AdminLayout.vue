<script setup lang="ts">
import { RouterView } from 'vue-router';
import AdminSidebar from '@/components/admin/AdminSidebar.vue';
import AdminTopbar from '@/components/admin/AdminTopbar.vue';
</script>

<template>
  <div class="admin-layout">
    <AdminSidebar />
    <div class="admin-main">
      <AdminTopbar />
      <div class="admin-content">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}
.admin-main {
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}
.admin-content {
  padding: var(--space-8);
  flex: 1;
}
@media (max-width: 768px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }
}
</style>