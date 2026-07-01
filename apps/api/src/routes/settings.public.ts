/**
 * Public site settings — read-only projection used by the public site.
 * Trimmed to a known-safe shape; nothing secret, no admin toggles.
 *
 * GET /api/settings → brand, contact info, map config, cta button,
 * page visibility flags, SEO meta.
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
      address: d.address,
      phones: d.phones,
      email: d.email,
      // Free-form working-hours text. Public site displays it as-is.
      workingHours: d.workingHoursText,
      socials: d.socials,
    },
    map: {
      // "yandex" (auto iframe by address) | "custom" (use iframeUrl) | "hidden"
      provider: d.mapProvider,
      iframeUrl: d.mapIframeUrl || null,
      zoom: d.mapZoom,
      hidden: d.mapHidden,
    },
    cta: {
      label: d.ctaLabel,
      url: d.ctaUrl,
      showInToolbar: d.ctaShowInToolbar,
      showInBanner: d.ctaShowInBanner,
      showInCtaStrip: d.ctaShowInCtaStrip,
    },
    pages: {
      servicesEnabled: d.servicesPageEnabled,
      homeServicesSectionEnabled: d.homeServicesSectionEnabled,
      servicesInNavEnabled: d.servicesInNavEnabled,
    },
    seo: {
      title: d.seoTitle,
      description: d.seoDescription,
    },
    accentColor: d.accentColor,
    logoUrl: d.logoUrl || null,
    faviconUrl: d.faviconUrl || null,
  };
}

const plugin: FastifyPluginAsync = async (app) => {
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
