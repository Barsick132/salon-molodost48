/**
 * Public site settings — read-only projection used by the public site.
 * Trimmed to a known-safe shape; nothing secret, no admin toggles.
 *
 * GET /api/settings → brand, contact info, map config, page visibility flags.
 */

import type { FastifyPluginAsync } from 'fastify';
import type { SiteSettings } from '@prisma/client';

function safe(d: SiteSettings) {
  return {
    brand: {
      name: d.brandName,
      tagline: d.brandTagline,
    },
    contact: {
      address: d.shortAddress,
      fullAddress: d.address,
      phones: d.phones,
      email: d.email,
      workingHours: d.workingHours,
      socials: d.socials,
    },
    map: {
      provider: d.mapProvider,
      iframeUrl: d.mapIframeUrl || null,
      markerLat: d.mapMarkerLat,
      markerLng: d.mapMarkerLng,
      zoom: d.mapZoom,
      customMarkerUrl: d.mapCustomMarkerUrl || null,
      routeStartHint: d.mapRouteStartHint,
    },
    pages: {
      servicesEnabled: d.servicesPageEnabled,
      mastersEnabled: d.mastersPageEnabled,
      galleryEnabled: d.galleryPageEnabled,
      promotionsEnabled: d.promotionsPageEnabled,
      reviewsEnabled: d.reviewsPageEnabled,
      vacanciesEnabled: d.vacanciesPageEnabled,
      faqEnabled: d.faqPageEnabled,
      contactsEnabled: d.contactsPageEnabled,
      homeServicesSectionEnabled: d.homeServicesSectionEnabled,
      servicesInNavEnabled: d.servicesInNavEnabled,
    },
    seo: {
      title: d.seoTitle,
      description: d.seoDescription,
    },
    accentColor: d.accentColor,
  };
}

const plugin: FastifyPluginAsync = async (app) => {
  // No auth. Cached for 60 s at edge/proxy layer (nginx honours Cache-Control).
  app.get('/settings', async (_req, reply) => {
    const row = await app.prisma.siteSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton' },
      update: {},
    });
    reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return safe(row);
  });
};

export default plugin;