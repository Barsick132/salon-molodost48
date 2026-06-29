<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
const auth = useAuthStore();
</script>

<template>
  <header class="admin-topbar">
    <div class="grow" />
    <div class="user">
      <span>{{ auth.user?.email }}</span>
      <button @click="auth.logout()">Выйти</button>
    </div>
  </header>
</template>

<style scoped>
.admin-topbar {
  display: flex;
  align-items: center;
  height: 64px;
  padding: 0 var(--space-8);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-1);
}
.grow { flex: 1; }
.user {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.user button {
  color: var(--color-accent);
  font-size: var(--font-size-sm);
}
.user button:hover { color: var(--color-accent-hover); }
</style>