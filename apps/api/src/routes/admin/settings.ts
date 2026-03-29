import { Elysia } from 'elysia';
import { t } from 'elysia';
import { instanceSettingsService } from '../../services/instance-settings.service';

export const adminSettingsRoutes = new Elysia({ prefix: '/api/admin/settings' })
  // Get instance settings
  .get('/', async () => {
    const settings = await instanceSettingsService.getOrCreateSettings();
    return settings;
  })
  // Update instance settings
  .put('/', async ({ body }) => {
    const data = body as {
      mode?: string;
      isOseHomologated?: boolean;
      oseResolutionNumber?: string;
      oseHomologationDate?: string;
      instanceName?: string;
      instanceUrl?: string;
      sunatBetaWsdlUrl?: string;
      sunatProdWsdlUrl?: string;
      sunatBetaRestUrl?: string;
      sunatProdRestUrl?: string;
    };

    const updateData: Parameters<typeof instanceSettingsService.updateSettings>[0] = {
      ...(data.mode !== undefined && { mode: data.mode }),
      ...(data.isOseHomologated !== undefined && { isOseHomologated: data.isOseHomologated }),
      ...(data.oseResolutionNumber !== undefined && { oseResolutionNumber: data.oseResolutionNumber }),
      ...(data.oseHomologationDate !== undefined && { oseHomologationDate: data.oseHomologationDate ? new Date(data.oseHomologationDate) : undefined }),
      ...(data.instanceName !== undefined && { instanceName: data.instanceName }),
      ...(data.instanceUrl !== undefined && { instanceUrl: data.instanceUrl }),
      ...(data.sunatBetaWsdlUrl !== undefined && { sunatBetaWsdlUrl: data.sunatBetaWsdlUrl }),
      ...(data.sunatProdWsdlUrl !== undefined && { sunatProdWsdlUrl: data.sunatProdWsdlUrl }),
      ...(data.sunatBetaRestUrl !== undefined && { sunatBetaRestUrl: data.sunatBetaRestUrl }),
      ...(data.sunatProdRestUrl !== undefined && { sunatProdRestUrl: data.sunatProdRestUrl }),
    };

    const updated = await instanceSettingsService.updateSettings(updateData);

    return updated;
  }, {
    body: t.Object({
      mode: t.Optional(t.String()),
      isOseHomologated: t.Optional(t.Boolean()),
      oseResolutionNumber: t.Optional(t.String()),
      oseHomologationDate: t.Optional(t.String()),
      instanceName: t.Optional(t.String()),
      instanceUrl: t.Optional(t.String()),
      sunatBetaWsdlUrl: t.Optional(t.String()),
      sunatProdWsdlUrl: t.Optional(t.String()),
      sunatBetaRestUrl: t.Optional(t.String()),
      sunatProdRestUrl: t.Optional(t.String()),
    }),
  });
