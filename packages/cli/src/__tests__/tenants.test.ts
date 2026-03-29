import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateRuc } from '@facturin/sdk';

// Test config directory
const TEST_CONFIG_DIR = join(process.cwd(), '.test-facturin-cli-tenants');
const TEST_CONFIG_PATH = join(TEST_CONFIG_DIR, '.facturin', 'config.json');

describe('Tenant Commands', () => {
  const originalHome = process.env.HOME;
  // Store original fetch to restore after tests
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.HOME = TEST_CONFIG_DIR;

    if (!existsSync(TEST_CONFIG_DIR)) {
      mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    }
    const facturinDir = join(TEST_CONFIG_DIR, '.facturin');
    if (!existsSync(facturinDir)) {
      mkdirSync(facturinDir, { recursive: true });
    }
  });

  afterEach(() => {
    process.env.HOME = originalHome;

    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
    }

    // Restore original fetch
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('listTenants (VAL-CLI-006)', () => {
    it('should require authentication', async () => {
      const { listTenants } = await import('../commands/tenants.js');

      // Ensure no credentials
      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({}), 'utf-8');

      await expect(listTenants()).rejects.toThrow('Not logged in');
    });

    it('should require admin auth', async () => {
      const { listTenants } = await import('../commands/tenants.js');

      // Setup with tenant credentials but no admin token
      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({
        baseUrl: 'http://localhost:3100',
        apiKey: 'sk_test_123',
        tenantId: 'tenant-123',
      }), 'utf-8');

      await expect(listTenants()).rejects.toThrow('Not logged in as admin');
    });

    it('should list tenants and display table format', async () => {
      const { listTenants } = await import('../commands/tenants.js');

      // Setup authenticated admin config
      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({
        baseUrl: 'http://localhost:3100',
        adminToken: 'jwt_admin_token',
      }), 'utf-8');

      // Mock the SDK client
      const mockTenants = [
        {
          id: '12345678-1234-1234-1234-123456789012',
          ruc: '12345678901',
          razonSocial: 'Empresa ABC SAC',
          isActive: true,
          hasCertificate: true,
          hasSunatCredentials: true,
        },
        {
          id: '87654321-4321-4321-4321-210987654321',
          ruc: '98765432109',
          razonSocial: 'Empresa XYZ SRL',
          isActive: false,
          hasCertificate: false,
          hasSunatCredentials: true,
        },
      ];

      // Mock global fetch for tenant list
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ data: mockTenants, pagination: { total: 2, limit: 50, offset: 0 } }),
      });

      let output = '';
      const originalLog = console.log;
      console.log = vi.fn((msg) => { output += msg + '\n'; });

      await listTenants();

      console.log = originalLog;

      // Verify table contains tenant info
      expect(output).toContain('12345678');
      expect(output).toContain('12345678901');
      expect(output).toContain('Empresa ABC SAC');
      expect(output).toContain('✓'); // Active checkmark
      expect(output).toContain('Total: 2 tenant');
    });

    it('should handle empty tenant list', async () => {
      const { listTenants } = await import('../commands/tenants.js');

      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({
        baseUrl: 'http://localhost:3100',
        adminToken: 'jwt_admin_token',
      }), 'utf-8');

      // Mock global fetch for empty tenant list
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ data: [], pagination: { total: 0, limit: 50, offset: 0 } }),
      });

      let output = '';
      const originalLog = console.log;
      console.log = vi.fn((msg) => { output += msg + '\n'; });

      await listTenants();

      console.log = originalLog;

      expect(output).toContain('No tenants found');
    });
  });

  describe('createTenant (VAL-CLI-007, VAL-CLI-008)', () => {
    it('should require authentication', async () => {
      const { createTenant } = await import('../commands/tenants.js');

      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({}), 'utf-8');

      await expect(createTenant()).rejects.toThrow('Not logged in');
    });

    it('should require admin auth', async () => {
      const { createTenant } = await import('../commands/tenants.js');

      // Setup with tenant credentials but no admin token
      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({
        baseUrl: 'http://localhost:3100',
        apiKey: 'sk_test_123',
        tenantId: 'tenant-123',
      }), 'utf-8');

      await expect(createTenant()).rejects.toThrow('Not logged in as admin');
    });

    it('should require RUC in non-interactive mode (VAL-CLI-007)', async () => {
      const { createTenant } = await import('../commands/tenants.js');

      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({
        baseUrl: 'http://localhost:3100',
        adminToken: 'jwt_admin_token',
      }), 'utf-8');

      await expect(createTenant({
        razonSocial: 'Test Company',
        // No ruc provided
      })).rejects.toThrow('RUC is required');
    });

    it('should require Razon Social in non-interactive mode (VAL-CLI-007)', async () => {
      const { createTenant } = await import('../commands/tenants.js');

      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({
        baseUrl: 'http://localhost:3100',
        adminToken: 'jwt_admin_token',
      }), 'utf-8');

      await expect(createTenant({
        ruc: '12345678901',
        // No razonSocial provided
      })).rejects.toThrow('Razón Social is required');
    });

    it('should validate RUC format (VAL-CLI-007)', async () => {
      const { createTenant } = await import('../commands/tenants.js');

      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({
        baseUrl: 'http://localhost:3100',
        adminToken: 'jwt_admin_token',
      }), 'utf-8');

      // Invalid RUC - not 11 digits
      await expect(createTenant({
        ruc: '12345',
        razonSocial: 'Test Company',
      })).rejects.toThrow('RUC must be 11 digits');

      // Invalid RUC - bad checksum
      await expect(createTenant({
        ruc: '12345678901', // This would fail checksum validation
        razonSocial: 'Test Company',
      })).rejects.toThrow();
    });

    it('should create tenant with valid RUC and display result (VAL-CLI-007)', async () => {
      const { createTenant } = await import('../commands/tenants.js');

      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({
        baseUrl: 'http://localhost:3100',
        adminToken: 'jwt_admin_token',
      }), 'utf-8');

      // Valid RUC for testing (20100178959 - a RUC that passes checksum)
      // Note: We need to use a RUC that passes the SUNAT checksum algorithm
      // For testing purposes, we'll mock the fetch to avoid actual API calls
      const mockTenant = {
        id: 'new-tenant-id-123',
        ruc: '20100178959',
        razonSocial: 'New Company SAC',
        isActive: true,
        hasCertificate: false,
        hasSunatCredentials: false,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockTenant,
      });

      let output = '';
      const originalLog = console.log;
      console.log = vi.fn((msg) => { output += msg + '\n'; });

      await createTenant({
        ruc: '20100178959',
        razonSocial: 'New Company SAC',
      });

      console.log = originalLog;

      expect(output).toContain('Tenant created successfully');
      expect(output).toContain('20100178959');
      expect(output).toContain('New Company SAC');
      expect(output).toContain('new-tenant-id-123');
    });

    it('should display success message after creating tenant', async () => {
      const { createTenant } = await import('../commands/tenants.js');

      // Config with admin token
      writeFileSync(TEST_CONFIG_PATH, JSON.stringify({
        baseUrl: 'http://localhost:3100',
        adminToken: 'jwt_admin_token',
      }), 'utf-8');

      const mockTenant = {
        id: 'new-tenant-id-456',
        ruc: '20100178959',
        razonSocial: 'New Company SAC',
        isActive: true,
        hasCertificate: false,
        hasSunatCredentials: false,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => mockTenant,
      });

      let output = '';
      const originalLog = console.log;
      console.log = vi.fn((msg) => { output += msg + '\n'; });

      await createTenant({
        ruc: '20100178959',
        razonSocial: 'New Company SAC',
      });

      console.log = originalLog;

      expect(output).toContain('Tenant created successfully');
      expect(output).toContain('20100178959');
    });
  });

  describe('parseTenantCommand', () => {
    it('should parse list subcommand with options', async () => {
      const { parseTenantCommand } = await import('../commands/tenants.js');

      const result = parseTenantCommand(['list', '--search', 'Acme', '--limit', '10']);

      expect(result.subcommand).toBe('list');
      // @ts-expect-error - union type makes options access complex
      expect(result.options.search).toBe('Acme');
      // @ts-expect-error - union type makes options access complex
      expect(result.options.limit).toBe(10);
    });

    it('should parse create subcommand with flags', async () => {
      const { parseTenantCommand } = await import('../commands/tenants.js');

      const result = parseTenantCommand([
        'create',
        '--ruc', '20100178959',
        '--razon-social', 'Test Company',
        '--nombre-comercial', 'Test',
        '--email', 'test@example.com',
      ]);

      expect(result.subcommand).toBe('create');
      // @ts-expect-error - union type makes options access complex
      expect(result.options.ruc).toBe('20100178959');
      // @ts-expect-error - union type makes options access complex
      expect(result.options.razonSocial).toBe('Test Company');
      // @ts-expect-error - union type makes options access complex
      expect(result.options.nombreComercial).toBe('Test');
      // @ts-expect-error - union type makes options access complex
      expect(result.options.email).toBe('test@example.com');
    });

    it('should default to list when no subcommand', async () => {
      const { parseTenantCommand } = await import('../commands/tenants.js');

      const result = parseTenantCommand([]);

      expect(result.subcommand).toBe('list');
      expect(result.options).toEqual({});
    });

    it('should throw on unknown subcommand', async () => {
      const { parseTenantCommand } = await import('../commands/tenants.js');

      expect(() => parseTenantCommand(['delete'])).toThrow('Unknown tenant subcommand');
    });

    it('should support short flags for list', async () => {
      const { parseTenantCommand } = await import('../commands/tenants.js');

      const result = parseTenantCommand(['list', '-s', 'search', '-l', '5', '-o', '10']);

      expect(result.subcommand).toBe('list');
      // @ts-expect-error - union type makes options access complex
      expect(result.options.search).toBe('search');
      // @ts-expect-error - union type makes options access complex
      expect(result.options.limit).toBe(5);
      // @ts-expect-error - union type makes options access complex
      expect(result.options.offset).toBe(10);
    });

    it('should support short flags for create', async () => {
      const { parseTenantCommand } = await import('../commands/tenants.js');

      const result = parseTenantCommand([
        'create',
        '-r', '20100178959',
        '-n', 'Test Company',
        '-c', 'TestComercial',
        '-d', 'Test Address',
        '-e', 'test@test.com',
        '-p', '123456789',
      ]);

      expect(result.subcommand).toBe('create');
      // @ts-expect-error - union type makes options access complex
      expect(result.options.ruc).toBe('20100178959');
      // @ts-expect-error - union type makes options access complex
      expect(result.options.razonSocial).toBe('Test Company');
      // @ts-expect-error - union type makes options access complex
      expect(result.options.nombreComercial).toBe('TestComercial');
      // @ts-expect-error - union type makes options access complex
      expect(result.options.direccion).toBe('Test Address');
      // @ts-expect-error - union type makes options access complex
      expect(result.options.email).toBe('test@test.com');
      // @ts-expect-error - union type makes options access complex
      expect(result.options.phone).toBe('123456789');
    });

    it('should parse interactive flag for create', async () => {
      const { parseTenantCommand } = await import('../commands/tenants.js');

      const result = parseTenantCommand(['create', '--interactive']);

      expect(result.subcommand).toBe('create');
      // @ts-expect-error - union type makes options access complex
      expect(result.options.interactive).toBe(true);
    });
  });
});

describe('RUC Validation', () => {
  it('should validate correct RUC', () => {
    // Test a known valid RUC (these pass the SUNAT checksum)
    // RUC 20100178959 passes the checksum algorithm
    const result = validateRuc('20100178959');
    expect(result.isValid).toBe(true);
  });

  it('should reject RUC with wrong length', () => {
    expect(validateRuc('1234567890').isValid).toBe(false);
    expect(validateRuc('123456789012').isValid).toBe(false);
    expect(validateRuc('').isValid).toBe(false);
  });

  it('should reject RUC with wrong checksum', () => {
    // RUC 12345678901 has wrong checksum digit
    expect(validateRuc('12345678901').isValid).toBe(false);
  });
});
