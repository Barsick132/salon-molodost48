/**
 * Site settings store — public-side mirror of /api/settings.
 *
 * Single source of truth for:
 *  - brand (name, tagline)
 *  - contact (address, phones, email, workingHours, socials)
 *  - map (provider, coords, iframeUrl, custom marker)
 *  - page & section visibility flags
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
  workingHours: { day: string; label: string; open: string; close: string; isDayOff: boolean }[];
  socials: Record<string, string>;
}
export interface SiteMap {
  provider: 'yandex' | 'google' | 'osm' | 'custom-iframe';
  iframeUrl: string | null;
  markerLat: number | null;
  markerLng: number | null;
  zoom: number;
  customMarkerUrl: string | null;
  routeStartHint: string;
}
export interface SiteVisibility {
  servicesEnabled: boolean;
  mastersEnabled: boolean;
  galleryEnabled: boolean;
  promotionsEnabled: boolean;
  reviewsEnabled: boolean;
  vacanciesEnabled: boolean;
  faqEnabled: boolean;
  contactsEnabled: boolean;
  homeServicesSectionEnabled: boolean;
  servicesInNavEnabled: boolean;
}

export interface SiteSettings {
  brand: { name: string; tagline: string };
  contact: SiteContact;
  map: SiteMap;
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
    workingHours: [],
    socials: {},
  },
  map: {
    provider: 'yandex',
    iframeUrl: null,
    markerLat: null,
    markerLng: null,
    zoom: 15,
    customMarkerUrl: null,
    routeStartHint: 'Ваш адрес или точка на карте',
  },
  pages: {
    servicesEnabled: true,
    mastersEnabled: true,
    galleryEnabled: true,
    promotionsEnabled: true,
    reviewsEnabled: true,
    vacanciesEnabled: true,
    faqEnabled: true,
    contactsEnabled: true,
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