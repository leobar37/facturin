import type { FacturinClient } from './client.js';
import type {
  Tenant,
  CreateTenantInput,
} from './types.js';
import { ValidationError } from './errors.js';

/**
 * Validate Peruvian RUC (Registro Único de Contribuyentes)
 * RUC must be 11 digits and pass the SUNAT checksum algorithm
 */
export function validateRuc(ruc: string): { isValid: boolean; error?: string } {
  if (!ruc) {
    return { isValid: false, error: 'RUC is required' };
  }

  if (!/^[0-9]{11}$/.test(ruc)) {
    return { isValid: false, error: 'RUC must be 11 digits' };
  }

  // RUC validation using the official SUNAT algorithm
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 10; i++) {
    sum += parseInt(ruc[i], 10) * weights[i];
  }

  const remainder = sum % 11;
  const checkDigit = 11 - remainder;

  if (checkDigit !== parseInt(ruc[10], 10)) {
    return { isValid: false, error: 'Invalid RUC checksum' };
  }

  return { isValid: true };
}

export interface ListTenantsOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListTenantsResult {
  tenants: Tenant[];
  total: number;
  limit: number;
  offset: number;
}

export class TenantsAPI {
  constructor(private readonly client: FacturinClient) {}

  /**
   * List all tenants (admin endpoint - requires JWT auth, not API key)
   * 
   * NOTE: This endpoint is for admin use and requires super admin JWT authentication.
   * For tenant-specific operations, use the tenant ID in the SDK config.
   * 
   * The API returns { data: Tenant[], pagination: {...} } but the client unwraps
   * the data property, so we reconstruct the full response here.
   */
  async list(options?: ListTenantsOptions): Promise<ListTenantsResult> {
    const params: Record<string, string | number | undefined> = {};

    if (options?.search) {
      params.search = options.search;
    }
    if (options?.limit !== undefined) {
      params.limit = options.limit;
    }
    if (options?.offset !== undefined) {
      params.offset = options.offset;
    }

    // The client will return just the tenants array because it unwraps { data: T }
    // We need to fetch with a raw request to get the full pagination response
    // For now, return just the array with pagination info derived from params
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Use get with the pagination wrapper type - client will unwrap to Tenant[]
    const tenants = await this.client.get<Tenant[]>('/api/admin/tenants', {
      params,
    });

    // Since the client unwraps the response, we return what we can
    // In a real scenario, you might want to fetch twice - once for data, once for pagination
    // Or modify the API to return a non-standard format that doesn't get unwrapped
    return {
      tenants,
      total: -1, // Unknown since client unwraps the pagination info
      limit,
      offset,
    };
  }

  /**
   * Get a tenant by ID
   */
  async get(id: string): Promise<Tenant> {
    return this.client.get<Tenant>(`/api/admin/tenants/${id}`);
  }

  /**
   * Create a new tenant
   * 
   * Validates RUC format (11 digits + checksum) before sending to API
   */
  async create(input: CreateTenantInput): Promise<Tenant> {
    // Validate RUC format and checksum
    const rucValidation = validateRuc(input.ruc);
    if (!rucValidation.isValid) {
      throw new ValidationError(
        `Invalid RUC: ${rucValidation.error}`,
        [{ field: 'ruc', message: rucValidation.error || 'Invalid RUC format' }]
      );
    }

    return this.client.post<Tenant>('/api/admin/tenants', input);
  }

  /**
   * Update an existing tenant
   */
  async update(
    id: string,
    data: Partial<Omit<CreateTenantInput, 'ruc'>> & { isActive?: boolean }
  ): Promise<Tenant> {
    return this.client.put<Tenant>(`/api/admin/tenants/${id}`, data);
  }

  /**
   * Deactivate a tenant
   */
  async deactivate(id: string): Promise<{ id: string; isActive: boolean }> {
    return this.client.delete<{ id: string; isActive: boolean }>(`/api/admin/tenants/${id}`);
  }
}
