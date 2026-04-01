// Main SDK entry point

// Export FacturinClient for tenant-scoped operations
export { FacturinClient } from './client.js';
export type { ClientConfig, RequestOptions } from './client.js';

// Export AdminClient for admin operations
export { AdminClient } from './admin-client.js';
export type { AdminClientConfig, AdminCredentials, AuthToken } from './admin-client.js';

// Export StatsAPI
export { StatsAPI } from './stats.js';
export type { AdminStats } from './stats.js';

// Export ApiKeysAPI
export { ApiKeysAPI } from './api-keys.js';
export type {
  ApiKey,
  CreateApiKeyInput,
  CreateApiKeyResponse,
  RevokeApiKeyResponse,
} from './api-keys.js';

// Export TenantsAPI and helpers
export { TenantsAPI, validateRuc } from './tenants.js';
export type { ListTenantsOptions, ListTenantsResult } from './tenants.js';

// Export SeriesAPI
export { SeriesAPI } from './series.js';
export type { ListSeriesOptions, ListSeriesResult } from './series.js';

// Export ComprobantesAPI
export { ComprobantesAPI } from './comprobantes.js';
export type {
  ListComprobantesOptions,
  ListComprobantesResult,
} from './comprobantes.js';

// Export errors (re-exported from admin-client for convenience)
export {
  FacturinError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  TenantNotReadyError,
  NetworkError,
} from './errors.js';

// Export types
export type {
  Tenant,
  CreateTenantInput,
  TenantAddress,
  Serie,
  CreateSerieInput,
  TipoComprobante,
  Comprobante,
  CreateComprobanteInput,
  ComprobanteDetalle,
  ComprobanteLeyenda,
  ComprobanteFormaPago,
  ComprobanteEstado,
  TenantReadiness,
  ApiErrorResponse,
  ApiValidationErrorResponse,
  ApiSuccessResponse,
  PaginatedResponse,
} from './types.js';
