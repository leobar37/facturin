import type { FacturinClient } from './client.js';
import { AdminClient } from './admin-client.js';
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

type ClientInterface = FacturinClient | AdminClient;

export class TenantsAPI {
  constructor(
    private readonly client: ClientInterface,
    private readonly isAdmin: boolean = false
  ) {}

  /**
   * List all tenants
   * 
   * When used with AdminClient, requires JWT auth and returns paginated results.
   * When used with FacturinClient (tenant mode), this is not applicable.
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

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Use AdminClient for admin operations - it returns full response with pagination
    if (this.isAdmin && this.client instanceof AdminClient) {
      const response = await this.client.get<{ data: Tenant[]; pagination: { total: number; limit: number; offset: number } }>(
        '/api/admin/tenants',
        { params }
      );
      return {
        tenants: response.data,
        total: response.pagination.total,
        limit: response.pagination.limit,
        offset: response.pagination.offset,
      };
    }

    // Fallback for tenant client (not typical for admin operations)
    const tenants = await (this.client as FacturinClient).get<Tenant[]>('/api/admin/tenants', {
      params,
    });
    return {
      tenants,
      total: -1,
      limit,
      offset,
    };
  }

  /**
   * Get a tenant by ID
   */
  async get(id: string): Promise<Tenant> {
    if (this.isAdmin && this.client instanceof AdminClient) {
      return this.client.get<Tenant>(`/api/admin/tenants/${id}`);
    }
    return (this.client as FacturinClient).get<Tenant>(`/api/admin/tenants/${id}`);
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

    if (this.isAdmin && this.client instanceof AdminClient) {
      return this.client.post<Tenant>('/api/admin/tenants', input);
    }
    return (this.client as FacturinClient).post<Tenant>('/api/admin/tenants', input);
  }

  /**
   * Update an existing tenant
   */
  async update(
    id: string,
    data: Partial<Omit<CreateTenantInput, 'ruc'>> & { isActive?: boolean }
  ): Promise<Tenant> {
    if (this.isAdmin && this.client instanceof AdminClient) {
      return this.client.put<Tenant>(`/api/admin/tenants/${id}`, data);
    }
    return (this.client as FacturinClient).put<Tenant>(`/api/admin/tenants/${id}`, data);
  }

  /**
   * Deactivate a tenant
   */
  async deactivate(id: string): Promise<{ id: string; isActive: boolean }> {
    if (this.isAdmin && this.client instanceof AdminClient) {
      return this.client.delete<{ id: string; isActive: boolean }>(`/api/admin/tenants/${id}`);
    }
    return (this.client as FacturinClient).delete<{ id: string; isActive: boolean }>(`/api/admin/tenants/${id}`);
  }
}
