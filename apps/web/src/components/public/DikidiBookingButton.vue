<script setup lang="ts">
/**
 * BookingButton — global booking CTA.
 *
 * - Hides itself if `integrations.dikidi.enabled === false`
 * - Sends a `click` event so parents can track analytics
 * - Renders an `<a>` so Dikidi's widget script can intercept and open in-modal;
 *   without the script it gracefully falls back to opening the URL in a new tab
 */
import { computed } from 'vue';
import { useIntegrationsStore } from '@/stores/integrations';

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  block?: boolean;
}>(), {
  variant: 'primary',
  size: 'md',
  block: false,
});

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const store = useIntegrationsStore();

const cls = computed(() => [
  'booking-btn',
  `booking-btn--${props.variant}`,
  `booking-btn--${props.size}`,
  { 'booking-btn--block': props.block },
]);

const labelText = computed(() => {
  if (props.label) return props.label;
  return store.dikidi.buttonLabel || 'Записаться';
});

// Always render — if Dikidi script is loaded, it intercepts; otherwise <a target=_blank> works.
// We render null only when globally disabled via `store.dikidi.enabled === false`.
</script>

<template>
  <a
    v-if="store.dikidi.enabled"
    :href="store.dikidi.widgetUrl"
    target="_blank"
    rel="noopener"
    :class="cls"
    @click="emit('click')"
  >
    {{ labelText }}
  </a>
</template>

<style scoped>
.booking-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s ease, transform 0.1s ease, border-color 0.15s ease;
  white-space: nowrap;
  font-family: inherit;
}
.booking-btn:active { transform: translateY(1px); }

.booking-btn--sm { padding: 0.4rem 0.9rem; font-size: 0.825rem; }
.booking-btn--md { padding: 0.65rem 1.25rem; font-size: 0.95rem; }
.booking-btn--lg { padding: 0.85rem 1.75rem; font-size: 1.05rem; }
.booking-btn--block { width: 100%; }

.booking-btn--primary {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}
.booking-btn--primary:hover { background: var(--color-accent-hover); border-color: var(--color-accent-hover); }

.booking-btn--ghost {
  background: transparent;
  color: var(--color-text-primary);
  border-color: var(--color-border);
}
.booking-btn--ghost:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>