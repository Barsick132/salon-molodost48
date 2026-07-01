/**
 * Site settings store — public-side mirror of /api/settings.
 *
 * Single source of truth for:
 *  - brand (name, tagline)
 *  - contact (address, phones, email, workingHoursText, socials)
 *  - map (provider, iframeUrl, zoom, hidden)
 *  - cta (label, url, showIn*)
 *  - page & section visibility flags
 *  - seo meta
 *
 * Loaded once on app boot from PublicLayout. Cached for ~60s at the API.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/client';

export interface SiteContact {
  address: string;
  fullAddress: string;
  phones: string[];
  email: string;
  /** Free-form working-hours text, e.g. "пн-пт 10:00–20:00, сб-вс выходной". */
  workingHours: string;
  socials: Record<string, string>;
}
export interface SiteMap {
  provider: 'yandex' | 'custom' | 'hidden';
  iframeUrl: string | null;
  zoom: number;
  hidden: boolean;
}
export interface SiteCta {
  label: string;
  url: string;
  showInToolbar: boolean;
  showInBanner: boolean;
  showInCtaStrip: boolean;
}
export interface SiteVisibility {
  servicesEnabled: boolean;
  homeServicesSectionEnabled: boolean;
  servicesInNavEnabled: boolean;
}

export interface SiteSettings {
  brand: { name: string; tagline: string };
  contact: SiteContact;
  map: SiteMap;
  cta: SiteCta;
  pages: SiteVisibility;
  seo: { title: string; description: string };
  accentColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  loaded: boolean;
}

const DEFAULTS: SiteSettings = {
  brand: { name: 'Молодость', tagline: 'Салон красоты бизнес-класса' },
  contact: {
    address: 'г. Липецк, ул. Пушкина, 4',
    fullAddress: '',
    phones: [],
    email: '',
    workingHours: 'пн-пт 10:00–20:00, сб-вс выходной',
    socials: {},
  },
  map: {
    provider: 'yandex',
    iframeUrl: null,
    zoom: 15,
    hidden: false,
  },
  cta: {
    label: 'Записаться онлайн',
    url: 'https://dikidi.ru/#widget=212727',
    showInToolbar: true,
    showInBanner: true,
    showInCtaStrip: true,
  },
  pages: {
    servicesEnabled: true,
    homeServicesSectionEnabled: true,
    servicesInNavEnabled: true,
  },
  seo: { title: '', description: '' },
  accentColor: '#E11D48',
  logoUrl: null,
  faviconUrl: null,
  loaded: false,
};

export const useSiteStore = defineStore('site', () => {
  const settings = ref<SiteSettings>(JSON.parse(JSON.stringify(DEFAULTS)));
  const error = ref<string | null>(null);

  async function fetch(force = false) {
    if (settings.value.loaded && !force) return;
    try {
      const data = await api<Omit<SiteSettings, 'loaded'>>('/settings');
      settings.value = { ...settings.value, ...data, loaded: true };
      error.value = null;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'site settings load failed';
      // Still mark loaded so we don't refetch every render
      settings.value.loaded = true;
    }
  }

  return { settings, error, fetch };
});
