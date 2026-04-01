import * as readline from 'node:readline';
import { requireAdminAuth, CLIError } from './auth.js';
import { loadConfig } from '../config.js';
import type { CreateTenantInput, Tenant, ListTenantsOptions as SDKListOptions } from '@facturin/sdk';
import { validateRuc } from '@facturin/sdk';

// ============================================================================
// Types (matching SDK types)
// ============================================================================

export interface ListTenantsOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

// Re-export SDK types for use in command handlers
export type { ListTenantsOptions as SDKListTenantsOptions };

interface RucValidationResult {
  isValid: boolean;
  error?: string;
}

// ============================================================================
// Tenant List Command
// ============================================================================

export async function listTenants(options: ListTenantsOptions = {}): Promise<void> {
  const client = requireAdminAuth();

  console.log('Fetching tenants...');

  try {
    const sdkOptions: SDKListOptions = {
      search: options.search,
      limit: options.limit,
      offset: options.offset,
    };
    const result = await client.tenants.list(sdkOptions);

    if (result.tenants.length === 0) {
      console.log('\nNo tenants found.');
      return;
    }

    // Print table header
    console.log('\n' + formatTable([
      ['ID', 'RUC', 'Razón Social', 'Activo', 'Cert.', 'SUNAT'],
      ...result.tenants.map((t: Tenant) => [
        t.id.substring(0, 8) + '...',
        t.ruc,
        truncate(t.razonSocial, 30),
        t.isActive ? '✓' : '✗',
        t.hasCertificate ? '✓' : '✗',
        t.hasSunatCredentials ? '✓' : '✗',
      ])
    ]));

    console.log(`\nTotal: ${result.tenants.length} tenant(s)`);
  } catch (error) {
    if (error instanceof CLIError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new CLIError(`Failed to list tenants: ${error.message}`, 'LIST_TENANTS_ERROR');
    }
    throw error;
  }
}

// ============================================================================
// Tenant Get Command
// ============================================================================

export interface GetTenantOptions {
  id: string;
}

export async function getTenant(options: GetTenantOptions): Promise<void> {
  const client = requireAdminAuth();

  if (!options.id) {
    throw new CLIError('Tenant ID is required', 'MISSING_REQUIRED_FIELD');
  }

  console.log(`Fetching tenant ${options.id}...`);

  try {
    const tenant = await client.tenants.get(options.id);

    console.log('\n' + '═'.repeat(60));
    console.log('  🏢 TENANT DETAILS');
    console.log('═'.repeat(60));

    console.log(`\n  Información General`);
    console.log(`  ──────────────────────────────────────────────`);
    console.log(`  ID:               ${tenant.id}`);
    console.log(`  RUC:              ${tenant.ruc}`);
    console.log(`  Razón Social:     ${tenant.razonSocial}`);
    if (tenant.nombreComercial) {
      console.log(`  Nombre Comercial: ${tenant.nombreComercial}`);
    }
    console.log(`  Activo:           ${tenant.isActive ? 'Sí ✓' : 'No ✗'}`);

    console.log(`\n  Contacto`);
    console.log(`  ──────────────────────────────────────────────`);
    if (tenant.direccion?.direccion) {
      console.log(`  Dirección:        ${tenant.direccion.direccion}`);
    }
    if (tenant.contactoEmail) {
      console.log(`  Email:            ${tenant.contactoEmail}`);
    }
    if (tenant.contactoPhone) {
      console.log(`  Teléfono:         ${tenant.contactoPhone}`);
    }

    console.log(`\n  Configuración SUNAT`);
    console.log(`  ──────────────────────────────────────────────`);
    console.log(`  Certificado:      ${tenant.hasCertificate ? '✓ Instalado' : '✗ No instalado'}`);
    console.log(`  Credenciales:     ${tenant.hasSunatCredentials ? '✓ Configuradas' : '✗ No configuradas'}`);

    console.log(`\n  Límites`);
    console.log(`  ──────────────────────────────────────────────`);
    if (tenant.maxDocumentsPerMonth) {
      console.log(`  Max docs/mes:     ${tenant.maxDocumentsPerMonth}`);
    } else {
      console.log(`  Max docs/mes:     Sin límite`);
    }

    console.log(`\n  Metadata`);
    console.log(`  ──────────────────────────────────────────────`);
    console.log(`  Creado:           ${formatDateTime(tenant.createdAt)}`);
    console.log(`  Actualizado:      ${formatDateTime(tenant.updatedAt)}`);

    console.log('\n' + '═'.repeat(60));
  } catch (error) {
    if (error instanceof CLIError) {
      throw error;
    }
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        throw new CLIError(
          `Tenant not found: ${options.id}`,
          'TENANT_NOT_FOUND'
        );
      }
      throw new CLIError(
        `Failed to get tenant: ${error.message}`,
        'GET_TENANT_ERROR'
      );
    }
    throw error;
  }
}

// ============================================================================
// Tenant Update Command
// ============================================================================

export interface UpdateTenantOptions {
  id: string;
  razonSocial?: string;
  nombreComercial?: string;
  direccion?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  interactive?: boolean;
}

export async function updateTenant(options: UpdateTenantOptions): Promise<void> {
  const client = requireAdminAuth();

  if (!options.id) {
    throw new CLIError('Tenant ID is required', 'MISSING_REQUIRED_FIELD');
  }

  console.log(`Fetching tenant ${options.id}...`);

  try {
    // Get current tenant data
    const currentTenant = await client.tenants.get(options.id);

    let updateData: {
      razonSocial?: string;
      nombreComercial?: string;
      direccion?: { direccion: string };
      contactoEmail?: string;
      contactoPhone?: string;
      isActive?: boolean;
    };

    if (options.interactive) {
      updateData = await promptForTenantUpdateData(currentTenant);
    } else {
      // Build update data from flags
      updateData = {};
      if (options.razonSocial !== undefined) updateData.razonSocial = options.razonSocial;
      if (options.nombreComercial !== undefined) updateData.nombreComercial = options.nombreComercial;
      if (options.direccion !== undefined) updateData.direccion = options.direccion ? { direccion: options.direccion } : undefined;
      if (options.email !== undefined) updateData.contactoEmail = options.email;
      if (options.phone !== undefined) updateData.contactoPhone = options.phone;
      if (options.isActive !== undefined) updateData.isActive = options.isActive;

      if (Object.keys(updateData).length === 0) {
        console.log('\nNo changes specified. Use --interactive or provide fields to update.');
        return;
      }
    }

    console.log('\nUpdating tenant...');

    const tenant = await client.tenants.update(options.id, updateData);

    console.log('\n✓ Tenant updated successfully!');
    console.log(`  ID:               ${tenant.id}`);
    console.log(`  RUC:              ${tenant.ruc}`);
    console.log(`  Razón Social:     ${tenant.razonSocial}`);
    if (tenant.nombreComercial) {
      console.log(`  Nombre Comercial: ${tenant.nombreComercial}`);
    }
    console.log(`  Activo:           ${tenant.isActive ? 'Sí' : 'No'}`);
  } catch (error) {
    if (error instanceof CLIError) {
      throw error;
    }
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        throw new CLIError(
          `Tenant not found: ${options.id}`,
          'TENANT_NOT_FOUND'
        );
      }
      throw new CLIError(
        `Failed to update tenant: ${error.message}`,
        'UPDATE_TENANT_ERROR'
      );
    }
    throw error;
  }
}

// ============================================================================
// Interactive Mode - Prompt for update data
// ============================================================================

interface TenantUpdateData {
  razonSocial?: string;
  nombreComercial?: string;
  direccion?: { direccion: string };
  contactoEmail?: string;
  contactoPhone?: string;
}

async function promptForTenantUpdateData(currentTenant: Tenant): Promise<TenantUpdateData> {
  const rl = createReadline();

  return new Promise((resolve) => {
    const updateData: TenantUpdateData = {};

    console.log('\nLeave empty to keep current value.\n');

    const questions = [
      {
        key: 'razonSocial' as const,
        prompt: 'Razón Social',
        current: currentTenant.razonSocial,
      },
      {
        key: 'nombreComercial' as const,
        prompt: 'Nombre Comercial',
        current: currentTenant.nombreComercial || '',
      },
      {
        key: 'direccion' as const,
        prompt: 'Dirección',
        current: currentTenant.direccion?.direccion || '',
        transform: (v: string) => v ? { direccion: v } : undefined,
      },
      {
        key: 'contactoEmail' as const,
        prompt: 'Email de contacto',
        current: currentTenant.contactoEmail || '',
      },
      {
        key: 'contactoPhone' as const,
        prompt: 'Teléfono de contacto',
        current: currentTenant.contactoPhone || '',
      },
    ];

    let questionIndex = 0;

    const askNext = () => {
      if (questionIndex >= questions.length) {
        rl.close();
        resolve(updateData);
        return;
      }

      const q = questions[questionIndex];
      questionIndex++;

      rl.question(`${q.prompt} [${q.current || 'empty'}]: `, (answer) => {
        const trimmedAnswer = answer.trim();

        if (trimmedAnswer) {
          const value = q.transform ? q.transform(trimmedAnswer) : trimmedAnswer;
          (updateData as Record<string, unknown>)[q.key] = value;
        }

        askNext();
      });
    };

    askNext();
  });
}

// ============================================================================
// Tenant Create Command
// ============================================================================

export interface CreateTenantOptions {
  ruc?: string;
  razonSocial?: string;
  nombreComercial?: string;
  direccion?: string;
  email?: string;
  phone?: string;
  interactive?: boolean;
}

export async function createTenant(options: CreateTenantOptions = {}): Promise<void> {
  const client = requireAdminAuth();
  let input: CreateTenantInput;

  if (options.interactive || (!options.ruc && !options.razonSocial)) {
    // Interactive mode
    input = await promptForTenantData();
  } else {
    // Flags mode - validate required fields
    if (!options.ruc) {
      throw new CLIError('RUC is required. Use --ruc flag or run in interactive mode.', 'MISSING_REQUIRED_FIELD');
    }
    if (!options.razonSocial) {
      throw new CLIError('Razón Social is required. Use --razon-social flag or run in interactive mode.', 'MISSING_REQUIRED_FIELD');
    }

    // Validate RUC
    const rucValidation = validateRuc(options.ruc) as unknown as RucValidationResult;
    if (!rucValidation.isValid) {
      throw new CLIError(`Invalid RUC: ${rucValidation.error}`, 'INVALID_RUC');
    }

    input = {
      ruc: options.ruc,
      razonSocial: options.razonSocial,
      nombreComercial: options.nombreComercial,
      direccion: options.direccion ? { direccion: options.direccion } : undefined,
      contactoEmail: options.email,
      contactoPhone: options.phone,
    };
  }

  console.log('\nCreating tenant...');
  console.log(`  RUC: ${input.ruc}`);
  console.log(`  Razón Social: ${input.razonSocial}`);

  try {
    const tenant = await client.tenants.create(input);

    console.log('\n✓ Tenant created successfully!');
    console.log(`  ID: ${tenant.id}`);
    console.log(`  RUC: ${tenant.ruc}`);
    console.log(`  Razón Social: ${tenant.razonSocial}`);
    console.log(`  Activo: ${tenant.isActive ? 'Sí' : 'No'}`);
    console.log(`  Certificate: ${tenant.hasCertificate ? 'Sí' : 'No'}`);
    console.log(`  SUNAT Credentials: ${tenant.hasSunatCredentials ? 'Sí' : 'No'}`);

    // If we have a tenantId in config, prompt to update it
    const config = loadConfig();
    if (!config.tenantId) {
      console.log('\nNote: You can set this tenant as default with:');
      console.log(`  facturin config set tenantId ${tenant.id}`);
    }
  } catch (error) {
    if (error instanceof CLIError) {
      throw error;
    }
    // Handle validation errors from SDK
    if (error instanceof Error && error.name === 'ValidationError') {
      throw new CLIError(`Validation error: ${error.message}`, 'VALIDATION_ERROR');
    }
    if (error instanceof Error) {
      throw new CLIError(`Failed to create tenant: ${error.message}`, 'CREATE_TENANT_ERROR');
    }
    throw error;
  }
}

// ============================================================================
// Interactive Mode - Prompt for data
// ============================================================================

async function promptForTenantData(): Promise<CreateTenantInput> {
  const rl = createReadline();

  return new Promise((resolve, reject) => {
    const input: CreateTenantInput = {
      ruc: '',
      razonSocial: '',
    };

    const questions: Array<{ key: keyof CreateTenantInput; prompt: string; validate?: (v: string) => boolean }> = [
      {
        key: 'ruc',
        prompt: 'Ingrese RUC (11 dígitos): ',
        validate: (v) => {
          const validation = validateRuc(v) as unknown as RucValidationResult;
          if (!validation.isValid) {
            console.log(`  ✗ ${validation.error}`);
            return false;
          }
          return true;
        }
      },
      { key: 'razonSocial', prompt: 'Ingrese Razón Social: ' },
      { key: 'nombreComercial', prompt: 'Ingrese Nombre Comercial (opcional): ' },
      { key: 'direccion', prompt: 'Ingrese Dirección (opcional): ' },
      { key: 'contactoEmail', prompt: 'Ingrese Email de contacto (opcional): ' },
      { key: 'contactoPhone', prompt: 'Ingrese Teléfono de contacto (opcional): ' },
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

        // For required fields, ensure we have answers
        if (q.key === 'ruc' || q.key === 'razonSocial') {
          if (!trimmedAnswer) {
            console.log('  ✗ Este campo es requerido');
            askNext(); // Retry
            return;
          }
        }

        if (trimmedAnswer) {
          if (q.key === 'ruc') {
            input.ruc = trimmedAnswer;
          } else if (q.key === 'razonSocial') {
            input.razonSocial = trimmedAnswer;
          } else if (q.key === 'nombreComercial') {
            input.nombreComercial = trimmedAnswer;
          } else if (q.key === 'direccion') {
            input.direccion = { direccion: trimmedAnswer };
          } else if (q.key === 'contactoEmail') {
            input.contactoEmail = trimmedAnswer;
          } else if (q.key === 'contactoPhone') {
            input.contactoPhone = trimmedAnswer;
          }
        }

        askNext();
      });
    };

    rl.on('close', () => {
      // Ensure required fields are present
      if (!input.ruc || !input.razonSocial) {
        reject(new CLIError('RUC and Razón Social are required', 'MISSING_REQUIRED_FIELDS'));
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

function formatTable(rows: string[][]): string {
  if (rows.length === 0) return '';

  // Calculate column widths
  const colWidths = rows[0].map((_, colIndex) => {
    return Math.max(...rows.map(row => (row[colIndex] || '').length));
  });

  // Format each row
  const formattedRows = rows.map((row, rowIndex) => {
    const cells = row.map((cell, colIndex) => {
      const width = colWidths[colIndex];
      const content = cell || '';
      if (rowIndex === 0) {
        // Header row - center align
        return content.padStart(Math.floor((width - content.length) / 2) + content.length).padEnd(width);
      }
      // Data rows - left align
      return content.padEnd(width);
    });
    return '│ ' + cells.join(' │ ') + ' │';
  });

  // Calculate table width
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

// ============================================================================
// Parse Command Options
// ============================================================================

export interface ParseTenantListOptionsResult {
  subcommand: 'list';
  options: ListTenantsOptions;
}

export interface ParseTenantCreateOptionsResult {
  subcommand: 'create';
  options: CreateTenantOptions;
}

export type TenantCommandResult = ParseTenantListOptionsResult | ParseTenantCreateOptionsResult;

export function parseTenantCommand(args: string[]): TenantCommandResult {
  const subcommand = args[0];

  if (subcommand === 'list') {
    const options: ListTenantsOptions = {};

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--search':
        case '-s':
          options.search = args[++i];
          break;
        case '--limit':
        case '-l':
          options.limit = parseInt(args[++i], 10);
          break;
        case '--offset':
        case '-o':
          options.offset = parseInt(args[++i], 10);
          break;
        case '--help':
        case '-h':
          printTenantsListHelp();
          process.exit(0);
          break;
      }
    }

    return { subcommand: 'list', options };
  }

  if (subcommand === 'create') {
    const options: CreateTenantOptions = {};

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--ruc':
        case '-r':
          options.ruc = args[++i];
          break;
        case '--razon-social':
        case '-n':
          options.razonSocial = args[++i];
          break;
        case '--nombre-comercial':
        case '-c':
          options.nombreComercial = args[++i];
          break;
        case '--direccion':
        case '-d':
          options.direccion = args[++i];
          break;
        case '--email':
        case '-e':
          options.email = args[++i];
          break;
        case '--phone':
        case '-p':
          options.phone = args[++i];
          break;
        case '--interactive':
        case '-i':
          options.interactive = true;
          break;
        case '--help':
        case '-h':
          printTenantsCreateHelp();
          process.exit(0);
          break;
      }
    }

    return { subcommand: 'create', options };
  }

  // Default to list if no subcommand
  if (!subcommand) {
    return { subcommand: 'list', options: {} };
  }

  throw new CLIError(
    `Unknown tenant subcommand: ${subcommand}. Use "list" or "create".`,
    'UNKNOWN_SUBCOMMAND'
  );
}

export function printTenantsListHelp(): void {
  console.log(`
Usage: facturin tenants list [options]

List all tenants.

Options:
  -s, --search <query>    Search tenants by name or RUC
  -l, --limit <number>     Limit number of results (default: 50)
  -o, --offset <number>    Offset for pagination (default: 0)
  -h, --help               Show this help message

Examples:
  facturin tenants list
  facturin tenants list --search "Acme"
  facturin tenants list --limit 10 --offset 20
`);
}

export function printTenantsCreateHelp(): void {
  console.log(`
Usage: facturin tenants create [options]

Create a new tenant.

Options:
  -r, --ruc <number>          RUC (11 digits, required unless --interactive)
  -n, --razon-social <name>   Business name (required unless --interactive)
  -c, --nombre-comercial <name>  Commercial name (optional)
  -d, --direccion <address>   Address (optional)
  -e, --email <email>         Contact email (optional)
  -p, --phone <phone>         Contact phone (optional)
  -i, --interactive           Run in interactive mode
  -h, --help                  Show this help message

Examples:
  facturin tenants create --ruc 12345678901 --razon-social "Acme SAC"
  facturin tenants create --interactive
`);
}

export function printTenantsHelp(): void {
  console.log(`
Usage: facturin tenants <subcommand> [options]

Manage tenants.

Subcommands:
  list        List all tenants
  create      Create a new tenant

Options:
  -h, --help  Show this help message

Examples:
  facturin tenants list
  facturin tenants create --ruc 12345678901 --razon-social "Acme SAC"
  facturin tenants create --interactive
`);
}
