import * as readline from 'node:readline';
import { requireAdminAuth, CLIError } from './auth.js';
import type { ApiKey, CreateApiKeyInput, CreateApiKeyResponse } from '@facturin/sdk';

// ============================================================================
// API Keys List Command
// ============================================================================

export async function listApiKeys(): Promise<void> {
  const client = requireAdminAuth();

  console.log('Fetching API keys...');

  try {
    const keys = await client.apiKeys.list();

    if (keys.length === 0) {
      console.log('\nNo API keys found.');
      return;
    }

    // Print table header
    console.log(
      '\n' +
        formatTable([
          ['ID', 'Name', 'Prefix', 'Active', 'Expires', 'Last Used'],
          ...keys.map((k: ApiKey) => [
            k.id.substring(0, 8) + '...',
            truncate(k.name, 20),
            k.keyPrefix,
            k.isActive ? '✓' : '✗',
            k.expiresAt ? formatDate(k.expiresAt) : 'Never',
            k.lastUsedAt ? formatDate(k.lastUsedAt) : 'Never',
          ]),
        ])
    );

    console.log(`\nTotal: ${keys.length} API key(s)`);
  } catch (error) {
    if (error instanceof CLIError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new CLIError(
        `Failed to list API keys: ${error.message}`,
        'LIST_API_KEYS_ERROR'
      );
    }
    throw error;
  }
}

// ============================================================================
// API Keys Create Command
// ============================================================================

export interface CreateApiKeyOptions {
  name?: string;
  expiresAt?: string;
  permissions?: string[];
  interactive?: boolean;
}

export async function createApiKey(options: CreateApiKeyOptions = {}): Promise<void> {
  const client = requireAdminAuth();
  let input: CreateApiKeyInput;

  if (options.interactive || !options.name) {
    // Interactive mode
    input = await promptForApiKeyData();
  } else {
    // Flags mode - validate required fields
    if (!options.name) {
      throw new CLIError(
        'Name is required. Use --name flag or run in interactive mode.',
        'MISSING_REQUIRED_FIELD'
      );
    }

    input = {
      name: options.name,
      expiresAt: options.expiresAt,
      permissions: options.permissions,
    };
  }

  console.log('\nCreating API key...');
  console.log(`  Name: ${input.name}`);
  if (input.expiresAt) {
    console.log(`  Expires: ${input.expiresAt}`);
  }

  try {
    const result: CreateApiKeyResponse = await client.apiKeys.create(input);

    console.log('\n' + '═'.repeat(70));
    console.log('  ⚠️  IMPORTANT: Save this API key securely!');
    console.log('     It will NOT be shown again.');
    console.log('═'.repeat(70));
    console.log(`\n  Name:     ${result.name}`);
    console.log(`  API Key:  ${result.key}`);
    console.log(`  Prefix:   ${result.keyPrefix}`);
    console.log(`  Active:   ${result.isActive ? 'Yes' : 'No'}`);
    if (result.expiresAt) {
      console.log(`  Expires:  ${formatDateTime(result.expiresAt)}`);
    }
    console.log('\n' + '═'.repeat(70));

    console.log('\n✓ API key created successfully!');
    console.log('\nTo use this key:');
    console.log(`  facturin login --base-url <url> --api-key ${result.key} --tenant-id <id>`);
  } catch (error) {
    if (error instanceof CLIError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new CLIError(
        `Failed to create API key: ${error.message}`,
        'CREATE_API_KEY_ERROR'
      );
    }
    throw error;
  }
}

// ============================================================================
// API Keys Revoke Command
// ============================================================================

export interface RevokeApiKeyOptions {
  id: string;
  force?: boolean;
}

export async function revokeApiKey(options: RevokeApiKeyOptions): Promise<void> {
  const client = requireAdminAuth();

  if (!options.id) {
    throw new CLIError('API Key ID is required', 'MISSING_REQUIRED_FIELD');
  }

  console.log(`Revoking API key ${options.id}...`);

  try {
    // First, get the key details to show user what they're revoking
    const keys = await client.apiKeys.list();
    const keyToRevoke = keys.find((k) => k.id === options.id);

    if (!keyToRevoke) {
      throw new CLIError(`API key not found: ${options.id}`, 'API_KEY_NOT_FOUND');
    }

    console.log(`\n  Name:   ${keyToRevoke.name}`);
    console.log(`  Prefix: ${keyToRevoke.keyPrefix}`);

    if (!keyToRevoke.isActive) {
      console.log('\n⚠️  This API key is already inactive.');
      return;
    }

    if (!options.force) {
      console.log('\n⚠️  Warning: This will revoke the API key permanently.');
      console.log('   Any applications using this key will stop working.');
      console.log('\n   Use --force to confirm revocation.');
      return;
    }

    console.log('\nProceeding with revocation...');

    const result = await client.apiKeys.revoke(options.id);

    console.log('\n✓ API key revoked successfully!');
    console.log(`  ID:       ${result.id}`);
    console.log(`  Active:   ${result.isActive ? 'Yes' : 'No'}`);
    console.log(`  Revoked:  ${formatDateTime(result.revokedAt)}`);
  } catch (error) {
    if (error instanceof CLIError) {
      throw error;
    }
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        throw new CLIError(
          `API key not found: ${options.id}`,
          'API_KEY_NOT_FOUND'
        );
      }
      throw new CLIError(
        `Failed to revoke API key: ${error.message}`,
        'REVOKE_API_KEY_ERROR'
      );
    }
    throw error;
  }
}

// ============================================================================
// Interactive Mode - Prompt for data
// ============================================================================

async function promptForApiKeyData(): Promise<CreateApiKeyInput> {
  const rl = createReadline();

  return new Promise((resolve, reject) => {
    const input: CreateApiKeyInput = {
      name: '',
    };

    const questions: Array<{
      key: keyof CreateApiKeyInput;
      prompt: string;
      validate?: (v: string) => boolean;
      transform?: (v: string) => unknown;
    }> = [
      {
        key: 'name',
        prompt: 'API Key name (e.g., "Production", "Development"): ',
        validate: (v) => {
          if (!v.trim()) {
            console.log('  ✗ Name is required');
            return false;
          }
          return true;
        },
      },
      {
        key: 'expiresAt',
        prompt: 'Expiration date (YYYY-MM-DD) or leave empty for no expiration: ',
        transform: (v) => (v.trim() ? v.trim() : undefined),
        validate: (v) => {
          if (!v.trim()) return true;
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(v)) {
            console.log('  ✗ Invalid date format. Use YYYY-MM-DD');
            return false;
          }
          const date = new Date(v);
          if (isNaN(date.getTime())) {
            console.log('  ✗ Invalid date');
            return false;
          }
          if (date < new Date()) {
            console.log('  ✗ Expiration date must be in the future');
            return false;
          }
          return true;
        },
      },
    ];

    let questionIndex = 0;

    const askNext = () => {
      if (questionIndex >= questions.length) {
        rl.close();
        resolve(input);
        return;
      }

      const q = questions[questionIndex];
      questionIndex++;

      rl.question(q.prompt, (answer) => {
        const trimmedAnswer = answer.trim();

        if (q.validate && !q.validate(trimmedAnswer)) {
          askNext(); // Retry
          return;
        }

        if (trimmedAnswer) {
          const value = q.transform ? q.transform(trimmedAnswer) : trimmedAnswer;
          (input as Record<string, unknown>)[q.key] = value;
        }

        askNext();
      });
    };

    rl.on('close', () => {
      if (!input.name) {
        reject(new CLIError('Name is required', 'MISSING_REQUIRED_FIELDS'));
        return;
      }
    });

    askNext();
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

function formatTable(rows: string[][]): string {
  if (rows.length === 0) return '';

  const colWidths = rows[0].map((_, colIndex) => {
    return Math.max(...rows.map((row) => (row[colIndex] || '').length));
  });

  const formattedRows = rows.map((row, rowIndex) => {
    const cells = row.map((cell, colIndex) => {
      const width = colWidths[colIndex];
      const content = cell || '';
      if (rowIndex === 0) {
        return content
          .padStart(Math.floor((width - content.length) / 2) + content.length)
          .padEnd(width);
      }
      return content.padEnd(width);
    });
    return '│ ' + cells.join(' │ ') + ' │';
  });

  const tableWidth = colWidths.reduce((a, b) => a + b + 5, 1) + 1;

  let result = '┌' + '─'.repeat(tableWidth) + '┐\n';
  result += formattedRows[0] + '\n';

  if (rows.length > 1) {
    result += '├' + '─'.repeat(tableWidth) + '┤\n';
    result += formattedRows.slice(1).join('\n') + '\n';
  }

  result += '└' + '─'.repeat(tableWidth) + '┘';

  return result;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// Parse Command Options
// ============================================================================

export interface ParseApiKeysListResult {
  subcommand: 'list';
}

export interface ParseApiKeysCreateResult {
  subcommand: 'create';
  options: CreateApiKeyOptions;
}

export interface ParseApiKeysRevokeResult {
  subcommand: 'revoke';
  options: RevokeApiKeyOptions;
}

export type ApiKeysCommandResult =
  | ParseApiKeysListResult
  | ParseApiKeysCreateResult
  | ParseApiKeysRevokeResult;

export function parseApiKeysCommand(args: string[]): ApiKeysCommandResult {
  const subcommand = args[0];

  if (subcommand === 'list') {
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--help':
        case '-h':
          printApiKeysListHelp();
          process.exit(0);
          break;
      }
    }

    return { subcommand: 'list' };
  }

  if (subcommand === 'create') {
    const options: CreateApiKeyOptions = {};

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--name':
        case '-n':
          options.name = args[++i];
          break;
        case '--expires':
        case '-e':
          options.expiresAt = args[++i];
          break;
        case '--interactive':
        case '-i':
          options.interactive = true;
          break;
        case '--help':
        case '-h':
          printApiKeysCreateHelp();
          process.exit(0);
          break;
      }
    }

    return { subcommand: 'create', options };
  }

  if (subcommand === 'revoke') {
    const options: RevokeApiKeyOptions = { id: '' };

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--id':
          options.id = args[++i];
          break;
        case '--force':
        case '-f':
          options.force = true;
          break;
        case '--help':
        case '-h':
          printApiKeysRevokeHelp();
          process.exit(0);
          break;
        default:
          if (!arg.startsWith('-') && !options.id) {
            options.id = arg;
          }
          break;
      }
    }

    return { subcommand: 'revoke', options };
  }

  // Default to list if no subcommand
  if (!subcommand) {
    return { subcommand: 'list' };
  }

  throw new CLIError(
    `Unknown api-keys subcommand: ${subcommand}. Use "list", "create", or "revoke"`,
    'UNKNOWN_SUBCOMMAND'
  );
}

export function printApiKeysListHelp(): void {
  console.log(`
Usage: facturin api-keys list [options]

List all API keys.

Options:
  -h, --help  Show this help message

Note: The full API key value is never shown, only the prefix.
`);
}

export function printApiKeysCreateHelp(): void {
  console.log(`
Usage: facturin api-keys create [options]

Create a new API key.

Options:
  -n, --name <name>         API key name (required unless --interactive)
  -e, --expires <date>      Expiration date (YYYY-MM-DD)
  -i, --interactive         Run in interactive mode
  -h, --help                Show this help message

IMPORTANT: The full API key is only shown once during creation.
Save it securely - it cannot be retrieved later!

Examples:
  facturin api-keys create --name "Production"
  facturin api-keys create --name "Development" --expires 2025-12-31
  facturin api-keys create --interactive
`);
}

export function printApiKeysRevokeHelp(): void {
  console.log(`
Usage: facturin api-keys revoke <id> [options]

Revoke (deactivate) an API key.

Arguments:
  <id>                  API Key ID (UUID)

Options:
  -f, --force          Confirm revocation without prompting
  -h, --help           Show this help message

WARNING: Revoked keys cannot be used. Applications using this key will stop working.

Examples:
  facturin api-keys revoke 550e8400-e29b-41d4-a716-446655440000
  facturin api-keys revoke --id 550e8400-e29b-41d4-a716-446655440000 --force
`);
}

export function printApiKeysHelp(): void {
  console.log(`
Usage: facturin api-keys <subcommand> [options]

Manage API keys (admin only).

Subcommands:
  list        List all API keys
  create      Create a new API key
  revoke      Revoke (deactivate) an API key

Options:
  -h, --help  Show this help message

Examples:
  facturin api-keys list
  facturin api-keys create --name "Production Key"
  facturin api-keys revoke 550e8400-e29b-41d4-a716-446655440000
`);
}
