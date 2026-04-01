import { login, logout, CLIError } from './commands/auth.js';
import { showConfig, setConfig, unsetConfig } from './commands/config.js';
import {
  listTenants,
  createTenant,
  parseTenantCommand,
  printTenantsHelp,
} from './commands/tenants.js';
import {
  listSeries,
  createSeries,
  parseSeriesCommand,
  printSeriesHelp,
} from './commands/series.js';
import {
  emitFactura,
  parseEmitCommand,
} from './commands/emit.js';
import {
  listComprobantes,
  getComprobante,
  cancelComprobante,
  parseComprobantesCommand,
  printComprobantesHelp,
} from './commands/comprobantes.js';
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  parseApiKeysCommand,
  printApiKeysHelp,
} from './commands/api-keys.js';

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Main command router
async function main() {
  try {
    switch (command) {
      case 'login': {
        const options = parseLoginOptions(args.slice(1));
        await login(options);
        break;
      }

      case 'logout': {
        await logout();
        break;
      }

      case 'config': {
        await handleConfigCommand(args.slice(1));
        break;
      }

      case 'tenants': {
        await handleTenantsCommand(args.slice(1));
        break;
      }

      case 'series': {
        await handleSeriesCommand(args.slice(1));
        break;
      }

      case 'emit': {
        const emitOptions = parseEmitCommand(args.slice(1));
        await emitFactura(emitOptions);
        break;
      }

      case 'comprobantes': {
        await handleComprobantesCommand(args.slice(1));
        break;
      }

      case 'api-keys': {
        await handleApiKeysCommand(args.slice(1));
        break;
      }

      case 'help':
      case '--help':
      case '-h': {
        printHelp();
        break;
      }

      case 'version':
      case '--version':
      case '-v': {
        console.log('Facturin CLI v0.1.0');
        break;
      }

      default: {
        if (!command) {
          printHelp();
          break;
        }
        throw new CLIError(`Unknown command: ${command}`, 'UNKNOWN_COMMAND');
      }
    }
  } catch (error) {
    if (error instanceof CLIError) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }

    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }

    console.error('An unexpected error occurred');
    process.exit(1);
  }
}

async function handleTenantsCommand(args: string[]): Promise<void> {
  // If no subcommand or --help, show help
  if (!args[0] || args[0] === '--help' || args[0] === '-h') {
    printTenantsHelp();
    return;
  }

  const parsed = parseTenantCommand(args);

  switch (parsed.subcommand) {
    case 'list':
      await listTenants(parsed.options);
      break;
    case 'create':
      await createTenant(parsed.options);
      break;
  }
}

async function handleSeriesCommand(args: string[]): Promise<void> {
  // If no subcommand or --help, show help
  if (!args[0] || args[0] === '--help' || args[0] === '-h') {
    printSeriesHelp();
    return;
  }

  const parsed = parseSeriesCommand(args);

  switch (parsed.subcommand) {
    case 'list':
      await listSeries(parsed.options);
      break;
    case 'create':
      await createSeries(parsed.options);
      break;
  }
}

async function handleComprobantesCommand(args: string[]): Promise<void> {
  // If no subcommand or --help, show help
  if (!args[0] || args[0] === '--help' || args[0] === '-h') {
    printComprobantesHelp();
    return;
  }

  const parsed = parseComprobantesCommand(args);

  switch (parsed.subcommand) {
    case 'list':
      await listComprobantes(parsed.options);
      break;
    case 'get':
      await getComprobante(parsed.options);
      break;
    case 'cancel':
      await cancelComprobante(parsed.options);
      break;
  }
}

async function handleApiKeysCommand(args: string[]): Promise<void> {
  // If no subcommand or --help, show help
  if (!args[0] || args[0] === '--help' || args[0] === '-h') {
    printApiKeysHelp();
    return;
  }

  const parsed = parseApiKeysCommand(args);

  switch (parsed.subcommand) {
    case 'list':
      await listApiKeys();
      break;
    case 'create':
      await createApiKey(parsed.options);
      break;
    case 'revoke':
      await revokeApiKey(parsed.options);
      break;
  }
}

interface LoginOptions {
  baseUrl: string;
  apiKey?: string;
  tenantId?: string;
  email?: string;
  password?: string;
}

function parseLoginOptions(args: string[]): LoginOptions {
  const options: LoginOptions = {
    baseUrl: '',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--base-url':
      case '-u':
        options.baseUrl = args[++i] || '';
        break;
      case '--api-key':
      case '-k':
        options.apiKey = args[++i] || '';
        break;
      case '--tenant-id':
      case '-t':
        options.tenantId = args[++i] || '';
        break;
      case '--email':
      case '-e':
        options.email = args[++i] || '';
        break;
      case '--password':
      case '-p':
        options.password = args[++i] || '';
        break;
      case '--help':
      case '-h':
        printLoginHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

async function handleConfigCommand(args: string[]) {
  const sub = args[0];

  switch (sub) {
    case 'show':
    case 'get': {
      const verbose = args.includes('--verbose') || args.includes('-v');
      await showConfig({ verbose });
      break;
    }

    case 'set': {
      const key = args[1];
      const value = args[2];

      if (!key || !value) {
        throw new CLIError(
          'Usage: facturin config set <key> <value>',
          'INVALID_USAGE'
        );
      }

      await setConfig({ key, value });
      break;
    }

    case 'unset': {
      const key = args[1];

      if (!key) {
        throw new CLIError(
          'Usage: facturin config unset <key>',
          'INVALID_USAGE'
        );
      }

      await unsetConfig(key);
      break;
    }

    case '--help':
    case '-h': {
      printConfigHelp();
      break;
    }

    default: {
      await showConfig();
      break;
    }
  }
}

function printHelp(): void {
  console.log(`
Facturin CLI - Electronic Invoicing for Peru

Usage: facturin <command> [options]

Commands:
  login                 Authenticate with the API
  logout                Remove stored credentials
  config                Show/modify configuration
  tenants               Manage tenants (requires auth)
  series                Manage series (requires auth)
  emit                  Emit invoices/receipts (requires auth)
  comprobantes          List, view, and cancel invoices (requires auth)
  api-keys              Manage API keys (admin only)

Options:
  -h, --help           Show this help message
  -v, --version        Show version

Examples:
  facturin login --base-url http://localhost:3100 --api-key sk_live_xxx --tenant-id uuid
  facturin config show
  facturin config set tenantId <uuid>

For more information on a specific command, run:
  facturin <command> --help
`);
}

function printLoginHelp(): void {
  console.log(`
Usage: facturin login [options]

Authenticate with the Facturin API and save credentials locally.

Two authentication modes are supported:
  1. Admin login (email/password) - for tenant management operations
  2. Tenant login (API key) - for series and emit operations

Admin Login:
  -u, --base-url <url>     API base URL (required)
  -e, --email <email>     Admin email (required for admin login)
  -p, --password <pass>    Admin password (required for admin login)
  -h, --help               Show this help message

Tenant Login:
  -u, --base-url <url>     API base URL (required)
  -k, --api-key <key>      API key (required for tenant login)
  -t, --tenant-id <id>     Tenant ID (required for tenant operations)
  -h, --help               Show this help message

Examples:
  Admin login:
  facturin login -u http://localhost:3102 -e admin@facturin.local -p admin123
  
  Tenant login:
  facturin login -u http://localhost:3102 -k sk_live_xxx -t uuid
`);
}

function printConfigHelp(): void {
  console.log(`
Usage: facturin config [subcommand] [options]

Show or modify CLI configuration.

Subcommands:
  show, get       Show current configuration
  set <key> <value>   Set a configuration value
  unset <key>       Remove a configuration value

Options:
  -v, --verbose      Show full values (e.g., full API key)

Configuration Keys:
  baseUrl    API base URL
  apiKey     API authentication key
  tenantId    Default tenant ID

Examples:
  facturin config show
  facturin config show --verbose
  facturin config set tenantId 00000000-0000-0000-0000-000000000000
  facturin config unset apiKey
`);
}

// Run main function
main();
