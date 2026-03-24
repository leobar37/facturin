import { loadConfig, saveConfig, getConfigPathForDisplay, hasCredentials } from '../config.js';

export interface ConfigShowOptions {
  verbose?: boolean;
}

export async function showConfig(options: ConfigShowOptions = {}): Promise<void> {
  const config = loadConfig();
  const { verbose = false } = options;

  console.log('=== Facturin CLI Configuration ===');
  console.log(`Config file: ${getConfigPathForDisplay()}`);
  console.log();

  if (!config.baseUrl && !config.apiKey && !config.tenantId) {
    console.log('No configuration found. Please run "facturin login" first.');
    return;
  }

  console.log(`Base URL:  ${config.baseUrl || '(not set)'}`);

  if (config.apiKey) {
    if (verbose) {
      console.log(`API Key:   ${config.apiKey}`);
    } else {
      // Mask API key for security
      const maskedKey = config.apiKey.length > 8
        ? `${config.apiKey.slice(0, 4)}...${config.apiKey.slice(-4)}`
        : '****';
      console.log(`API Key:   ${maskedKey}`);
    }
  } else {
    console.log(`API Key:   (not set)`);
  }

  console.log(`Tenant ID: ${config.tenantId || '(not set)'}`);
  console.log();
  console.log(`Status: ${hasCredentials() ? 'Logged in' : 'Logged out'}`);
}

export interface ConfigSetOptions {
  key: string;
  value: string;
}

export async function setConfig(options: ConfigSetOptions): Promise<void> {
  const { key, value } = options;

  if (!['baseUrl', 'apiKey', 'tenantId'].includes(key)) {
    throw new Error(`Invalid config key: ${key}. Valid keys are: baseUrl, apiKey, tenantId`);
  }

  const config = loadConfig();

  // Trim trailing slash for baseUrl
  if (key === 'baseUrl') {
    config.baseUrl = value.replace(/\/$/, '');
  } else {
    config[key as keyof typeof config] = value;
  }

  saveConfig(config);
  console.log(`${key} set successfully.`);
}

export async function unsetConfig(key: string): Promise<void> {
  if (!['baseUrl', 'apiKey', 'tenantId'].includes(key)) {
    throw new Error(`Invalid config key: ${key}. Valid keys are: baseUrl, apiKey, tenantId`);
  }

  const config = loadConfig();

  if (key === 'apiKey') {
    // apiKey should be completely removed
    config.apiKey = undefined;
  } else {
    config[key as keyof typeof config] = undefined;
  }

  saveConfig(config);
  console.log(`${key} unset successfully.`);
}
