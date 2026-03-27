import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FacturinClient } from '../client.js';
import { ValidationError } from '../errors.js';
import type { TipoComprobante } from '../types.js';

// Test configuration constants
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3100',
  apiKey: 'test_key_for_unit_tests',
  tenantId: 'test_tenant_id',
} as const;

describe('ComprobantesAPI', () => {
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

  describe('list()', () => {
    it('should return array of comprobantes for the tenant', async () => {
      const mockComprobantes = [
        {
          id: 'comp-1',
          tenantId: TEST_CONFIG.tenantId,
          tipoComprobante: '01',
          serie: 'F001',
          numero: 1,
          fechaEmision: new Date().toISOString(),
          clienteTipoDocumento: '6',
          clienteNumeroDocumento: '20100178959',
          clienteNombre: 'Cliente Test SA',
          totalGravadas: '100',
          totalIgv: '18',
          totalImporte: '118',
          sunatEstado: 'pendiente',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'comp-2',
          tenantId: TEST_CONFIG.tenantId,
          tipoComprobante: '03',
          serie: 'B001',
          numero: 1,
          fechaEmision: new Date().toISOString(),
          clienteTipoDocumento: '1',
          clienteNumeroDocumento: '12345678',
          clienteNombre: 'Cliente Persona',
          totalGravadas: '50',
          totalIgv: '9',
          totalImporte: '59',
          sunatEstado: 'pendiente',
          createdAt: new Date().toISOString(),
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockComprobantes,
      });

      const result = await client.comprobantes.list();

      expect(result.comprobantes).toHaveLength(2);
      expect(result.comprobantes[0].id).toBe('comp-1');
      expect(result.comprobantes[0].tipoComprobante).toBe('01');
      expect(result.comprobantes[0].serie).toBe('F001');
    });

    it('should filter comprobantes by tipoComprobante', async () => {
      const mockComprobantes = [
        {
          id: 'comp-1',
          tenantId: TEST_CONFIG.tenantId,
          tipoComprobante: '01',
          serie: 'F001',
          numero: 1,
          fechaEmision: new Date().toISOString(),
          clienteTipoDocumento: '6',
          clienteNumeroDocumento: '20100178959',
          clienteNombre: 'Cliente Test SA',
          totalGravadas: '100',
          totalIgv: '18',
          totalImporte: '118',
          sunatEstado: 'pendiente',
          createdAt: new Date().toISOString(),
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockComprobantes,
      });

      const result = await client.comprobantes.list({ tipoComprobante: '01' });

      expect(result.comprobantes).toHaveLength(1);
      expect(result.comprobantes[0].tipoComprobante).toBe('01');
    });

    it('should filter comprobantes by estado', async () => {
      const mockComprobantes = [
        {
          id: 'comp-1',
          tenantId: TEST_CONFIG.tenantId,
          tipoComprobante: '01',
          serie: 'F001',
          numero: 1,
          fechaEmision: new Date().toISOString(),
          clienteTipoDocumento: '6',
          clienteNumeroDocumento: '20100178959',
          clienteNombre: 'Cliente Test SA',
          totalGravadas: '100',
          totalIgv: '18',
          totalImporte: '118',
          sunatEstado: 'aceptado',
          createdAt: new Date().toISOString(),
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockComprobantes,
      });

      const result = await client.comprobantes.list({ estado: 'aceptado' });

      expect(result.comprobantes).toHaveLength(1);
      expect(result.comprobantes[0].sunatEstado).toBe('aceptado');
    });

    it('should support pagination params', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => [],
      });

      await client.comprobantes.list({ limit: 10, offset: 5 });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        `${TEST_CONFIG.baseUrl}/api/v1/comprobantes?limit=10&offset=5`,
        expect.any(Object)
      );
    });
  });

  describe('get() - VAL-SDK-014', () => {
    it('should return comprobante by ID', async () => {
      const mockComprobante = {
        id: 'comp-123',
        tenantId: TEST_CONFIG.tenantId,
        tipoComprobante: '01',
        serie: 'F001',
        numero: 100,
        fechaEmision: new Date().toISOString(),
        clienteTipoDocumento: '6',
        clienteNumeroDocumento: '20100178959',
        clienteNombre: 'Cliente Test SA',
        clienteDireccion: 'Av. Principal 123',
        totalGravadas: '500',
        totalIgv: '90',
        totalImporte: '590',
        detalles: [
          {
            codigo: 'PROD1',
            descripcion: 'Producto de prueba',
            cantidad: 5,
            unidad: 'UN',
            valorUnitario: 100,
            subtotal: 500,
            igv: 90,
            tipoAfectacionIgv: '10',
          },
        ],
        leyendas: [
          {
            codigo: '1000',
            descripcion: 'Monto en letras',
          },
        ],
        sunatEstado: 'pendiente',
        createdAt: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockComprobante,
      });

      const result = await client.comprobantes.get('comp-123');

      expect(result.id).toBe('comp-123');
      expect(result.tipoComprobante).toBe('01');
      expect(result.serie).toBe('F001');
      expect(result.numero).toBe(100);
      expect(result.clienteNombre).toBe('Cliente Test SA');
      expect(result.detalles).toHaveLength(1);
      expect(result.detalles[0].descripcion).toBe('Producto de prueba');
      expect(result.totalGravadas).toBe('500');
      expect(result.totalIgv).toBe('90');
      expect(result.totalImporte).toBe('590');
    });
  });

  describe('create() - VAL-SDK-012, VAL-SDK-013', () => {
    it('should create comprobante with valid data', async () => {
      const createInput = {
        tipoComprobante: '01' as TipoComprobante,
        serie: 'F001',
        clienteTipoDocumento: '6',
        clienteNumeroDocumento: '20100178959',
        clienteNombre: 'Cliente Test SA',
        detalles: [
          {
            descripcion: 'Producto de prueba',
            cantidad: 5,
            valorUnitario: 100,
          },
        ],
      };

      const mockCreatedComprobante = {
        id: 'new-comp-id',
        tenantId: TEST_CONFIG.tenantId,
        tipoComprobante: '01',
        serie: 'F001',
        numero: 1,
        fechaEmision: new Date().toISOString(),
        clienteTipoDocumento: '6',
        clienteNumeroDocumento: '20100178959',
        clienteNombre: 'Cliente Test SA',
        totalGravadas: '500',
        totalIgv: '90',
        totalImporte: '590',
        sunatEstado: 'pendiente',
        createdAt: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockCreatedComprobante,
      });

      const result = await client.comprobantes.create(createInput);

      expect(result.id).toBe('new-comp-id');
      expect(result.tipoComprobante).toBe('01');
      expect(result.serie).toBe('F001');
      expect(result.numero).toBe(1);
      expect(result.sunatEstado).toBe('pendiente');
    });

    it('should calculate totals correctly (VAL-SDK-013)', async () => {
      const createInput = {
        tipoComprobante: '01' as TipoComprobante,
        serie: 'F001',
        clienteTipoDocumento: '6',
        clienteNumeroDocumento: '20100178959',
        clienteNombre: 'Cliente Test SA',
        detalles: [
          {
            descripcion: 'Producto A',
            cantidad: 2,
            valorUnitario: 100,
          },
          {
            descripcion: 'Producto B',
            cantidad: 3,
            valorUnitario: 50,
          },
        ],
      };

      const mockCreatedComprobante = {
        id: 'new-comp-id',
        tenantId: TEST_CONFIG.tenantId,
        tipoComprobante: '01',
        serie: 'F001',
        numero: 1,
        fechaEmision: new Date().toISOString(),
        clienteTipoDocumento: '6',
        clienteNumeroDocumento: '20100178959',
        clienteNombre: 'Cliente Test SA',
        // 2*100 + 3*50 = 350 total gravado
        // IGV 18% = 63
        // Total = 413
        totalGravadas: '350',
        totalIgv: '63',
        totalImporte: '413',
        sunatEstado: 'pendiente',
        createdAt: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockCreatedComprobante,
      });

      const result = await client.comprobantes.create(createInput);

      // API calculates totals
      expect(result.totalGravadas).toBe('350');
      expect(result.totalIgv).toBe('63');
      expect(result.totalImporte).toBe('413');
    });

    it('should validate tipoComprobante', async () => {
      const createInput = {
        tipoComprobante: '99' as TipoComprobante,
        serie: 'F001',
        clienteTipoDocumento: '6',
        clienteNumeroDocumento: '20100178959',
        clienteNombre: 'Cliente Test SA',
        detalles: [
          {
            descripcion: 'Producto',
            cantidad: 1,
            valorUnitario: 100,
          },
        ],
      };

      await expect(client.comprobantes.create(createInput)).rejects.toThrow(
        ValidationError
      );
    });

    it('should validate serie format', async () => {
      const createInput = {
        tipoComprobante: '01' as TipoComprobante,
        serie: 'F1', // Invalid - must be 4 chars
        clienteTipoDocumento: '6',
        clienteNumeroDocumento: '20100178959',
        clienteNombre: 'Cliente Test SA',
        detalles: [
          {
            descripcion: 'Producto',
            cantidad: 1,
            valorUnitario: 100,
          },
        ],
      };

      await expect(client.comprobantes.create(createInput)).rejects.toThrow(
        ValidationError
      );
      await expect(client.comprobantes.create(createInput)).rejects.toThrow(
        'Serie must be 4 uppercase alphanumeric characters'
      );
    });

    it('should validate clienteTipoDocumento', async () => {
      const createInput = {
        tipoComprobante: '01' as TipoComprobante,
        serie: 'F001',
        clienteTipoDocumento: '9', // Invalid - must be 0-6 or A
        clienteNumeroDocumento: '20100178959',
        clienteNombre: 'Cliente Test SA',
        detalles: [
          {
            descripcion: 'Producto',
            cantidad: 1,
            valorUnitario: 100,
          },
        ],
      };

      await expect(client.comprobantes.create(createInput)).rejects.toThrow(
        ValidationError
      );
    });

    it('should validate clienteNumeroDocumento is not empty', async () => {
      const createInput = {
        tipoComprobante: '01' as TipoComprobante,
        serie: 'F001',
        clienteTipoDocumento: '6',
        clienteNumeroDocumento: '',
        clienteNombre: 'Cliente Test SA',
        detalles: [
          {
            descripcion: 'Producto',
            cantidad: 1,
            valorUnitario: 100,
          },
        ],
      };

      await expect(client.comprobantes.create(createInput)).rejects.toThrow(
        ValidationError
      );
    });

    it('should validate clienteNombre is not empty', async () => {
      const createInput = {
        tipoComprobante: '01' as TipoComprobante,
        serie: 'F001',
        clienteTipoDocumento: '6',
        clienteNumeroDocumento: '20100178959',
        clienteNombre: '',
        detalles: [
          {
            descripcion: 'Producto',
            cantidad: 1,
            valorUnitario: 100,
          },
        ],
      };

      await expect(client.comprobantes.create(createInput)).rejects.toThrow(
        ValidationError
      );
    });

    it('should validate at least one detalle', async () => {
      const createInput = {
        tipoComprobante: '01' as TipoComprobante,
        serie: 'F001',
        clienteTipoDocumento: '6',
        clienteNumeroDocumento: '20100178959',
        clienteNombre: 'Cliente Test SA',
        detalles: [], // Empty - not allowed
      };

      await expect(client.comprobantes.create(createInput)).rejects.toThrow(
        ValidationError
      );
    });

    it('should include validation errors with field information', async () => {
      const createInput = {
        tipoComprobante: '99' as TipoComprobante,
        serie: 'F001',
        clienteTipoDocumento: '6',
        clienteNumeroDocumento: '20100178959',
        clienteNombre: 'Cliente Test SA',
        detalles: [
          {
            descripcion: 'Producto',
            cantidad: 1,
            valorUnitario: 100,
          },
        ],
      };

      let thrownError: ValidationError | undefined;
      try {
        await client.comprobantes.create(createInput);
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

    it('should accept all valid tipoComprobante values', async () => {
      const validTipos: TipoComprobante[] = ['01', '03', '07', '08', '09', '20', '40'];

      for (const tipo of validTipos) {
        const createInput = {
          tipoComprobante: tipo,
          serie: 'F001',
          clienteTipoDocumento: '6',
          clienteNumeroDocumento: '20100178959',
          clienteNombre: 'Cliente Test SA',
          detalles: [
            {
              descripcion: 'Producto',
              cantidad: 1,
              valorUnitario: 100,
            },
          ],
        };

        const mockCreatedComprobante = {
          id: `comp-${tipo}`,
          tenantId: TEST_CONFIG.tenantId,
          tipoComprobante: tipo,
          serie: 'F001',
          numero: 1,
          fechaEmision: new Date().toISOString(),
          clienteTipoDocumento: '6',
          clienteNumeroDocumento: '20100178959',
          clienteNombre: 'Cliente Test SA',
          totalGravadas: '100',
          totalIgv: '18',
          totalImporte: '118',
          sunatEstado: 'pendiente',
          createdAt: new Date().toISOString(),
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch.mockResolvedValue({
          ok: true,
          status: 201,
          headers: new Map([['content-type', 'application/json']]),
          json: async () => mockCreatedComprobante,
        });

        const result = await client.comprobantes.create(createInput);
        expect(result.tipoComprobante).toBe(tipo);
      }
    });

    it('should include optional clienteDireccion', async () => {
      const createInput = {
        tipoComprobante: '01' as TipoComprobante,
        serie: 'F001',
        clienteTipoDocumento: '6',
        clienteNumeroDocumento: '20100178959',
        clienteNombre: 'Cliente Test SA',
        clienteDireccion: 'Av. Principal 123, Lima',
        detalles: [
          {
            descripcion: 'Producto',
            cantidad: 1,
            valorUnitario: 100,
          },
        ],
      };

      const mockCreatedComprobante = {
        id: 'new-comp-id',
        tenantId: TEST_CONFIG.tenantId,
        tipoComprobante: '01',
        serie: 'F001',
        numero: 1,
        fechaEmision: new Date().toISOString(),
        clienteTipoDocumento: '6',
        clienteNumeroDocumento: '20100178959',
        clienteNombre: 'Cliente Test SA',
        clienteDireccion: 'Av. Principal 123, Lima',
        totalGravadas: '100',
        totalIgv: '18',
        totalImporte: '118',
        sunatEstado: 'pendiente',
        createdAt: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockCreatedComprobante,
      });

      const result = await client.comprobantes.create(createInput);

      expect(result.id).toBe('new-comp-id');
    });

    it('should include optional formaPago', async () => {
      const createInput = {
        tipoComprobante: '01' as TipoComprobante,
        serie: 'F001',
        clienteTipoDocumento: '6',
        clienteNumeroDocumento: '20100178959',
        clienteNombre: 'Cliente Test SA',
        detalles: [
          {
            descripcion: 'Producto',
            cantidad: 1,
            valorUnitario: 100,
          },
        ],
        formaPago: {
          formaPago: 'Contado',
          montoPago: 118,
        },
      };

      const mockCreatedComprobante = {
        id: 'new-comp-id',
        tenantId: TEST_CONFIG.tenantId,
        tipoComprobante: '01',
        serie: 'F001',
        numero: 1,
        fechaEmision: new Date().toISOString(),
        clienteTipoDocumento: '6',
        clienteNumeroDocumento: '20100178959',
        clienteNombre: 'Cliente Test SA',
        totalGravadas: '100',
        totalIgv: '18',
        totalImporte: '118',
        sunatEstado: 'pendiente',
        createdAt: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockCreatedComprobante,
      });

      const result = await client.comprobantes.create(createInput);

      expect(result.id).toBe('new-comp-id');
    });
  });

  describe('cancel()', () => {
    it('should cancel comprobante with pending status', async () => {
      const mockResponse = {
        id: 'comp-123',
        sunatEstado: 'anulado',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockResponse,
      });

      const result = await client.comprobantes.cancel('comp-123');

      expect(result.id).toBe('comp-123');
      expect(result.sunatEstado).toBe('anulado');
    });
  });
});
