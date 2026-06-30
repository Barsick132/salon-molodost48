<script setup lang="ts">
/**
 * AdminLayout — top bar + sidebar (desktop) / drawer (mobile).
 * Burger button on mobile opens the drawer from the left.
 *
 * Drawer closes when the user navigates (route change) — we watch the
 * current path. Clicking a sidebar item also closes it immediately.
 */
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import AdminSidebar from '@/components/admin/AdminSidebar.vue';
import AdminTopbar from '@/components/admin/AdminTopbar.vue';

const drawerOpen = ref(false);
const isMobile = ref(false);
const route = useRoute();

function closeDrawer() { drawerOpen.value = false; }

function updateLayout() {
  isMobile.value = window.innerWidth < 900;
  if (!isMobile.value) drawerOpen.value = false;
}

onMounted(() => {
  updateLayout();
  window.addEventListener('resize', updateLayout);
});
onUnmounted(() => window.removeEventListener('resize', updateLayout));

watch(() => route.fullPath, () => {
  drawerOpen.value = false;
});
</script>

<template>
  <div class="admin-layout">
    <!-- Desktop sidebar (always visible, not in drawer) -->
    <div v-if="!isMobile" class="admin-sidebar-wrap">
      <AdminSidebar />
    </div>

    <div class="admin-main">
      <AdminTopbar :show-burger="isMobile" @open-drawer="drawerOpen = true" />
      <div class="admin-content">
        <RouterView />
      </div>
    </div>

    <!-- Mobile drawer -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="drawerOpen" class="drawer-backdrop" @click.self="closeDrawer">
          <div class="drawer">
            <button class="drawer-close" @click="closeDrawer" aria-label="Закрыть">✕</button>
            <AdminSidebar @navigate="closeDrawer" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.admin-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  align-items: start;
  min-height: 100vh;
}
.admin-sidebar-wrap {
  position: sticky;
  top: 0;
  align-self: stretch;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.admin-main {
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  min-width: 0;
}
.admin-content {
  padding: var(--space-8);
  flex: 1;
  min-width: 0;
}

@media (max-width: 900px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }
  .admin-content {
    padding: 1.25rem;
  }
}

/* Drawer */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-start;
}
.drawer {
  width: min(280px, 80vw);
  background: var(--color-surface-1);
  border-right: 1px solid var(--color-border);
  height: 100%;
  position: relative;
  overflow-y: auto;
}
.drawer-close {
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  z-index: 2;
}
.drawer-close:hover { background: var(--color-surface-2); color: var(--color-text-primary); }

.drawer-enter-active, .drawer-leave-active {
  transition: opacity 0.18s ease;
}
.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .drawer, .drawer-leave-to .drawer { transform: translateX(-100%); }
</style>