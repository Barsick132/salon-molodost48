/**
 * Admin site settings — full row edit.
 *
 *   GET   /api/admin/site                       — all fields (incl. legacy ones)
 *   PUT   /api/admin/site/contact                — phones, address, workingHours, socials, email, full address
 *   PUT   /api/admin/site/map                    — provider, coords, zoom, iframe, custom marker
 *   PUT   /api/admin/site/visibility             — page + section toggles
 *   PUT   /api/admin/site/brand                  — name, tagline, seo, accent
 *
 * Every mutation logs an AuditLog entry.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

function js(s: z.ZodType): unknown {
  return zodToJsonSchema(s, { target: 'jsonSchema7' });
}

const DayHours = z.object({
  day: z.string(),         // 'mon' | 'tue' | ... | 'sun'
  label: z.string(),       // 'Пн' | 'Понедельник'
  open: z.string(),        // '09:00' or ''
  close: z.string(),       // '21:00' or ''
  isDayOff: z.boolean().default(false),
});

const Contact = z.object({
  shortAddress: z.string().max(300).optional(),
  fullAddress:  z.string().max(500).optional(),
  phones:       z.array(z.string().max(40)).max(10).optional(),
  email:        z.string().email().max(160).optional(),
  workingHours: z.array(DayHours).max(7).optional(),
  socials:      z.record(z.string(), z.string().url().or(z.literal(''))).optional(),
});

const Map_ = z.object({
  provider: z.enum(['yandex', 'google', 'osm', 'custom-iframe']).optional(),
  iframeUrl: z.string().max(2000).optional(),
  markerLat: z.number().min(-90).max(90).nullable().optional(),
  markerLng: z.number().min(-180).max(180).nullable().optional(),
  zoom:      z.number().int().min(1).max(21).optional(),
  customMarkerUrl: z.string().max(2000).optional(),
  routeStartHint:  z.string().max(200).optional(),
});

const Visibility = z.object({
  servicesPageEnabled:          z.boolean().optional(),
  mastersPageEnabled:          z.boolean().optional(),
  galleryPageEnabled:          z.boolean().optional(),
  promotionsPageEnabled:       z.boolean().optional(),
  reviewsPageEnabled:          z.boolean().optional(),
  vacanciesPageEnabled:        z.boolean().optional(),
  faqPageEnabled:              z.boolean().optional(),
  contactsPageEnabled:         z.boolean().optional(),
  homeServicesSectionEnabled:  z.boolean().optional(),
  homeMastersSectionEnabled:   z.boolean().optional(),
  servicesInNavEnabled:        z.boolean().optional(),
});

const Brand = z.object({
  brandName:    z.string().max(120).optional(),
  brandTagline: z.string().max(300).optional(),
  seoTitle:     z.string().max(300).optional(),
  seoDescription: z.string().max(1000).optional(),
  accentColor:  z.string().regex(/^#[0-9A-Fa-f]{3,8}$/).optional(),
});

async function getOrCreate(app: any) {
  return app.prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  });
}

async function audit(app: any, req: any, action: string, diff: unknown) {
  await app.prisma.auditLog.create({
    data: {
      userId: req.adminUser!.id,
      action,
      entity: 'SiteSettings',
      entityId: 'singleton',
      diff: (diff ?? {}) as object,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] ?? '',
    },
  });
}

const plugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.auth.requireAdmin);

  // GET full row
  app.get('/site', async () => {
    const row = await getOrCreate(app);
    return row;
  });

  // PUT contact
  app.put('/site/contact', {
    schema: { body: js(Contact) },
  }, async (req) => {
    const patch = req.body as z.infer<typeof Contact>;
    const updated = await app.prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: {
        ...(patch.shortAddress  !== undefined ? { shortAddress: patch.shortAddress } : {}),
        ...(patch.fullAddress   !== undefined ? { address: patch.fullAddress } : {}),
        ...(patch.phones        !== undefined ? { phones: patch.phones } : {}),
        ...(patch.email         !== undefined ? { email: patch.email } : {}),
        ...(patch.workingHours  !== undefined ? { workingHours: patch.workingHours } : {}),
        ...(patch.socials       !== undefined ? { socials: patch.socials } : {}),
      },
    });
    await audit(app, req, 'site.contact.update', patch);
    return { ok: true, contact: {
      shortAddress: updated.shortAddress,
      fullAddress: updated.address,
      phones: updated.phones,
      email: updated.email,
      workingHours: updated.workingHours,
      socials: updated.socials,
    }};
  });

  // PUT map
  app.put('/site/map', {
    schema: { body: js(Map_) },
  }, async (req) => {
    const patch = req.body as z.infer<typeof Map_>;
    const updated = await app.prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: {
        ...(patch.provider         !== undefined ? { mapProvider: patch.provider } : {}),
        ...(patch.iframeUrl        !== undefined ? { mapIframeUrl: patch.iframeUrl } : {}),
        ...(patch.markerLat        !== undefined ? { mapMarkerLat: patch.markerLat } : {}),
        ...(patch.markerLng        !== undefined ? { mapMarkerLng: patch.markerLng } : {}),
        ...(patch.zoom             !== undefined ? { mapZoom: patch.zoom } : {}),
        ...(patch.customMarkerUrl  !== undefined ? { mapCustomMarkerUrl: patch.customMarkerUrl } : {}),
        ...(patch.routeStartHint   !== undefined ? { mapRouteStartHint: patch.routeStartHint } : {}),
      },
    });
    await audit(app, req, 'site.map.update', patch);
    return { ok: true, map: {
      provider: updated.mapProvider,
      iframeUrl: updated.mapIframeUrl,
      markerLat: updated.mapMarkerLat,
      markerLng: updated.mapMarkerLng,
      zoom: updated.mapZoom,
      customMarkerUrl: updated.mapCustomMarkerUrl,
      routeStartHint: updated.mapRouteStartHint,
    }};
  });

  // PUT visibility
  app.put('/site/visibility', {
    schema: { body: js(Visibility) },
  }, async (req) => {
    const patch = req.body as z.infer<typeof Visibility>;
    await app.prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: { ...patch },
    });
    await audit(app, req, 'site.visibility.update', patch);
    return { ok: true };
  });

  // PUT brand
  app.put('/site/brand', {
    schema: { body: js(Brand) },
  }, async (req) => {
    const patch = req.body as z.infer<typeof Brand>;
    await app.prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: { ...patch },
    });
    await audit(app, req, 'site.brand.update', patch);
    return { ok: true };
  });
};

export default plugin;