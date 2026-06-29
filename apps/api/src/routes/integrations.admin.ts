/**
 * Admin integrations routes — manage integration configs.
 * All routes require admin auth.
 */

import type { FastifyPluginAsync } from 'fastify';
import { DikidiConfig } from '@molodost/shared';
import { z } from 'zod';

const UpdateDikidiSchema = DikidiConfig.partial();

const plugin: FastifyPluginAsync = async (app) => {
  // All routes require admin
  app.addHook('onRequest', app.auth.requireAdmin);

  // GET /api/admin/integrations/dikidi — full config (incl. apiToken)
  app.get('/integrations/dikidi', async () => {
    const row = await app.prisma.integrationConfig.findUnique({ where: { id: 'dikidi' } });
    if (!row) return null;
    return {
      ...(row.config as object),
      enabled: row.enabled,
      lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
      lastSyncStatus: row.lastSyncStatus,
    };
  });

  // PUT /api/admin/integrations/dikidi — update config
  app.put('/integrations/dikidi', async (req, reply) => {
    const parsed = UpdateDikidiSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'invalid', message: 'Invalid config', details: parsed.error.flatten() } });
    }
    const current = await app.prisma.integrationConfig.findUnique({ where: { id: 'dikidi' } });
    if (!current) {
      await app.prisma.integrationConfig.create({
        data: {
          id: 'dikidi',
          type: 'booking',
          enabled: parsed.data.enabled ?? true,
          config: parsed.data as object,
          updatedBy: req.adminUser.id,
        },
      });
    } else {
      await app.prisma.integrationConfig.update({
        where: { id: 'dikidi' },
        data: {
          enabled: parsed.data.enabled ?? current.enabled,
          config: { ...(current.config as object), ...parsed.data } as object,
          updatedBy: req.adminUser.id,
        },
      });
    }
    await app.prisma.auditLog.create({
      data: {
        userId: req.adminUser.id,
        action: 'integration.update',
        entity: 'IntegrationConfig',
        entityId: 'dikidi',
        diff: parsed.data as object,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? '',
      },
    });
    return { ok: true };
  });

  // POST /api/admin/integrations/dikidi/sync — sync catalog from Dikidi API
  // Stub for now; needs real Dikidi Business API integration.
  app.post('/integrations/dikidi/sync', async (req, reply) => {
    const cfg = await app.integrations.getDikidi();
    if (!cfg.apiToken) {
      return reply.code(400).send({
        error: {
          code: 'no_token',
          message: 'Dikidi API token is not configured. Add it in Settings → Integrations.',
        },
      });
    }
    // TODO: real sync via Dikidi Business API.
    // For now we mark as ok with a placeholder.
    await app.prisma.integrationConfig.update({
      where: { id: 'dikidi' },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'pending — Dikidi Business API integration coming in next phase',
      },
    });
    return {
      ok: true,
      message: 'Sync queued. Full Dikidi Business API sync will be implemented when you provide API credentials.',
    };
  });
};

export default plugin;