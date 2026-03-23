import type { Elysia } from 'elysia';
import { apiKeysService } from '../services/api-keys.service';
import { tenantsService } from '../services/tenants.service';
import { UnauthorizedError, ValidationError } from '../errors';

export interface RequestContext {
  apiKeyId?: string;
  tenantId?: string;
  permissions?: string[];
  authType?: 'jwt' | 'api-key';
}

export const authMiddleware = (app: Elysia) =>
  app.onBeforeHandle(async ({ headers, path, store }) => {
    // Skip auth for public routes and admin routes (admin routes use their own middleware)
    const publicPaths = ['/api/health', '/api/auth/login', '/swagger', '/api/inngest'];
    const adminPaths = ['/api/admin/'];
    if (publicPaths.some((p) => path.startsWith(p)) || adminPaths.some((p) => path.startsWith(p))) {
      return;
    }

    const authHeader = headers.authorization;
    const tenantIdHeader = headers['x-tenant-id'];

    // Check for API Key authentication
    if (authHeader?.startsWith('Bearer sk_')) {
      const apiKey = authHeader.replace('Bearer ', '');

      if (!apiKeysService.isValidFormat(apiKey)) {
        throw new UnauthorizedError('Invalid API key format', 'INVALID_API_KEY');
      }

      // Look up API key
      const keyRecord = await apiKeysService.findByKey(apiKey);

      if (!keyRecord) {
        throw new UnauthorizedError('Invalid or revoked API key', 'INVALID_API_KEY');
      }

      // Check expiration
      if (apiKeysService.isExpired(keyRecord)) {
        throw new UnauthorizedError('API key has expired', 'EXPIRED_API_KEY');
      }

      // Validate tenant if X-Tenant-ID is provided
      if (tenantIdHeader) {
        const tenant = await tenantsService.findActiveById(tenantIdHeader);

        if (!tenant) {
          throw new ValidationError('Invalid or inactive tenant', 'INVALID_TENANT');
        }

        // Set tenantId in store
        if (store) {
          (store as RequestContext).tenantId = tenantIdHeader;
        }
      }

      // Update last used timestamp (fire and forget)
      apiKeysService.updateLastUsed(keyRecord.id).catch(console.error);

      if (store) {
        (store as RequestContext).apiKeyId = keyRecord.id;
        (store as RequestContext).permissions = keyRecord.permissions;
        (store as RequestContext).authType = 'api-key';
      }

      return;
    }

    // If no auth header provided, reject
    if (!authHeader) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    // If auth header is present but not a valid API key format, reject
    throw new UnauthorizedError('Invalid authentication scheme', 'INVALID_AUTH');
  });
