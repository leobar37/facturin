// Main SDK entry point

// Export client
export { FacturinClient } from './client.js';
export type { ClientConfig, RequestOptions } from './client.js';

// Export TenantsAPI and helpers
export { TenantsAPI, validateRuc } from './tenants.js';
export type { ListTenantsOptions, ListTenantsResult } from './tenants.js';

// Export SeriesAPI
export { SeriesAPI } from './series.js';
export type { ListSeriesOptions, ListSeriesResult } from './series.js';

// Export errors
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
