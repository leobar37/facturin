import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig, saveConfig, clearConfig, hasCredentials, getConfigPathForDisplay } from '../config.js';

// Mock the config file path for testing
const TEST_CONFIG_DIR = join(process.cwd(), '.test-facturin-config');
const TEST_CONFIG_PATH = join(TEST_CONFIG_DIR, '.facturin', 'config.json');

describe('Config Management', () => {
  // Store original HOME
  const originalHome = process.env.HOME;

  beforeEach(() => {
    // Set test config directory
    process.env.HOME = TEST_CONFIG_DIR;
    
    // Create test directory structure
    if (!existsSync(TEST_CONFIG_DIR)) {
      mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    }
    // Create .facturin subdirectory
    const facturinDir = join(TEST_CONFIG_DIR, '.facturin');
    if (!existsSync(facturinDir)) {
      mkdirSync(facturinDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Restore original HOME
    process.env.HOME = originalHome;
    
    // Clean up test directory
    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
    }
    
    vi.restoreAllMocks();
  });

  describe('loadConfig', () => {
    it('should return empty config when no config file exists', () => {
      const config = loadConfig();
      expect(config).toEqual({});
    });

    it('should load existing config from file', () => {
      const testConfig = {
        baseUrl: 'http://localhost:3100',
        apiKey: 'sk_test_123',
        tenantId: 'tenant-uuid-123',
      };
      
      writeFileSync(TEST_CONFIG_PATH, JSON.stringify(testConfig), 'utf-8');
      
      const config = loadConfig();
      expect(config).toEqual(testConfig);
    });

    it('should return empty config on invalid JSON', () => {
      writeFileSync(TEST_CONFIG_PATH, 'invalid json', 'utf-8');
      
      const config = loadConfig();
      expect(config).toEqual({});
    });
  });

  describe('saveConfig', () => {
    it('should create config file with provided values', () => {
      const testConfig = {
        baseUrl: 'http://localhost:3100',
        apiKey: 'sk_test_456',
      };
      
      saveConfig(testConfig);
      
      const content = readFileSync(TEST_CONFIG_PATH, 'utf-8');
      expect(JSON.parse(content)).toEqual(testConfig);
    });

    it('should preserve existing values when updating partial config', () => {
      // First save
      saveConfig({
        baseUrl: 'http://localhost:3100',
        apiKey: 'sk_test_initial',
        tenantId: 'tenant-1',
      });
      
      // Update only apiKey
      saveConfig({ apiKey: 'sk_test_updated' });
      
      const content = readFileSync(TEST_CONFIG_PATH, 'utf-8');
      const config = JSON.parse(content);
      
      expect(config.baseUrl).toBe('http://localhost:3100');
      expect(config.apiKey).toBe('sk_test_updated');
      expect(config.tenantId).toBe('tenant-1');
    });

    it('should create directory if it does not exist', () => {
      rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
      
      expect(existsSync(TEST_CONFIG_DIR)).toBe(false);
      
      saveConfig({ baseUrl: 'http://test.com' });
      
      expect(existsSync(TEST_CONFIG_DIR)).toBe(true);
    });
  });

  describe('clearConfig', () => {
    it('should clear only apiKey while preserving baseUrl and tenantId', () => {
      const testConfig = {
        baseUrl: 'http://localhost:3100',
        apiKey: 'sk_test_789',
        tenantId: 'tenant-xyz',
      };
      
      writeFileSync(TEST_CONFIG_PATH, JSON.stringify(testConfig), 'utf-8');
      
      clearConfig();
      
      const content = readFileSync(TEST_CONFIG_PATH, 'utf-8');
      const config = JSON.parse(content);
      
      expect(config.baseUrl).toBe('http://localhost:3100');
      expect(config.tenantId).toBe('tenant-xyz');
      expect(config.apiKey).toBeUndefined();
    });

    it('should do nothing when no config exists', () => {
      expect(() => clearConfig()).not.toThrow();
    });
  });

  describe('hasCredentials', () => {
    it('should return false when no config exists', () => {
      expect(hasCredentials()).toBe(false);
    });

    it('should return false when only baseUrl is set', () => {
      saveConfig({ baseUrl: 'http://localhost:3100' });
      expect(hasCredentials()).toBe(false);
    });

    it('should return false when only apiKey is set', () => {
      saveConfig({ apiKey: 'sk_test_123' });
      expect(hasCredentials()).toBe(false);
    });

    it('should return true when both baseUrl and apiKey are set', () => {
      saveConfig({
        baseUrl: 'http://localhost:3100',
        apiKey: 'sk_test_123',
      });
      expect(hasCredentials()).toBe(true);
    });
  });

  describe('getConfigPathForDisplay', () => {
    it('should return the config file path', () => {
      const path = getConfigPathForDisplay();
      expect(path).toContain('.facturin');
      expect(path).toContain('config.json');
    });
  });
});

describe('Login/Logout Commands (VAL-CLI-001, VAL-CLI-002, VAL-CLI-003)', () => {
  const originalHome = process.env.HOME;

  beforeEach(() => {
    process.env.HOME = TEST_CONFIG_DIR;
    
    if (!existsSync(TEST_CONFIG_DIR)) {
      mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    
    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
    }
    
    vi.restoreAllMocks();
  });

  it('should validate that baseUrl is required (VAL-CLI-001)', async () => {
    const { login } = await import('../commands/auth.js');
    
    await expect(login({
      baseUrl: '',
      apiKey: 'sk_test_123',
    })).rejects.toThrow('baseUrl is required');
  });

  it('should validate that apiKey is required (VAL-CLI-001)', async () => {
    const { login } = await import('../commands/auth.js');
    
    await expect(login({
      baseUrl: 'http://localhost:3100',
      apiKey: '',
    })).rejects.toThrow('apiKey is required');
  });

  it('should test connection before saving credentials (VAL-CLI-002)', async () => {
    const { login } = await import('../commands/auth.js');
    
    // Mock global fetch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({ ready: true }),
    });
    
    await login({
      baseUrl: 'http://localhost:3100',
      apiKey: 'sk_test_connection_valid',
      tenantId: 'tenant-123',
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((globalThis as any).fetch).toHaveBeenCalled();
    
    // Verify config was saved
    const configPath = join(TEST_CONFIG_DIR, '.facturin', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(config.baseUrl).toBe('http://localhost:3100');
    expect(config.apiKey).toBe('sk_test_connection_valid');
    expect(config.tenantId).toBe('tenant-123');
  });

  it('should reject invalid API key (VAL-CLI-002)', async () => {
    const { login } = await import('../commands/auth.js');
    
    // Mock global fetch to return 401
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({
        error: 'Authentication failed',
        code: 'AUTHENTICATION_ERROR',
      }),
    });
    
    await expect(login({
      baseUrl: 'http://localhost:3100',
      apiKey: 'sk_invalid',
    })).rejects.toThrow('Authentication failed: Invalid API key');
  });

  it('should reject unreachable API (VAL-CLI-002)', async () => {
    const { login } = await import('../commands/auth.js');
    
    // Mock global fetch to throw network error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = vi.fn().mockRejectedValueOnce(
      new TypeError('Failed to fetch')
    );
    
    await expect(login({
      baseUrl: 'http://localhost:9999',
      apiKey: 'sk_test',
    })).rejects.toThrow('Connection failed');
  });

  it('should save credentials on successful login (VAL-CLI-001)', async () => {
    const { login } = await import('../commands/auth.js');
    
    // Mock successful connection test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({ ready: false, missing: ['certificate'] }),
    });
    
    await login({
      baseUrl: 'http://localhost:3100',
      apiKey: 'sk_test_save_creds',
      tenantId: 'tenant-456',
    });
    
    const configPath = join(TEST_CONFIG_DIR, '.facturin', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    
    expect(config.baseUrl).toBe('http://localhost:3100');
    expect(config.apiKey).toBe('sk_test_save_creds');
    expect(config.tenantId).toBe('tenant-456');
  });

  it('should logout and clear credentials (VAL-CLI-003)', async () => {
    const { login, logout } = await import('../commands/auth.js');
    
    // First login
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({ ready: true }),
    });
    
    await login({
      baseUrl: 'http://localhost:3100',
      apiKey: 'sk_test_logout',
      tenantId: 'tenant-789',
    });
    
    // Then logout
    await logout();
    
    const configPath = join(TEST_CONFIG_DIR, '.facturin', 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    
    expect(config.apiKey).toBeUndefined();
    expect(config.baseUrl).toBe('http://localhost:3100');
    expect(config.tenantId).toBe('tenant-789');
  });

  it('should handle logout when not logged in (VAL-CLI-003)', async () => {
    const { logout } = await import('../commands/auth.js');
    
    // Should not throw - logout when not logged in should be a no-op
    await expect(async () => await logout()).not.toThrow();
  });
});

describe('Config Show Command (VAL-CLI-004)', () => {
  const originalHome = process.env.HOME;

  beforeEach(() => {
    process.env.HOME = TEST_CONFIG_DIR;
    
    if (!existsSync(TEST_CONFIG_DIR)) {
      mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    
    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
    }
  });

  it('should show empty config when no config exists (VAL-CLI-004)', async () => {
    const { showConfig } = await import('../commands/config.js');
    
    let output = '';
    const originalLog = console.log;
    console.log = vi.fn((msg) => { output += msg + '\n'; });
    
    await showConfig();
    
    console.log = originalLog;
    expect(output).toContain('No configuration found');
  });

  it('should show config with masked API key (VAL-CLI-004)', async () => {
    const { showConfig } = await import('../commands/config.js');
    
    saveConfig({
      baseUrl: 'http://localhost:3100',
      apiKey: 'sk_test_show_12345678',
      tenantId: 'tenant-show-123',
    });
    
    let output = '';
    const originalLog = console.log;
    console.log = vi.fn((msg) => { output += msg + '\n'; });
    
    await showConfig();
    
    console.log = originalLog;
    expect(output).toContain('http://localhost:3100');
    expect(output).toContain('sk_t...5678');
    expect(output).toContain('tenant-show-123');
    expect(output).not.toContain('sk_test_show_12345678'); // Full key should not appear
  });

  it('should show verbose config with full API key (VAL-CLI-004)', async () => {
    const { showConfig } = await import('../commands/config.js');
    
    saveConfig({
      baseUrl: 'http://localhost:3100',
      apiKey: 'sk_test_verbose_key',
      tenantId: 'tenant-verbose',
    });
    
    let output = '';
    const originalLog = console.log;
    console.log = vi.fn((msg) => { output += msg + '\n'; });
    
    await showConfig({ verbose: true });
    
    console.log = originalLog;
    expect(output).toContain('sk_test_verbose_key');
  });
});

describe('Require Auth (VAL-CLI-005)', () => {
  const originalHome = process.env.HOME;

  beforeEach(() => {
    process.env.HOME = TEST_CONFIG_DIR;
    
    if (!existsSync(TEST_CONFIG_DIR)) {
      mkdirSync(TEST_CONFIG_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    
    if (existsSync(TEST_CONFIG_DIR)) {
      rmSync(TEST_CONFIG_DIR, { recursive: true, force: true });
    }
  });

  it('should throw error when not logged in (VAL-CLI-005)', async () => {
    const { requireAuth, CLIError } = await import('../commands/auth.js');
    
    expect(() => requireAuth()).toThrow(CLIError);
    expect(() => requireAuth()).toThrow('Not logged in');
  });

  it('should throw error when tenantId is not set (VAL-CLI-005)', async () => {
    const { requireAuth, CLIError } = await import('../commands/auth.js');
    
    saveConfig({
      baseUrl: 'http://localhost:3100',
      apiKey: 'sk_test_no_tenant',
    });
    
    expect(() => requireAuth()).toThrow(CLIError);
    expect(() => requireAuth()).toThrow('No tenant configured');
  });

  it('should return FacturinClient when properly authenticated (VAL-CLI-005)', async () => {
    const { requireAuth } = await import('../commands/auth.js');
    const { FacturinClient } = await import('@facturin/sdk');
    
    saveConfig({
      baseUrl: 'http://localhost:3100',
      apiKey: 'sk_test_authenticated',
      tenantId: 'tenant-authenticated',
    });
    
    const client = requireAuth();
    expect(client).toBeInstanceOf(FacturinClient);
  });
});
