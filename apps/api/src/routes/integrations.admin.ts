/**
 * Admin integrations routes — manage integration configs.
 * All routes require admin auth.
 *
 * Dikidi is a single-URL affair: enabled flag + widgetUrl + buttonLabel.
 * We intentionally don't store/display a business API token — widget mode only.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const UpdateDikidi = z.object({
  enabled: z.boolean().optional(),
  widgetUrl: z.string().url().optional(),
  buttonLabel: z.string().max(40).optional(),
});

function js(s: z.ZodType): unknown {
  return zodToJsonSchema(s, { target: 'jsonSchema7' });
}

const plugin: FastifyPluginAsync = async (app) => {
  // All routes require admin
  app.addHook('preHandler', app.auth.requireAdmin);

  // GET /api/admin/integrations/dikidi
  app.get('/integrations/dikidi', async () => {
    const cfg = await app.integrations.getDikidi();
    return {
      enabled: cfg.enabled,
      widgetUrl: cfg.widgetUrl,
      buttonLabel: cfg.buttonLabel,
    };
  });

  // PUT /api/admin/integrations/dikidi — update config
  app.put('/integrations/dikidi', {
    schema: { body: js(UpdateDikidi) },
  }, async (req) => {
    const data = req.body as z.infer<typeof UpdateDikidi>;
    const current = await app.prisma.integrationConfig.findUnique({ where: { id: 'dikidi' } });
    const currentConfig = (current?.config as Record<string, unknown>) ?? {};
    const mergedConfig = {
      widgetUrl: data.widgetUrl ?? currentConfig.widgetUrl ?? 'https://dikidi.ru/#widget=212727',
      buttonLabel: data.buttonLabel ?? currentConfig.buttonLabel ?? 'Записаться',
    };
    const enabled = data.enabled ?? current?.enabled ?? true;

    if (!current) {
      await app.prisma.integrationConfig.create({
        data: {
          id: 'dikidi',
          type: 'booking',
          enabled,
          config: mergedConfig,
          updatedBy: req.adminUser!.id,
        },
      });
    } else {
      await app.prisma.integrationConfig.update({
        where: { id: 'dikidi' },
        data: {
          enabled,
          config: mergedConfig,
          updatedBy: req.adminUser!.id,
        },
      });
    }

    await app.prisma.auditLog.create({
      data: {
        userId: req.adminUser!.id,
        action: 'integration.update',
        entity: 'IntegrationConfig',
        entityId: 'dikidi',
        diff: data as object,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? '',
      },
    });
    return { ok: true };
  });
};

export default plugin;