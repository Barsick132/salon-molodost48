/**
 * Public integrations routes — returns safe, non-credential data.
 * Used by the public site to render booking buttons.
 *
 * Dikidi contract:
 *   - `enabled` false ⇒ UI hides every booking button
 *   - `widgetUrl` is the single URL we render against (modal or page mode)
 *   - `buttonLabel` is the default CTA text
 */

import type { FastifyPluginAsync } from 'fastify';

const plugin: FastifyPluginAsync = async (app) => {
  // GET /api/integrations/dikidi/widget — public widget config
  app.get('/integrations/dikidi/widget', async () => {
    const cfg = await app.integrations.getDikidi();
    return {
      enabled: cfg.enabled,
      widgetUrl: cfg.widgetUrl,
      buttonLabel: cfg.buttonLabel,
    };
  });

  // GET /api/integrations — list all public configs (only dikidi for now)
  app.get('/integrations', async () => {
    const dikidi = await app.integrations.getDikidi();
    return {
      dikidi: {
        enabled: dikidi.enabled,
        widgetUrl: dikidi.widgetUrl,
        buttonLabel: dikidi.buttonLabel,
      },
    };
  });
};

export default plugin;