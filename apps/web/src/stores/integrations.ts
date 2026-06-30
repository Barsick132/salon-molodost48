/**
 * Integrations store — public-side mirror of /api/integrations.
 * When `dikidi.enabled === false`, all booking buttons hide globally.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/client';

export interface PublicDikidiConfig {
  enabled: boolean;
  widgetUrl: string;
  buttonLabel: string;
}

export const useIntegrationsStore = defineStore('integrations', () => {
  const dikidi = ref<PublicDikidiConfig>({
    enabled: false,
    widgetUrl: 'https://dikidi.ru/#widget=212727',
    buttonLabel: 'Записаться',
  });

  async function fetch() {
    try {
      const res = await api<{ dikidi: PublicDikidiConfig }>('/integrations');
      if (res?.dikidi) dikidi.value = res.dikidi;
    } catch {
      // Network problem → keep defaults. Booking buttons will still show
      // (assume enabled=true) so visitors can still book during outages.
      dikidi.value = {
        enabled: true,
        widgetUrl: 'https://dikidi.ru/#widget=212727',
        buttonLabel: 'Записаться',
      };
    }
  }

  return { dikidi, fetch };
});