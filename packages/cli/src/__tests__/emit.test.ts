import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Test config directory
const TEST_CONFIG_DIR = join(process.cwd(), '.test-facturin-cli-emit');
const TEST_CONFIG_PATH = join(TEST_CONFIG_DIR, '.facturin', 'config.json');
const TEST_FILE_DIR = join(TEST_CONFIG_DIR, 'files');

// Helper to create a valid comprobante JSON
function createValidComprobanteJson(overrides: Record<string, unknown> = {}) {
  return {
    serie: 'F001',
    clienteTipoDocumento: '6',
    // Valid RUC with correct SUNAT checksum (20100178959)
    clienteNumeroDocumento: '20100178959',
    clienteNombre: 'Empresa ABC SAC',
    clienteDireccion: 'Av. Lima 123, Lima',
    detalles: [
      {
        descripcion: 'Producto A',
        cantidad: 2,
        valorUnitario: 100.00,
      },
    ],
    ...overrides,
  };
}

describe('Emit Commands', () => {
  const originalHome = process.env.HOME;

  beforeEach(() => {
    process.env.HOME = TEST_CONFIG_DIR;

    if (!existsSync(TEST_CONFIG_DIR)) {
      mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    }
    const facturinDir = join(TEST_CONFIG_DIR, '.facturin');
    if (!existsSync(facturinDir)) {
      mkdirSync(facturinDir, { recursive: true });
    }
    if (!existsSync(TEST_FILE_DIR)) {
      mkdirSync(TEST_FILE_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    process.env.HOME = originalHome;

    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
    }

    vi.restoreAllMocks();
  });

  describe('parseEmitCommand', () => {
    it('should parse --file option', async () => {
      const { parseEmitCommand } = await import('../commands/emit.js');

      const result = parseEmitCommand(['--file', 'factura.json']);

      expect(result.file).toBe('factura.json');
      expect(result.interactive).toBe(false);
      expect(result.tipoComprobante).toBe('01');
    });

    it('should parse -f short flag', async () => {
      const { parseEmitCommand } = await import('../commands/emit.js');

      const result = parseEmitCommand(['-f', 'factura.json']);

      expect(result.file).toBe('factura.json');
    });

    it('should parse --interactive flag', async () => {
      const { parseEmitCommand } = await import('../commands/emit.js');

      const result = parseEmitCommand(['--interactive']);

      expect(result.interactive).toBe(true);
    });

    it('should parse -i short flag', async () => {
      const { parseEmitCommand } = await import('../commands/emit.js');

      const result = parseEmitCommand(['-i']);

      expect(result.interactive).toBe(true);
    });

    it('should default to Factura (01)', async () => {
      const { parseEmitCommand } = await import('../commands/emit.js');

      const result = parseEmitCommand([]);

      expect(result.tipoComprobante).toBe('01');
    });

    it('should parse combined options', async () => {
      const { parseEmitCommand } = await import('../commands/emit.js');

      const result = parseEmitCommand(['--file', 'test.json', '--interactive']);

      expect(result.file).toBe('test.json');
      expect(result.interactive).toBe(true);
    });

    it('should exit with help message for --help', async () => {
      const { parseEmitCommand } = await import('../commands/emit.js');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const processSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('exit called');
      });

      expect(() => parseEmitCommand(['--help'])).toThrow('exit called');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      processSpy.mockRestore();
    });
  });

  describe('emitFactura with file input (VAL-CLI-011, VAL-CLI-012, VAL-CLI-014)', () => {
    it('should require authentication', async () => {
      const { emitFactura } = await import('../commands/emit.js');

      // Ensure no credentials
      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({}), 'utf-8');

      await expect(emitFactura({})).rejects.toThrow('Not logged in');
    });

    it('should require tenantId in config', async () => {
      const { emitFactura } = await import('../commands/emit.js');

      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({
        baseUrl: 'http://localhost:3100',
        apiKey: 'test_api_key',
      }), 'utf-8');

      await expect(emitFactura({})).rejects.toThrow('No tenant configured');
    });

    it('should emit factura from JSON file and display result with number (VAL-CLI-011, VAL-CLI-012, VAL-CLI-014)', async () => {
      const { emitFactura } = await import('../commands/emit.js');

      // Setup authenticated config
      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({
        baseUrl: 'http://localhost:3100',
        apiKey: 'test_api_key',
        tenantId: 'tenant-123',
      }), 'utf-8');

      // Create test JSON file
      const testFile = join(TEST_FILE_DIR, 'factura.json');
      writeFileSync(testFile, JSON.stringify(createValidComprobanteJson()), 'utf-8');

      // Mock API response
      const mockComprobante = {
        id: 'comprobante-123',
        tipoComprobante: '01',
        serie: 'F001',
        numero: 1,
        clienteNombre: 'Empresa ABC SAC',
        totalGravadas: 200,
        totalIgv: 36,
        totalImporte: 236,
        sunatEstado: 'pendiente',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockComprobante,
      });

      let output = '';
      const originalLog = console.log;
      console.log = vi.fn((msg) => { output += msg + '\n'; });

      await emitFactura({ file: testFile });

      console.log = originalLog;

      // Verify output contains the comprobante info (VAL-CLI-014)
      expect(output).toContain('Comprobante creado exitosamente');
      expect(output).toContain('F001-00000001'); // Number with zero-padding
      expect(output).toContain('Empresa ABC SAC');
      expect(output).toContain('236.00'); // Total importe
      expect(output).toContain('pendiente');
    });

    it('should throw error if file not found', async () => {
      const { emitFactura } = await import('../commands/emit.js');

      // Setup authenticated config
      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({
        baseUrl: 'http://localhost:3100',
        apiKey: 'test_api_key',
        tenantId: 'tenant-123',
      }), 'utf-8');

      await expect(emitFactura({ file: '/nonexistent/factura.json' }))
        .rejects.toThrow('File not found');
    });

    it('should throw error for invalid JSON', async () => {
      const { emitFactura } = await import('../commands/emit.js');

      // Setup authenticated config
      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({
        baseUrl: 'http://localhost:3100',
        apiKey: 'test_api_key',
        tenantId: 'tenant-123',
      }), 'utf-8');

      const testFile = join(TEST_FILE_DIR, 'invalid.json');
      writeFileSync(testFile, 'not valid json {', 'utf-8');

      await expect(emitFactura({ file: testFile }))
        .rejects.toThrow('Invalid JSON');
    });

    it('should throw error if serie is missing in JSON', async () => {
      const { emitFactura } = await import('../commands/emit.js');

      // Setup authenticated config
      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({
        baseUrl: 'http://localhost:3100',
        apiKey: 'test_api_key',
        tenantId: 'tenant-123',
      }), 'utf-8');

      const testFile = join(TEST_FILE_DIR, 'invalid.json');
      writeFileSync(testFile, JSON.stringify(createValidComprobanteJson({ serie: undefined })), 'utf-8');

      await expect(emitFactura({ file: testFile }))
        .rejects.toThrow('Field "serie" is required');
    });

    it('should throw error if detalles is empty in JSON', async () => {
      const { emitFactura } = await import('../commands/emit.js');

      // Setup authenticated config
      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({
        baseUrl: 'http://localhost:3100',
        apiKey: 'test_api_key',
        tenantId: 'tenant-123',
      }), 'utf-8');

      const testFile = join(TEST_FILE_DIR, 'invalid.json');
      writeFileSync(testFile, JSON.stringify(createValidComprobanteJson({ detalles: [] })), 'utf-8');

      await expect(emitFactura({ file: testFile }))
        .rejects.toThrow('Field "detalles" is required and must have at least one item in JSON');
    });

    it('should validate detalle cantidad > 0', async () => {
      const { emitFactura } = await import('../commands/emit.js');

      // Setup authenticated config
      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({
        baseUrl: 'http://localhost:3100',
        apiKey: 'test_api_key',
        tenantId: 'tenant-123',
      }), 'utf-8');

      const testFile = join(TEST_FILE_DIR, 'invalid.json');
      writeFileSync(testFile, JSON.stringify(createValidComprobanteJson({
        detalles: [{ descripcion: 'Test', cantidad: 0, valorUnitario: 10 }]
      })), 'utf-8');

      await expect(emitFactura({ file: testFile }))
        .rejects.toThrow('cantidad must be greater than 0');
    });
  });
});
