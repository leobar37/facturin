import { FacturinClient, AdminClient, AuthenticationError } from '@facturin/sdk';
import { loadConfig, saveConfig, hasCredentials, getConfigPathForDisplay } from '../config.js';

export interface LoginOptions {
  baseUrl: string;
  apiKey?: string;
  tenantId?: string;
  email?: string;
  password?: string;
}

export async function login(options: LoginOptions): Promise<void> {
  const { baseUrl, apiKey, tenantId, email, password } = options;

  // Validate required fields
  if (!baseUrl) {
    throw new Error('baseUrl is required');
  }

  // Trim trailing slash from baseUrl
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  // Determine auth mode: admin (email/password) or tenant (apiKey)
  const isAdminLogin = Boolean(email && password);
  const isTenantLogin = Boolean(apiKey);

  if (!isAdminLogin && !isTenantLogin) {
    throw new CLIError(
      'Either --api-key (for tenant login) or --email/--password (for admin login) is required',
      'MISSING_AUTH_CREDENTIALS'
    );
  }

  if (isAdminLogin && isTenantLogin) {
    throw new CLIError(
      'Cannot use both admin (--email/--password) and tenant (--api-key) credentials at the same time',
      'CONFLICTING_AUTH_MODES'
    );
  }

  console.error('Connecting to API...');

  if (isAdminLogin) {
    // Admin login with email/password
    await loginAdmin(cleanBaseUrl, email!, password!);
  } else {
    // Tenant login with API key
    await loginTenant(cleanBaseUrl, apiKey!, tenantId);
  }

  console.log('Login successful!');
  console.log(`Credentials saved to ${getConfigPathForDisplay()}`);
}

async function loginAdmin(baseUrl: string, email: string, password: string): Promise<void> {
  const adminClient = new AdminClient({ baseUrl });

  try {
    await adminClient.login({ email, password });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw new CLIError(
        `Authentication failed: Invalid admin credentials`,
        'INVALID_ADMIN_CREDENTIALS'
      );
    }
    if (error instanceof Error && error.message.includes('fetch')) {
      throw new CLIError(
        `Connection failed: Could not reach ${baseUrl}. Please verify the URL.`,
        'CONNECTION_FAILED'
      );
    }
    throw error;
  }

  // Save admin credentials
  saveConfig({
    baseUrl,
    adminToken: adminClient.getToken() || '',
    // Clear tenant credentials when logging in as admin
    apiKey: '',
    tenantId: '',
  });
}

async function loginTenant(baseUrl: string, apiKey: string, tenantId?: string): Promise<void> {
  const testClient = new FacturinClient({
    baseUrl,
    apiKey,
    tenantId: tenantId || '00000000-0000-0000-0000-000000000000',
  });

  try {
    // Try to get tenant readiness as a connection test
    // This will fail with 401/403 if credentials are invalid, but succeed if API is reachable
    await testClient.get<{ ready: boolean }>('/api/v1/tenant/readiness');
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw new CLIError(
        `Authentication failed: Invalid API key`,
        'INVALID_API_KEY'
      );
    }
    if (error instanceof Error && error.message.includes('fetch')) {
      throw new CLIError(
        `Connection failed: Could not reach ${baseUrl}. Please verify the URL.`,
        'CONNECTION_FAILED'
      );
    }
    throw error;
  }

  // Save tenant credentials
  saveConfig({
    baseUrl,
    apiKey,
    tenantId: tenantId || '',
    // Clear admin token when logging in as tenant
    adminToken: '',
  });
}

export async function logout(): Promise<void> {
  if (!hasCredentials()) {
    console.log('No credentials found. Already logged out.');
    return;
  }

  const { clearConfig, getConfigPathForDisplay: getPath } = await import('../config.js');
  clearConfig();
  console.log('Logged out successfully.');
  console.log(`Credentials removed from ${getPath()}`);
}

export function requireAuth(): FacturinClient {
  const config = loadConfig();

  if (!config.baseUrl) {
    throw new CLIError(
      'Not logged in. Please run "facturin login --api-key <key> --tenant-id <id>" first.',
      'AUTH_REQUIRED'
    );
  }

  if (!config.apiKey) {
    throw new CLIError(
      'Not logged in as tenant. Use "facturin login --api-key <key> --tenant-id <id>" for tenant operations.',
      'AUTH_REQUIRED'
    );
  }

  if (!config.tenantId) {
    throw new CLIError(
      'No tenant configured. Please run "facturin config set tenantId <id>"',
      'TENANT_NOT_CONFIGURED'
    );
  }

  return new FacturinClient({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    tenantId: config.tenantId,
  });
}

export function requireAdminAuth(): AdminClient {
  const config = loadConfig();

  if (!config.baseUrl) {
    throw new CLIError(
      'Not logged in. Please run "facturin login --email <email> --password <password>" first.',
      'AUTH_REQUIRED'
    );
  }

  if (!config.adminToken) {
    throw new CLIError(
      'Not logged in as admin. Use "facturin login --email <email> --password <password>" for admin operations.',
      'AUTH_REQUIRED'
    );
  }

  const adminClient = new AdminClient({
    baseUrl: config.baseUrl,
  });

  // Set the token directly (AdminClient stores it internally when calling login)
  // We need to restore the token from config
  // Since AdminClient doesn't expose setToken, we create a new instance and 
  // manually set the internal token
  (adminClient as unknown as { _token: string | null })._token = config.adminToken;

  return adminClient;
}

export class CLIError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'CLIError';
  }
}
