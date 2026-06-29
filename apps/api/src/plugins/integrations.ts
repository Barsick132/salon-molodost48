/**
 * Integrations plugin — exposes integration configs to all routes.
 * Provides a typed getter for each known integration.
 */

import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import type { DikidiConfig } from '@molodost/shared';

declare module 'fastify' {
  interface FastifyInstance {
    integrations: {
      getDikidi(): Promise<DikidiConfig>;
    };
  }
}

const plugin: FastifyPluginAsync = async (app) => {
  app.decorate('integrations', {
    async getDikidi() {
      const row = await app.prisma.integrationConfig.findUnique({
        where: { id: 'dikidi' },
      });
      if (!row) {
        // Return safe defaults if not seeded
        return {
          enabled: false,
          publicPageUrl: 'https://dikidi.ru/1475188',
          businessId: '1475188',
          widgetUrl: 'https://dikidi.ru/widget/1475188',
          buttonLabel: 'Записаться',
          stickyMobile: true,
          apiToken: '',
          lastSyncAt: null,
        };
      }
      return {
        ...(row.config as object),
        enabled: row.enabled && (row.config as { enabled?: boolean })?.enabled !== false,
      } as DikidiConfig;
    },
  });
};

export default fp(plugin, { name: 'integrations' });