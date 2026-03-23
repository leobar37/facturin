import { Elysia } from 'elysia';
import { t } from 'elysia';
import { seriesService } from '../../services';
import type { RequestContext } from '../../middleware/auth';
import { NotFoundError, UnauthorizedError } from '../../errors';

export const v1SeriesRoutes = new Elysia({ prefix: '/api/v1' })
  // List series for the authenticated tenant
  .get('/series', async ({ store }) => {
    const ctx = store as RequestContext;
    const tenantId = ctx?.tenantId;

    if (!tenantId) {
      throw new UnauthorizedError('X-Tenant-ID header required', 'TENANT_REQUIRED');
    }

    const tenantSeries = await seriesService.findAllByTenant(tenantId);

    return tenantSeries;
  })
  // Create new series for tenant
  .post('/series', async ({ body, store }) => {
    const ctx = store as RequestContext;
    const tenantId = ctx?.tenantId;

    if (!tenantId) {
      throw new UnauthorizedError('X-Tenant-ID header required', 'TENANT_REQUIRED');
    }

    const { tipoComprobante, serie, correlativoActual } = body as {
      tipoComprobante: string;
      serie: string;
      correlativoActual?: number;
    };

    const newSerie = await seriesService.create({
      tenantId,
      tipoComprobante,
      serie,
      correlativoActual,
    });

    return newSerie;
  }, {
    body: t.Object({
      tipoComprobante: t.String({ pattern: '^(01|03|07|08|09|20|40)$' }),
      serie: t.String({ pattern: '^[A-Z0-9]{4}$' }),
      correlativoActual: t.Optional(t.Number({ minimum: 0 })),
    }),
  })
  // Get specific series
  .get('/series/:id', async ({ params, store }) => {
    const ctx = store as RequestContext;
    const tenantId = ctx?.tenantId;

    if (!tenantId) {
      throw new UnauthorizedError('X-Tenant-ID header required', 'TENANT_REQUIRED');
    }

    const { id } = params;

    const serie = await seriesService.findByTenantAndId(tenantId, id);

    if (!serie) {
      throw new NotFoundError('Series not found', 'NOT_FOUND');
    }

    return serie;
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
  })
  // Update series
  .put('/series/:id', async ({ params, body, store }) => {
    const ctx = store as RequestContext;
    const tenantId = ctx?.tenantId;

    if (!tenantId) {
      throw new UnauthorizedError('X-Tenant-ID header required', 'TENANT_REQUIRED');
    }

    const { id } = params;
    const { correlativoActual, isActive } = body as {
      correlativoActual?: number;
      isActive?: boolean;
    };

    const updated = await seriesService.update(tenantId, id, {
      correlativoActual,
      isActive,
    });

    if (!updated) {
      throw new NotFoundError('Series not found', 'NOT_FOUND');
    }

    return updated;
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    body: t.Object({
      correlativoActual: t.Optional(t.Number({ minimum: 0 })),
      isActive: t.Optional(t.Boolean()),
    }),
  })
  // Delete (deactivate) series
  .delete('/series/:id', async ({ params, store }) => {
    const ctx = store as RequestContext;
    const tenantId = ctx?.tenantId;

    if (!tenantId) {
      throw new UnauthorizedError('X-Tenant-ID header required', 'TENANT_REQUIRED');
    }

    const { id } = params;

    const result = await seriesService.deactivate(tenantId, id);

    if (!result) {
      throw new NotFoundError('Series not found', 'NOT_FOUND');
    }

    return result;
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
  });
