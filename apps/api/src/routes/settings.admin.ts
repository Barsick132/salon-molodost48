/**
 * Admin site settings — full row edit.
 *
 *   GET   /api/admin/site                       — all fields
 *   PUT   /api/admin/site/contact                — phones, address, workingHoursText, socials, email
 *   PUT   /api/admin/site/map                    — provider, iframeUrl, zoom, hidden
 *   PUT   /api/admin/site/visibility             — servicesPageEnabled, homeServicesSectionEnabled, servicesInNavEnabled
 *   PUT   /api/admin/site/brand                  — name, tagline, seo, accent
 *   PUT   /api/admin/site/cta                    — booking button label, url, showIn* flags
 *
 * Every mutation logs an AuditLog entry.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

function js(s: z.ZodType): unknown {
  return zodToJsonSchema(s, { target: 'jsonSchema7' });
}

const Contact = z.object({
  shortAddress: z.string().max(300).optional(),
  fullAddress:  z.string().max(500).optional(),
  phones:       z.array(z.string().max(40)).max(10).optional(),
  email:        z.string().email().max(160).optional(),
  // Free-form working-hours text. Examples shown as placeholders in
  // the admin form:
  //   "пн-пт 10:00–20:00, сб-вс выходной"
  //   "Ежедневно 10:00–20:00"
  workingHoursText: z.string().max(500).optional(),
  socials:      z.record(z.string(), z.string().url().or(z.literal(''))).optional(),
});

// Map config: only three things matter.
//   - provider: "yandex" (auto iframe by address) | "custom" (use iframeUrl) | "hidden"
//   - iframeUrl: required for "custom", ignored otherwise
//   - zoom: Yandex iframe zoom 1..21
//   - hidden: when true, no map is rendered on the public page at all
const Map_ = z.object({
  provider:  z.enum(['yandex', 'custom', 'hidden']).optional(),
  iframeUrl: z.string().max(2000).optional(),
  zoom:      z.number().int().min(1).max(21).optional(),
  hidden:    z.boolean().optional(),
});

// Only flags we still need: services module on/off, services nav link,
// services preview block on home.
const Visibility = z.object({
  servicesPageEnabled:        z.boolean().optional(),
  homeServicesSectionEnabled: z.boolean().optional(),
  servicesInNavEnabled:       z.boolean().optional(),
});

const Brand = z.object({
  brandName:    z.string().max(120).optional(),
  brandTagline: z.string().max(300).optional(),
  seoTitle:     z.string().max(300).optional(),
  seoDescription: z.string().max(1000).optional(),
  accentColor:  z.string().regex(/^#[0-9A-Fa-f]{3,8}$/).optional(),
  logoUrl:      z.string().max(500).optional(),
  faviconUrl:   z.string().max(500).optional(),
});

const Cta = z.object({
  ctaLabel:          z.string().max(60).optional(),
  ctaUrl:            z.string().max(500).optional(),
  ctaShowInToolbar:  z.boolean().optional(),
  ctaShowInBanner:   z.boolean().optional(),
  ctaShowInCtaStrip: z.boolean().optional(),
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
        ...(patch.shortAddress     !== undefined ? { shortAddress: patch.shortAddress } : {}),
        ...(patch.fullAddress      !== undefined ? { address: patch.fullAddress } : {}),
        ...(patch.phones           !== undefined ? { phones: patch.phones } : {}),
        ...(patch.email            !== undefined ? { email: patch.email } : {}),
        ...(patch.workingHoursText !== undefined ? { workingHoursText: patch.workingHoursText } : {}),
        ...(patch.socials          !== undefined ? { socials: patch.socials } : {}),
      },
    });
    await audit(app, req, 'site.contact.update', patch);
    return { ok: true, contact: {
      shortAddress: updated.shortAddress,
      fullAddress: updated.address,
      phones: updated.phones,
      email: updated.email,
      workingHoursText: updated.workingHoursText,
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
        ...(patch.provider  !== undefined ? { mapProvider: patch.provider } : {}),
        ...(patch.iframeUrl !== undefined ? { mapIframeUrl: patch.iframeUrl } : {}),
        ...(patch.zoom      !== undefined ? { mapZoom: patch.zoom } : {}),
        ...(patch.hidden    !== undefined ? { mapHidden: patch.hidden } : {}),
      },
    });
    await audit(app, req, 'site.map.update', patch);
    return { ok: true, map: {
      provider: updated.mapProvider,
      iframeUrl: updated.mapIframeUrl,
      zoom: updated.mapZoom,
      hidden: updated.mapHidden,
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

  // PUT cta
  app.put('/site/cta', {
    schema: { body: js(Cta) },
  }, async (req) => {
    const patch = req.body as z.infer<typeof Cta>;
    await app.prisma.siteSettings.update({
      where: { id: 'singleton' },
      data: { ...patch },
    });
    await audit(app, req, 'site.cta.update', patch);
    return { ok: true };
  });
};

export default plugin;
