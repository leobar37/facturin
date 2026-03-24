import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FacturinClient } from '../client.js';
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  TenantNotReadyError,
  NetworkError,
} from '../errors.js';

// Test configuration constants - these are placeholder values for testing only
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3100',
  apiKey: 'test_key_for_unit_tests',
  tenantId: 'test_tenant_id',
} as const;

describe('FacturinClient', () => {
  // Store original fetch
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Mock global fetch with vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = vi.fn();
  });

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with valid config', () => {
      const client = new FacturinClient({
        baseUrl: TEST_CONFIG.baseUrl,
        apiKey: TEST_CONFIG.apiKey,
        tenantId: TEST_CONFIG.tenantId,
      });

      expect(client.getBaseUrl()).toBe(TEST_CONFIG.baseUrl);
      expect(client.getTenantId()).toBe(TEST_CONFIG.tenantId);
    });

    it('should remove trailing slash from baseUrl', () => {
      const client = new FacturinClient({
        baseUrl: `${TEST_CONFIG.baseUrl}/`,
        apiKey: TEST_CONFIG.apiKey,
        tenantId: TEST_CONFIG.tenantId,
      });

      expect(client.getBaseUrl()).toBe(TEST_CONFIG.baseUrl);
    });

    it('should throw error if baseUrl is missing', () => {
      expect(() => {
        new FacturinClient({
          baseUrl: '',
          apiKey: TEST_CONFIG.apiKey,
          tenantId: TEST_CONFIG.tenantId,
        });
      }).toThrow('baseUrl is required');
    });

    it('should throw error if apiKey is missing', () => {
      expect(() => {
        new FacturinClient({
          baseUrl: TEST_CONFIG.baseUrl,
          apiKey: '',
          tenantId: TEST_CONFIG.tenantId,
        });
      }).toThrow('apiKey is required');
    });

    it('should throw error if tenantId is missing', () => {
      expect(() => {
        new FacturinClient({
          baseUrl: TEST_CONFIG.baseUrl,
          apiKey: TEST_CONFIG.apiKey,
          tenantId: '',
        });
      }).toThrow('tenantId is required');
    });
  });

  describe('HTTP methods', () => {
    let client: FacturinClient;

    beforeEach(() => {
      client = new FacturinClient({
        baseUrl: TEST_CONFIG.baseUrl,
        apiKey: TEST_CONFIG.apiKey,
        tenantId: TEST_CONFIG.tenantId,
      });
    });

    describe('get', () => {
      it('should make GET request with correct headers', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ data: { id: '1' } }),
        });

        await client.get<{ id: string }>('/api/v1/test');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((globalThis as any).fetch).toHaveBeenCalledWith(
          `${TEST_CONFIG.baseUrl}/api/v1/test`,
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Authorization': `Bearer ${TEST_CONFIG.apiKey}`,
              'X-Tenant-ID': TEST_CONFIG.tenantId,
              'Content-Type': 'application/json',
            }),
          })
        );
      });

      it('should include query parameters', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ data: [] }),
        });

        await client.get<{ id: string }[]>('/api/v1/test', {
          params: { limit: 10, page: 1 },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((globalThis as any).fetch).toHaveBeenCalledWith(
          `${TEST_CONFIG.baseUrl}/api/v1/test?limit=10&page=1`,
          expect.any(Object)
        );
      });
    });

    describe('post', () => {
      it('should make POST request with body', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ data: { id: '1', created: true } }),
        });

        await client.post<{ id: string; created: boolean }>('/api/v1/test', {
          name: 'test',
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((globalThis as any).fetch).toHaveBeenCalledWith(
          `${TEST_CONFIG.baseUrl}/api/v1/test`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ name: 'test' }),
          })
        );
      });
    });

    describe('put', () => {
      it('should make PUT request with body', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ data: { id: '1', updated: true } }),
        });

        await client.put<{ id: string; updated: boolean }>('/api/v1/test/1', {
          name: 'updated',
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((globalThis as any).fetch).toHaveBeenCalledWith(
          `${TEST_CONFIG.baseUrl}/api/v1/test/1`,
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ name: 'updated' }),
          })
        );
      });
    });

    describe('delete', () => {
      it('should make DELETE request', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ data: { deleted: true } }),
        });

        await client.delete<{ deleted: boolean }>('/api/v1/test/1');

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((globalThis as any).fetch).toHaveBeenCalledWith(
          `${TEST_CONFIG.baseUrl}/api/v1/test/1`,
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });
  });

  describe('error handling', () => {
    let client: FacturinClient;

    beforeEach(() => {
      client = new FacturinClient({
        baseUrl: TEST_CONFIG.baseUrl,
        apiKey: TEST_CONFIG.apiKey,
        tenantId: TEST_CONFIG.tenantId,
      });
    });

    describe('401 Unauthorized', () => {
      it('should throw AuthenticationError on 401', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            error: 'Authentication failed',
            code: 'AUTHENTICATION_ERROR',
          }),
        });

        await expect(client.get('/api/v1/test')).rejects.toThrow(AuthenticationError);
      });

      it('should include error message from response', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN',
          }),
        });

        await expect(client.get('/api/v1/test')).rejects.toThrow('Invalid or expired token');
      });
    });

    describe('403 Forbidden', () => {
      it('should throw ForbiddenError on 403', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            error: 'Access forbidden',
            code: 'FORBIDDEN',
          }),
        });

        await expect(client.get('/api/v1/test')).rejects.toThrow(ForbiddenError);
      });

      it('should throw TenantNotReadyError when code is TENANT_NOT_READY', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            error: 'Tenant not ready for invoicing',
            code: 'TENANT_NOT_READY',
          }),
        });

        await expect(client.get('/api/v1/test')).rejects.toThrow(TenantNotReadyError);
      });
    });

    describe('404 Not Found', () => {
      it('should throw NotFoundError on 404', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            error: 'Resource not found',
            code: 'NOT_FOUND',
          }),
        });

        await expect(client.get('/api/v1/test')).rejects.toThrow(NotFoundError);
      });
    });

    describe('422 Validation Error', () => {
      it('should throw ValidationError on 422', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockResolvedValueOnce({
          ok: false,
          status: 422,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: [
              { field: 'ruc', message: 'Invalid RUC format' },
              { field: 'razonSocial', message: 'Required field' },
            ],
          }),
        });

        await expect(client.get('/api/v1/test')).rejects.toThrow(ValidationError);
      });

      it('should include validation details', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockResolvedValueOnce({
          ok: false,
          status: 422,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: [
              { field: 'ruc', message: 'Invalid RUC format' },
            ],
          }),
        });

        let thrownError: unknown;
        try {
          await client.get('/api/v1/test');
        } catch (error) {
          thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(ValidationError);
        expect((thrownError as ValidationError).errors).toEqual([
          { field: 'ruc', message: 'Invalid RUC format' },
        ]);
      });
    });

    describe('Network Error', () => {
      it('should throw NetworkError on fetch failure', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

        await expect(client.get('/api/v1/test')).rejects.toThrow(NetworkError);
      });
    });

    describe('204 No Content', () => {
      it('should return undefined on 204', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockResolvedValueOnce({
          ok: true,
          status: 204,
          headers: new Map([['content-type', 'application/json']]),
        });

        const result = await client.delete('/api/v1/test/1');
        expect(result).toBeUndefined();
      });
    });

    describe('response with data wrapper', () => {
      it('should unwrap data from response', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => ({ data: { id: '123' }, success: true }),
        });

        const result = await client.get<{ id: string }>('/api/v1/test');
        expect(result).toEqual({ id: '123' });
      });
    });
  });

  describe('headers verification (VAL-SDK-001, VAL-SDK-002)', () => {
    it('should include Authorization and X-Tenant-ID headers', async () => {
      const customConfig = {
        baseUrl: 'http://localhost:3100',
        apiKey: 'another_test_key',
        tenantId: 'tenant-uuid-456',
      };

      const client = new FacturinClient(customConfig);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ data: {} }),
      });

      await client.get('/api/v1/test');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${customConfig.apiKey}`,
            'X-Tenant-ID': customConfig.tenantId,
          }),
        })
      );
    });
  });
});
