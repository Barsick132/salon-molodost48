/**
 * Public integrations routes — returns safe, non-credential data.
 * Used by the public site to render booking buttons, maps, etc.
 */

import type { FastifyPluginAsync } from 'fastify';
import { DikidiPublicConfig } from '@molodost/shared';

const plugin: FastifyPluginAsync = async (app) => {
  // GET /api/integrations/dikidi/widget — public widget config
  app.get('/integrations/dikidi/widget', async () => {
    const cfg = await app.integrations.getDikidi();
    return DikidiPublicConfig.parse({
      enabled: cfg.enabled,
      publicPageUrl: cfg.publicPageUrl,
      widgetUrl: cfg.widgetUrl,
      buttonLabel: cfg.buttonLabel,
      stickyMobile: cfg.stickyMobile,
    });
  });

  // GET /api/integrations — list all public configs
  app.get('/integrations', async () => {
    const dikidi = await app.integrations.getDikidi();
    return {
      dikidi: DikidiPublicConfig.parse({
        enabled: dikidi.enabled,
        publicPageUrl: dikidi.publicPageUrl,
        widgetUrl: dikidi.widgetUrl,
        buttonLabel: dikidi.buttonLabel,
        stickyMobile: dikidi.stickyMobile,
      }),
    };
  });
};

export default plugin;