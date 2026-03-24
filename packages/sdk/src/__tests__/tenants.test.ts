import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FacturinClient } from '../client.js';
import { validateRuc } from '../tenants.js';
import { ValidationError } from '../errors.js';

// Test configuration constants
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3100',
  apiKey: 'test_key_for_unit_tests',
  tenantId: 'test_tenant_id',
} as const;

describe('validateRuc', () => {
  describe('RUC validation (VAL-SDK-007)', () => {
    // Valid RUC calculated using SUNAT algorithm
    // Weights: [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
    // For RUC 20100178959:
    // sum = 2*5 + 0*4 + 1*3 + 0*2 + 0*7 + 1*6 + 7*5 + 8*4 + 9*3 + 5*2 = 10+0+3+0+0+6+35+32+27+10 = 123
    // remainder = 123 % 11 = 2
    // checkDigit = 11 - 2 = 9
    // Last digit = 9 ✓
    it('should accept valid RUC', () => {
      expect(validateRuc('20100178959').isValid).toBe(true);
    });

    it('should reject empty RUC', () => {
      const result = validateRuc('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('RUC is required');
    });

    it('should reject RUC with less than 11 digits', () => {
      const result = validateRuc('1234567890');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('RUC must be 11 digits');
    });

    it('should reject RUC with more than 11 digits', () => {
      const result = validateRuc('123456789012');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('RUC must be 11 digits');
    });

    it('should reject RUC with non-numeric characters', () => {
      const result = validateRuc('1041081080A');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('RUC must be 11 digits');
    });

    it('should reject RUC with invalid checksum', () => {
      // Valid format but wrong checksum
      const result = validateRuc('20100178951');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid RUC checksum');
    });
  });
});

describe('TenantsAPI', () => {
  // Store original fetch
  const originalFetch = globalThis.fetch;
  let client: FacturinClient;

  beforeEach(() => {
    // Mock global fetch with vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = vi.fn();
    client = new FacturinClient({
      baseUrl: TEST_CONFIG.baseUrl,
      apiKey: TEST_CONFIG.apiKey,
      tenantId: TEST_CONFIG.tenantId,
    });
  });

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('list() - VAL-SDK-005', () => {
    it('should return array of tenants', async () => {
      const mockTenants = [
        {
          id: 'tenant-1',
          ruc: '20100178959',
          razonSocial: 'Test Business 1',
          isActive: true,
        },
        {
          id: 'tenant-2',
          ruc: '20100178960',
          razonSocial: 'Test Business 2',
          isActive: true,
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ data: mockTenants, pagination: { total: 2, limit: 50, offset: 0 } }),
      });

      const result = await client.tenants.list();

      expect(result.tenants).toHaveLength(2);
      expect(result.tenants[0].id).toBe('tenant-1');
      expect(result.tenants[0].ruc).toBe('20100178959');
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should include search params when provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ data: [], pagination: { total: 0, limit: 50, offset: 0 } }),
      });

      await client.tenants.list({ search: 'test', limit: 10, offset: 5 });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        `${TEST_CONFIG.baseUrl}/api/admin/tenants?search=test&limit=10&offset=5`,
        expect.any(Object)
      );
    });
  });

  describe('get() - VAL-SDK-008', () => {
    it('should return tenant by ID', async () => {
      const mockTenant = {
        id: 'tenant-123',
        ruc: '20100178952',
        razonSocial: 'Test Business',
        nombreComercial: 'Test',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockTenant,
      });

      const result = await client.tenants.get('tenant-123');

      expect(result.id).toBe('tenant-123');
      expect(result.ruc).toBe('20100178952');
      expect(result.razonSocial).toBe('Test Business');
    });
  });

  describe('create() - VAL-SDK-006, VAL-SDK-007', () => {
    // Using a valid RUC that passes the SUNAT algorithm
    const VALID_RUC = '20100178959';

    it('should create tenant with valid RUC', async () => {
      const createInput = {
        ruc: VALID_RUC,
        razonSocial: 'New Business',
        nombreComercial: 'New Business SA',
      };

      const mockCreatedTenant = {
        id: 'new-tenant-id',
        ...createInput,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockCreatedTenant,
      });

      const result = await client.tenants.create(createInput);

      expect(result.id).toBe('new-tenant-id');
      expect(result.ruc).toBe(VALID_RUC);
      expect(result.razonSocial).toBe('New Business');
    });

    it('should reject tenant creation with invalid RUC (not 11 digits)', async () => {
      const createInput = {
        ruc: '123', // Invalid - not 11 digits
        razonSocial: 'New Business',
      };

      await expect(client.tenants.create(createInput)).rejects.toThrow(ValidationError);
      await expect(client.tenants.create(createInput)).rejects.toThrow('RUC must be 11 digits');
    });

    it('should reject tenant creation with invalid RUC checksum', async () => {
      // Valid format but wrong checksum (last digit should be 2 not 1)
      const createInput = {
        ruc: '20100178951', // Valid format but wrong checksum
        razonSocial: 'New Business',
      };

      await expect(client.tenants.create(createInput)).rejects.toThrow(ValidationError);
      await expect(client.tenants.create(createInput)).rejects.toThrow('Invalid RUC checksum');
    });

    it('should reject tenant creation with empty RUC', async () => {
      const createInput = {
        ruc: '',
        razonSocial: 'New Business',
      };

      await expect(client.tenants.create(createInput)).rejects.toThrow(ValidationError);
      await expect(client.tenants.create(createInput)).rejects.toThrow('RUC is required');
    });

    it('should include validation errors with field information', async () => {
      const createInput = {
        ruc: '123',
        razonSocial: 'New Business',
      };

      let thrownError: ValidationError | undefined;
      try {
        await client.tenants.create(createInput);
      } catch (error) {
        if (error instanceof ValidationError) {
          thrownError = error;
        }
      }

      expect(thrownError).toBeInstanceOf(ValidationError);
      expect(thrownError?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'ruc',
            message: 'RUC must be 11 digits',
          }),
        ])
      );
    });
  });

  describe('update()', () => {
    it('should update tenant data', async () => {
      const updateData = {
        razonSocial: 'Updated Business Name',
        isActive: false,
      };

      const mockUpdatedTenant = {
        id: 'tenant-123',
        ruc: '20100178952',
        razonSocial: 'Updated Business Name',
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockUpdatedTenant,
      });

      const result = await client.tenants.update('tenant-123', updateData);

      expect(result.razonSocial).toBe('Updated Business Name');
      expect(result.isActive).toBe(false);
    });
  });

  describe('deactivate()', () => {
    it('should deactivate tenant', async () => {
      const mockResponse = {
        id: 'tenant-123',
        isActive: false,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse,
      });

      const result = await client.tenants.deactivate('tenant-123');

      expect(result.id).toBe('tenant-123');
      expect(result.isActive).toBe(false);
    });
  });
});
