import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FacturinClient } from '../client.js';
import { ValidationError } from '../errors.js';
import type { CreateSerieInput } from '../types.js';

// Test configuration constants
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3100',
  apiKey: 'test_key_for_unit_tests',
  tenantId: 'test_tenant_id',
} as const;

describe('SeriesAPI', () => {
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

  describe('list() - VAL-SDK-009', () => {
    it('should return array of series for the tenant', async () => {
      const mockSeries = [
        {
          id: 'series-1',
          tenantId: TEST_CONFIG.tenantId,
          tipoComprobante: '01',
          serie: 'F001',
          correlativoActual: 100,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'series-2',
          tenantId: TEST_CONFIG.tenantId,
          tipoComprobante: '03',
          serie: 'B001',
          correlativoActual: 50,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockSeries,
      });

      const result = await client.series.list();

      expect(result.series).toHaveLength(2);
      expect(result.series[0].id).toBe('series-1');
      expect(result.series[0].tipoComprobante).toBe('01');
      expect(result.series[0].serie).toBe('F001');
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should filter series by active status', async () => {
      const mockSeries = [
        {
          id: 'series-1',
          tenantId: TEST_CONFIG.tenantId,
          tipoComprobante: '01',
          serie: 'F001',
          correlativoActual: 100,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'series-2',
          tenantId: TEST_CONFIG.tenantId,
          tipoComprobante: '01',
          serie: 'F002',
          correlativoActual: 0,
          isActive: false,
          createdAt: new Date().toISOString(),
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockSeries,
      });

      const result = await client.series.list({ isActive: true });

      expect(result.series).toHaveLength(1);
      expect(result.series[0].isActive).toBe(true);
    });

    it('should filter series by tipoComprobante', async () => {
      const mockSeries = [
        {
          id: 'series-1',
          tenantId: TEST_CONFIG.tenantId,
          tipoComprobante: '01',
          serie: 'F001',
          correlativoActual: 100,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'series-2',
          tenantId: TEST_CONFIG.tenantId,
          tipoComprobante: '03',
          serie: 'B001',
          correlativoActual: 50,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockSeries,
      });

      const result = await client.series.list({ tipoComprobante: '01' });

      expect(result.series).toHaveLength(1);
      expect(result.series[0].tipoComprobante).toBe('01');
    });
  });

  describe('get()', () => {
    it('should return series by ID', async () => {
      const mockSerie = {
        id: 'series-123',
        tenantId: TEST_CONFIG.tenantId,
        tipoComprobante: '01',
        serie: 'F001',
        correlativoActual: 100,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockSerie,
      });

      const result = await client.series.get('series-123');

      expect(result.id).toBe('series-123');
      expect(result.tipoComprobante).toBe('01');
      expect(result.serie).toBe('F001');
    });
  });

  describe('create() - VAL-SDK-010, VAL-SDK-011', () => {
    it('should create series with valid data', async () => {
      const createInput = {
        tipoComprobante: '01' as const,
        serie: 'F001',
      };

      const mockCreatedSerie = {
        id: 'new-series-id',
        tenantId: TEST_CONFIG.tenantId,
        tipoComprobante: '01',
        serie: 'F001',
        correlativoActual: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockCreatedSerie,
      });

      const result = await client.series.create(createInput);

      expect(result.id).toBe('new-series-id');
      expect(result.tipoComprobante).toBe('01');
      expect(result.serie).toBe('F001');
    });

    it('should reject invalid tipoComprobante', async () => {
      const createInput = {
        tipoComprobante: '99' as CreateSerieInput['tipoComprobante'], // Invalid - not in allowed list
        serie: 'F001',
      };

      await expect(client.series.create(createInput)).rejects.toThrow(
        ValidationError
      );
      await expect(client.series.create(createInput)).rejects.toThrow(
        'Invalid tipoComprobante'
      );
    });

    it('should reject empty tipoComprobante', async () => {
      const createInput = {
        tipoComprobante: '' as CreateSerieInput['tipoComprobante'],
        serie: 'F001',
      };

      await expect(client.series.create(createInput)).rejects.toThrow(
        ValidationError
      );
    });

    it('should reject serie with wrong format (not 4 chars)', async () => {
      const createInput = {
        tipoComprobante: '01' as const,
        serie: 'F1', // Invalid - must be 4 chars
      };

      await expect(client.series.create(createInput)).rejects.toThrow(
        ValidationError
      );
      await expect(client.series.create(createInput)).rejects.toThrow(
        'Serie must be 4 uppercase alphanumeric characters'
      );
    });

    it('should reject serie with lowercase letters', async () => {
      const createInput = {
        tipoComprobante: '01' as const,
        serie: 'f001', // Invalid - must be uppercase
      };

      await expect(client.series.create(createInput)).rejects.toThrow(
        ValidationError
      );
      await expect(client.series.create(createInput)).rejects.toThrow(
        'Serie must be 4 uppercase alphanumeric characters'
      );
    });

    it('should reject serie with special characters', async () => {
      const createInput = {
        tipoComprobante: '01' as const,
        serie: 'F00!', // Invalid - special char
      };

      await expect(client.series.create(createInput)).rejects.toThrow(
        ValidationError
      );
    });

    it('should accept all valid tipoComprobante values', async () => {
      const validTipos = ['01', '03', '07', '08', '09', '20', '40'];

      for (const tipo of validTipos) {
        const createInput = {
          tipoComprobante: tipo as '01' | '03' | '07' | '08' | '09' | '20' | '40',
          serie: 'T001',
        };

        const mockCreatedSerie = {
          id: `series-${tipo}`,
          tenantId: TEST_CONFIG.tenantId,
          tipoComprobante: tipo,
          serie: 'T001',
          correlativoActual: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockResolvedValue({
          ok: true,
          status: 201,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => mockCreatedSerie,
        });

        const result = await client.series.create(createInput);
        expect(result.tipoComprobante).toBe(tipo);
      }
    });

    it('should include validation errors with field information', async () => {
      const createInput = {
        tipoComprobante: '99' as CreateSerieInput['tipoComprobante'],
        serie: 'F001',
      };

      let thrownError: ValidationError | undefined;
      try {
        await client.series.create(createInput);
      } catch (error) {
        if (error instanceof ValidationError) {
          thrownError = error;
        }
      }

      expect(thrownError).toBeInstanceOf(ValidationError);
      expect(thrownError?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'tipoComprobante',
          }),
        ])
      );
    });
  });

  describe('update()', () => {
    it('should update series correlativo', async () => {
      const updateData = {
        correlativoActual: 150,
      };

      const mockUpdatedSerie = {
        id: 'series-123',
        tenantId: TEST_CONFIG.tenantId,
        tipoComprobante: '01',
        serie: 'F001',
        correlativoActual: 150,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockUpdatedSerie,
      });

      const result = await client.series.update('series-123', updateData);

      expect(result.correlativoActual).toBe(150);
    });

    it('should deactivate series', async () => {
      const updateData = {
        isActive: false,
      };

      const mockUpdatedSerie = {
        id: 'series-123',
        tenantId: TEST_CONFIG.tenantId,
        tipoComprobante: '01',
        serie: 'F001',
        correlativoActual: 100,
        isActive: false,
        createdAt: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockUpdatedSerie,
      });

      const result = await client.series.update('series-123', updateData);

      expect(result.isActive).toBe(false);
    });
  });

  describe('deactivate()', () => {
    it('should deactivate series', async () => {
      const mockResponse = {
        id: 'series-123',
        isActive: false,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse,
      });

      const result = await client.series.deactivate('series-123');

      expect(result.id).toBe('series-123');
      expect(result.isActive).toBe(false);
    });
  });
});
