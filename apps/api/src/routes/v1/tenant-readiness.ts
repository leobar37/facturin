import { Elysia } from 'elysia';
import { tenantReadinessService } from '../../services/tenant-readiness.service';
import type { RequestContext } from '../../middleware/auth';
import { UnauthorizedError } from '../../errors';

export const v1TenantReadinessRoutes = new Elysia({ prefix: '/api/v1/tenant' })
  // GET /api/v1/tenant/readiness
  // Check if the tenant is ready for invoicing
  .get('/readiness', async ({ store }) => {
    const ctx = store as RequestContext;
    const tenantId = ctx?.tenantId;

    if (!tenantId) {
      throw new UnauthorizedError('X-Tenant-ID header required', 'TENANT_REQUIRED');
    }

    const readiness = await tenantReadinessService.checkReadiness(tenantId);

    return readiness;
  });
