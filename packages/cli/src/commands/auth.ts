import { FacturinClient, AuthenticationError } from '@facturin/sdk';
import { loadConfig, saveConfig, hasCredentials, getConfigPathForDisplay } from '../config.js';

export interface LoginOptions {
  baseUrl: string;
  apiKey: string;
  tenantId?: string;
}

export async function login(options: LoginOptions): Promise<void> {
  const { baseUrl, apiKey, tenantId } = options;

  // Validate required fields
  if (!baseUrl) {
    throw new Error('baseUrl is required');
  }
  if (!apiKey) {
    throw new Error('apiKey is required');
  }

  // Trim trailing slash from baseUrl
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');

  // Validate connection before saving
  console.error('Connecting to API...');

  let testClient: FacturinClient;
  try {
    // For validation, we need to use a tenantId to test the connection
    // If tenantId is not provided, we try with a placeholder to test API reachability
    const testTenantId = tenantId || '00000000-0000-0000-0000-000000000000';

    testClient = new FacturinClient({
      baseUrl: cleanBaseUrl,
      apiKey,
      tenantId: testTenantId,
    });

    // Try to get tenant readiness as a connection test
    // This will fail with 401/403 if credentials are invalid, but succeed if API is reachable
    await testClient.get<{ ready: boolean }>('/api/v1/tenant/readiness');
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw new Error(`Authentication failed: Invalid API key`, { cause: error });
    }
    if (error instanceof Error && error.message.includes('fetch')) {
      throw new Error(`Connection failed: Could not reach ${cleanBaseUrl}. Please verify the URL.`, { cause: error });
    }
    throw error;
  }

  // Save credentials
  saveConfig({
    baseUrl: cleanBaseUrl,
    apiKey,
    tenantId: tenantId || '',
  });

  console.log('Login successful!');
  console.log(`Credentials saved to ${getConfigPathForDisplay()}`);
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

  if (!config.baseUrl || !config.apiKey) {
    throw new CLIError(
      'Not logged in. Please run "facturin login" first.',
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

export class CLIError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'CLIError';
  }
}
