<script setup lang="ts">
/**
 * DikidiWidget — открывает модалку с iframe Dikidi booking.
 *
 * Props:
 *   - open: boolean (v-model:open)
 *   - widgetUrl: URL iframe (defaults to public page)
 *   - serviceId / masterId: optional deep-link params
 *
 * Использование:
 *   <DikidiBookingButton />
 *   или
 *   <DikidiWidget v-model:open="showDikidi" widget-url="..." :service-id="svc.id" />
 */

import { computed } from 'vue';

const props = defineProps<{
  open: boolean;
  widgetUrl: string;
  serviceId?: string | null;
  masterId?: string | null;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const iframeSrc = computed(() => {
  const url = new URL(props.widgetUrl);
  if (props.serviceId) url.searchParams.set('service', props.serviceId);
  if (props.masterId) url.searchParams.set('master', props.masterId);
  return url.toString();
});

function close() {
  emit('update:open', false);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="widget-backdrop" @click.self="close">
        <div class="widget-modal">
          <button class="widget-close" aria-label="Закрыть" @click="close">✕</button>
          <iframe
            :src="iframeSrc"
            frameborder="0"
            allow="payment"
            title="Записаться онлайн"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.widget-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: var(--space-4);
}
.widget-modal {
  position: relative;
  width: 100%;
  max-width: 480px;
  height: min(720px, calc(100vh - 32px));
  background: var(--color-surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}
.widget-modal iframe {
  width: 100%;
  height: 100%;
  display: block;
}
.widget-close {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  z-index: 10;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-surface-3);
  color: var(--color-text-primary);
  font-size: 16px;
  display: grid;
  place-items: center;
}
.widget-close:hover { background: var(--color-accent); }

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-base) var(--ease-out);
}
.fade-enter-from,
.fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .widget-backdrop { padding: 0; }
  .widget-modal {
    max-width: 100%;
    height: 100vh;
    border-radius: 0;
  }
}
</style>