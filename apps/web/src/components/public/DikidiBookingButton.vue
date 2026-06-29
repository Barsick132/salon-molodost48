<script setup lang="ts">
/**
 * DikidiBookingButton — кнопка «Записаться», открывает Dikidi widget.
 *
 * Использует store `useIntegrationsStore` (грузит /api/integrations один раз).
 * Можно передать serviceId/masterId для deep-link.
 */

import { ref } from 'vue';
import { useIntegrationsStore } from '@/stores/integrations';
import DikidiWidget from './DikidiWidget.vue';

const props = withDefaults(defineProps<{
  serviceId?: string | null;
  masterId?: string | null;
  variant?: 'primary' | 'secondary' | 'ghost' | 'sticky';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}>(), {
  serviceId: null,
  masterId: null,
  variant: 'primary',
  size: 'md',
  label: undefined,
});

const integrations = useIntegrationsStore();
const open = ref(false);

function click() {
  if (!integrations.dikidi.enabled) {
    // Fallback: открываем публичную страницу в новой вкладке
    window.open(integrations.dikidi.publicPageUrl, '_blank', 'noopener');
    return;
  }
  open.value = true;
}

const labelText = props.label ?? integrations.dikidi.buttonLabel ?? 'Записаться';
</script>

<template>
  <button :class="['btn', `btn-${variant}`, `btn-${size}`]" @click="click">
    {{ labelText }}
  </button>
  <DikidiWidget
    v-if="integrations.dikidi.enabled"
    v-model:open="open"
    :widget-url="integrations.dikidi.widgetUrl"
    :service-id="serviceId"
    :master-id="masterId"
  />
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  border: 1px solid transparent;
  white-space: nowrap;
}
.btn-sm { padding: var(--space-2) var(--space-4); font-size: var(--font-size-sm); }
.btn-md { padding: var(--space-3) var(--space-6); font-size: var(--font-size-base); }
.btn-lg { padding: var(--space-4) var(--space-8); font-size: var(--font-size-lg); }

.btn-primary {
  background: var(--color-accent);
  color: white;
  box-shadow: 0 4px 14px var(--color-accent-glow);
}
.btn-primary:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px var(--color-accent-glow);
}

.btn-secondary {
  background: var(--color-surface-2);
  color: var(--color-text-primary);
  border-color: var(--color-border);
}
.btn-secondary:hover {
  background: var(--color-surface-3);
  border-color: var(--color-accent);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
}
.btn-ghost:hover { color: var(--color-accent); }

.btn-sticky {
  position: fixed;
  left: 50%;
  bottom: var(--space-4);
  transform: translateX(-50%);
  z-index: 50;
  background: var(--color-accent);
  color: white;
  box-shadow: var(--shadow-lg), 0 0 24px var(--color-accent-glow);
  padding: var(--space-4) var(--space-8);
  font-size: var(--font-size-base);
  border-radius: var(--radius-full);
}
</style>