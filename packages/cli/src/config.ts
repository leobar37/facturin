import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface CLIConfig {
  baseUrl?: string;
  apiKey?: string;
  tenantId?: string;
  adminToken?: string;
}

const CONFIG_DIR = '.facturin';
const CONFIG_FILE = 'config.json';

function getConfigPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '~';
  return join(home, CONFIG_DIR, CONFIG_FILE);
}

function getConfigDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '~';
  return join(home, CONFIG_DIR);
}

export function loadConfig(): CLIConfig {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return {};
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as CLIConfig;
  } catch {
    return {};
  }
}

export function saveConfig(config: CLIConfig): void {
  const configDir = getConfigDir();
  const configPath = getConfigPath();

  // Ensure directory exists
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Preserve existing values for unspecified fields
  const existingConfig = loadConfig();
  const mergedConfig: CLIConfig = {
    ...existingConfig,
    ...config,
  };

  writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2), 'utf-8');
}

export function clearConfig(): void {
  const configDir = getConfigDir();
  const configPath = getConfigPath();

  if (existsSync(configPath)) {
    // Clear all credentials but keep baseUrl
    const existingConfig = loadConfig();
    
    // Write directly without merging, to ensure all credentials are removed
    const newConfig: CLIConfig = {
      baseUrl: existingConfig.baseUrl,
    };
    
    // Ensure directory exists
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    
    writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');
  }
}

export function hasCredentials(): boolean {
  const config = loadConfig();
  // Check for either tenant (apiKey) or admin (adminToken) credentials
  return Boolean((config.apiKey || config.adminToken) && config.baseUrl);
}

export function isAdminAuthenticated(): boolean {
  const config = loadConfig();
  return Boolean(config.adminToken && config.baseUrl);
}

export function isTenantAuthenticated(): boolean {
  const config = loadConfig();
  return Boolean(config.apiKey && config.baseUrl);
}

export function getConfigPathForDisplay(): string {
  return getConfigPath();
}
