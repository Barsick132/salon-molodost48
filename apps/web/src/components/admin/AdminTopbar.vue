<script setup lang="ts">
/**
 * AdminTopbar — burger on mobile (emits `open-drawer`), user info + logout.
 */
import { useAuthStore } from '@/stores/auth';

defineProps<{
  showBurger?: boolean;
}>();
defineEmits<{
  (e: 'openDrawer'): void;
}>();

const auth = useAuthStore();
</script>

<template>
  <header class="admin-topbar">
    <button v-if="showBurger" class="burger" @click="$emit('openDrawer')" aria-label="Открыть меню">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
    <div v-else class="brand-mini">Молодость</div>
    <div class="grow" />
    <div class="user">
      <span class="user__email">{{ auth.user?.email }}</span>
      <button class="user__logout" @click="auth.logout()">Выйти</button>
    </div>
  </header>
</template>

<style scoped>
.admin-topbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: 56px;
  padding: 0 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-1);
  position: sticky;
  top: 0;
  z-index: 50;
}
.brand-mini {
  font-size: 1rem;
  font-weight: 700;
  padding-left: 0.25rem;
}
.burger {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  display: grid;
  place-items: center;
}
.burger:hover { background: var(--color-surface-2); color: var(--color-text-primary); }
.grow { flex: 1; }
.user {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  font-size: 0.825rem;
  color: var(--color-text-secondary);
}
.user__email {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user__logout {
  color: var(--color-accent);
  font-size: 0.825rem;
  background: transparent;
  border: 1px solid transparent;
  padding: 0.3rem 0.6rem;
  border-radius: var(--radius-sm);
}
.user__logout:hover { background: rgba(225, 29, 72, 0.08); }

@media (max-width: 700px) {
  .user__email { display: none; }
}
</style>