import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AdminClient } from '../admin-client.js';

const TEST_CONFIG = {
  baseUrl: 'http://localhost:3102',
} as const;

describe('AdminClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with valid config', () => {
      const client = new AdminClient({ baseUrl: TEST_CONFIG.baseUrl });
      expect(client.getBaseUrl()).toBe(TEST_CONFIG.baseUrl);
      expect(client.isAuthenticated()).toBe(false);
    });

    it('should remove trailing slash from baseUrl', () => {
      const client = new AdminClient({ baseUrl: `${TEST_CONFIG.baseUrl}/` });
      expect(client.getBaseUrl()).toBe(TEST_CONFIG.baseUrl);
    });

    it('should throw error if baseUrl is missing', () => {
      expect(() => {
        new AdminClient({ baseUrl: '' });
      }).toThrow('baseUrl is required');
    });
  });

  describe('login', () => {
    it('should login with valid credentials and store token', async () => {
      const mockToken = 'MOCK_TOKEN';
      const mockResponse = {
        token: mockToken,
        type: 'Bearer',
        expiresIn: '15m',
        user: {
          email: 'admin@facturin.local',
          role: 'super-admin',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse,
      });

      const client = new AdminClient({ baseUrl: TEST_CONFIG.baseUrl });
      const result = await client.login({
        email: 'admin@facturin.local',
        password: 'admin123',
      });

      expect(result.token).toBe(mockToken);
      expect(result.type).toBe('Bearer');
      expect(client.isAuthenticated()).toBe(true);
      expect(client.getToken()).toBe(mockToken);
    });

    it('should reject login with invalid credentials', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        }),
      });

      const client = new AdminClient({ baseUrl: TEST_CONFIG.baseUrl });

      await expect(
        client.login({ email: 'wrong@email.com', password: 'wrongpass' })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw ValidationError when email is missing', async () => {
      const client = new AdminClient({ baseUrl: TEST_CONFIG.baseUrl });

      await expect(
        client.login({ email: '', password: 'password' })
      ).rejects.toThrow('Email is required');
    });

    it('should throw ValidationError when password is missing', async () => {
      const client = new AdminClient({ baseUrl: TEST_CONFIG.baseUrl });

      await expect(
        client.login({ email: 'admin@test.com', password: '' })
      ).rejects.toThrow('Password is required');
    });
  });

  describe('logout', () => {
    it('should clear token on logout', async () => {
      const mockToken = 'MOCK_TOKEN';
      const mockResponse = {
        token: mockToken,
        type: 'Bearer',
        expiresIn: '15m',
        user: { email: 'admin@facturin.local', role: 'super-admin' },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse,
      });

      const client = new AdminClient({ baseUrl: TEST_CONFIG.baseUrl });
      await client.login({ email: 'admin@facturin.local', password: 'admin123' });
      expect(client.isAuthenticated()).toBe(true);

      client.logout();
      expect(client.isAuthenticated()).toBe(false);
      expect(client.getToken()).toBe(null);
    });
  });

  describe('authenticated requests', () => {
    it('should include Authorization header when authenticated', async () => {
      const mockToken = 'MOCK_TOKEN';
      const mockResponse = {
        token: mockToken,
        type: 'Bearer',
        expiresIn: '15m',
        user: { email: 'admin@facturin.local', role: 'super-admin' },
      };

      // Mock login response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse,
      });

      // Mock stats response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          tenants: { total: 5, active: 4, inactive: 1 },
          apiKeys: { total: 10, active: 8 },
          comprobantes: { total: 100, byEstado: { pendiente: 20, aceptado: 80 } },
          series: { total: 15 },
        }),
      });

      const client = new AdminClient({ baseUrl: TEST_CONFIG.baseUrl });
      await client.login({ email: 'admin@facturin.local', password: 'admin123' });

      // Clear the mock call history to focus on the stats call
      vi.clearAllMocks();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          tenants: { total: 5, active: 4, inactive: 1 },
          apiKeys: { total: 10, active: 8 },
          comprobantes: { total: 100, byEstado: { pendiente: 20, aceptado: 80 } },
          series: { total: 15 },
        }),
      });

      await client.stats.getStats();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        `${TEST_CONFIG.baseUrl}/api/admin/stats`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should not include Authorization header when not authenticated', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          tenants: { total: 5, active: 4, inactive: 1 },
          apiKeys: { total: 10, active: 8 },
          comprobantes: { total: 100, byEstado: {} },
          series: { total: 15 },
        }),
      });

      const client = new AdminClient({ baseUrl: TEST_CONFIG.baseUrl });
      await client.stats.getStats();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      );
    });
  });

  describe('error handling', () => {
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

      const client = new AdminClient({ baseUrl: TEST_CONFIG.baseUrl });

      await expect(client.stats.getStats()).rejects.toThrow('Authentication failed');
    });

    it('should throw NotFoundError on 404', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          error: 'Tenant not found',
          code: 'NOT_FOUND',
        }),
      });

      const client = new AdminClient({ baseUrl: TEST_CONFIG.baseUrl });

      await expect(client.tenants.get('non-existent-id')).rejects.toThrow('Tenant not found');
    });

    it('should throw ValidationError on 422 with field details', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: [
            { field: 'ruc', message: 'RUC must be 11 digits' },
          ],
        }),
      });

      const client = new AdminClient({ baseUrl: TEST_CONFIG.baseUrl });

      await expect(client.tenants.create({ ruc: '123', razonSocial: 'Test' })).rejects.toMatchObject({
        name: 'ValidationError',
        errors: [{ field: 'ruc', message: 'RUC must be 11 digits' }],
      });
    });

    it('should throw NetworkError on fetch failure', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const client = new AdminClient({ baseUrl: TEST_CONFIG.baseUrl });

      await expect(client.stats.getStats()).rejects.toThrow('Network error');
    });
  });

  describe('VAL-SDK-001: Admin authentication and tenant management', () => {
    it('should support admin tenant-management calls', async () => {
      const mockToken = 'MOCK_TOKEN';
      const loginResponse = {
        token: mockToken,
        type: 'Bearer',
        expiresIn: '15m',
        user: { email: 'admin@facturin.local', role: 'super-admin' },
      };

      const tenantsResponse = {
        data: [
          {
            id: 'tenant-1',
            ruc: '20100178959',
            razonSocial: 'Test Business 1',
            isActive: true,
          },
        ],
        pagination: { total: 1, limit: 50, offset: 0 },
      };

      // Login call
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => loginResponse,
      });

      // List tenants call
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => tenantsResponse,
      });

      const client = new AdminClient({ baseUrl: TEST_CONFIG.baseUrl });

      // Login
      await client.login({ email: 'admin@facturin.local', password: 'admin123' });
      expect(client.isAuthenticated()).toBe(true);

      // List tenants
      const result = await client.tenants.list();
      expect(result.tenants).toHaveLength(1);
      expect(result.tenants[0].ruc).toBe('20100178959');
      expect(result.total).toBe(1);
    });
  });

  describe('VAL-SDK-004: Typed actionable errors', () => {
    it('should surface AuthenticationError with proper type', async () => {
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

      const client = new AdminClient({ baseUrl: TEST_CONFIG.baseUrl });

      await expect(client.stats.getStats()).rejects.toMatchObject({
        name: 'AuthenticationError',
        code: 'AUTHENTICATION_ERROR',
        statusCode: 401,
      });
    });

    it('should surface ForbiddenError with proper type', async () => {
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

      const client = new AdminClient({ baseUrl: TEST_CONFIG.baseUrl });

      await expect(client.stats.getStats()).rejects.toMatchObject({
        name: 'ForbiddenError',
        code: 'FORBIDDEN',
        statusCode: 403,
      });
    });

    it('should surface NotFoundError with proper type', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({
          error: 'Tenant not found',
          code: 'NOT_FOUND',
        }),
      });

      const client = new AdminClient({ baseUrl: TEST_CONFIG.baseUrl });

      await expect(client.tenants.get('non-existent-id')).rejects.toMatchObject({
        name: 'NotFoundError',
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });
  });
});
