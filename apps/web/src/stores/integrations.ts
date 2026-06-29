import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/client';
import type { DikidiPublicConfig } from '@molodost/shared';

const DEFAULT_DIKIDI: DikidiPublicConfig = {
  enabled: true,
  publicPageUrl: 'https://dikidi.ru/1475188',
  widgetUrl: 'https://dikidi.ru/widget/1475188',
  buttonLabel: 'Записаться',
  stickyMobile: true,
};

export const useIntegrationsStore = defineStore('integrations', () => {
  const dikidi = ref<DikidiPublicConfig>(DEFAULT_DIKIDI);
  const loaded = ref(false);

  async function load() {
    if (loaded.value) return;
    try {
      const data = await api<{ dikidi: DikidiPublicConfig }>('/integrations');
      dikidi.value = data.dikidi;
    } catch {
      // keep defaults
    } finally {
      loaded.value = true;
    }
  }

  return { dikidi, loaded, load };
});