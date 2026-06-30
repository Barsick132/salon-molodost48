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
        // Safe defaults when nothing is configured yet
        return {
          enabled: false,
          widgetUrl: 'https://dikidi.ru/#widget=212727',
          buttonLabel: 'Записаться',
        };
      }
      const cfg = (row.config as Partial<DikidiConfig>) ?? {};
      return {
        enabled: row.enabled,
        widgetUrl: cfg.widgetUrl ?? 'https://dikidi.ru/#widget=212727',
        buttonLabel: cfg.buttonLabel ?? 'Записаться',
      };
    },
  });
};

export default fp(plugin, { name: 'integrations' });