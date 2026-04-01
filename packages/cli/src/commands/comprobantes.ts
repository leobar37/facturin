import { requireAuth, CLIError } from './auth.js';
import type {
  Comprobante,
  TipoComprobante,
  ComprobanteEstado,
  ListComprobantesOptions,
} from '@facturin/sdk';

// ============================================================================
// Tipo Comprobante mapping for display
// ============================================================================

const TIPO_COMPROBANTE_LABELS: Record<TipoComprobante, string> = {
  '01': 'Factura',
  '03': 'Boleta',
  '07': 'Nota de Crédito',
  '08': 'Nota de Débito',
  '09': 'Guía de Remisión',
  '20': 'Nota de Crédito (otro)',
  '40': 'Comprobante de Percepción',
};

const ESTADO_LABELS: Record<ComprobanteEstado, string> = {
  'pendiente': '⏳ Pendiente',
  'enviado': '📤 Enviado',
  'aceptado': '✅ Aceptado',
  'rechazado': '❌ Rechazado',
  'anulado': '🚫 Anulado',
};

// ============================================================================
// Comprobantes List Command
// ============================================================================

export interface ListComprobantesCommandOptions {
  tipoComprobante?: TipoComprobante;
  serie?: string;
  estado?: ComprobanteEstado;
  fechaDesde?: string;
  fechaHasta?: string;
  limit?: number;
  offset?: number;
}

export async function listComprobantes(
  options: ListComprobantesCommandOptions = {}
): Promise<void> {
  const client = requireAuth();

  console.log('Fetching comprobantes...');

  try {
    const sdkOptions: ListComprobantesOptions = {
      tipoComprobante: options.tipoComprobante,
      serie: options.serie,
      estado: options.estado,
      fechaDesde: options.fechaDesde,
      fechaHasta: options.fechaHasta,
      limit: options.limit,
      offset: options.offset,
    };

    const result = await client.comprobantes.list(sdkOptions);

    if (result.comprobantes.length === 0) {
      console.log('\nNo comprobantes found.');
      return;
    }

    // Print table header
    console.log(
      '\n' +
        formatTable([
          ['Número', 'Fecha', 'Cliente', 'Total', 'Estado'],
          ...result.comprobantes.map((c: Comprobante) => [
            `${c.serie}-${String(c.numero).padStart(8, '0')}`,
            formatDate(c.fechaEmision),
            truncate(c.clienteNombre, 25),
            `S/ ${c.totalImporte}`,
            ESTADO_LABELS[c.sunatEstado] || c.sunatEstado,
          ]),
        ])
    );

    console.log(`\nTotal: ${result.comprobantes.length} comprobante(s)`);
    if (result.total > result.comprobantes.length) {
      console.log(`Showing ${result.comprobantes.length} of ${result.total}`);
    }
  } catch (error) {
    if (error instanceof CLIError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new CLIError(
        `Failed to list comprobantes: ${error.message}`,
        'LIST_COMPROBANTES_ERROR'
      );
    }
    throw error;
  }
}

// ============================================================================
// Comprobantes Get Command
// ============================================================================

export interface GetComprobanteOptions {
  id: string;
}

export async function getComprobante(options: GetComprobanteOptions): Promise<void> {
  const client = requireAuth();

  if (!options.id) {
    throw new CLIError('Comprobante ID is required', 'MISSING_REQUIRED_FIELD');
  }

  console.log(`Fetching comprobante ${options.id}...`);

  try {
    const comprobante = await client.comprobantes.get(options.id);

    console.log('\n' + '═'.repeat(60));
    console.log('  📄 COMPROBANTE');
    console.log('═'.repeat(60));

    // Header info
    console.log(`\n  Número:     ${comprobante.serie}-${String(comprobante.numero).padStart(8, '0')}`);
    console.log(`  Tipo:       ${TIPO_COMPROBANTE_LABELS[comprobante.tipoComprobante] || comprobante.tipoComprobante}`);
    console.log(`  Fecha:      ${formatDateTime(comprobante.fechaEmision)}`);
    console.log(`  Estado:     ${ESTADO_LABELS[comprobante.sunatEstado] || comprobante.sunatEstado}`);
    if (comprobante.sunatTicket) {
      console.log(`  Ticket:     ${comprobante.sunatTicket}`);
    }

    // Client info
    console.log(`\n  CLIENTE`);
    console.log(`  ──────────────────────────────────────────────`);
    console.log(`  Nombre:     ${comprobante.clienteNombre}`);
    console.log(`  Documento:  ${comprobante.clienteTipoDocumento} - ${comprobante.clienteNumeroDocumento}`);
    if (comprobante.clienteDireccion) {
      console.log(`  Dirección:  ${comprobante.clienteDireccion}`);
    }

    // Items
    console.log(`\n  DETALLES`);
    console.log(`  ──────────────────────────────────────────────`);
    comprobante.detalles.forEach((detalle, index) => {
      console.log(`  ${index + 1}. ${detalle.descripcion}`);
      console.log(`     Cantidad: ${detalle.cantidad} x S/ ${detalle.valorUnitario} = S/ ${detalle.subtotal}`);
    });

    // Totals
    console.log(`\n  TOTALES`);
    console.log(`  ──────────────────────────────────────────────`);
    console.log(`  Gravadas:   S/ ${comprobante.totalGravadas}`);
    console.log(`  IGV (18%):  S/ ${comprobante.totalIgv}`);
    console.log(`  Total:      S/ ${comprobante.totalImporte}`);

    // Metadata
    console.log(`\n  METADATA`);
    console.log(`  ──────────────────────────────────────────────`);
    console.log(`  ID:         ${comprobante.id}`);
    console.log(`  Hash:       ${comprobante.hash || 'N/A'}`);
    console.log(`  Creado:     ${formatDateTime(comprobante.createdAt)}`);

    console.log('\n' + '═'.repeat(60));
  } catch (error) {
    if (error instanceof CLIError) {
      throw error;
    }
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        throw new CLIError(
          `Comprobante not found: ${options.id}`,
          'COMPROBANTE_NOT_FOUND'
        );
      }
      throw new CLIError(
        `Failed to get comprobante: ${error.message}`,
        'GET_COMPROBANTE_ERROR'
      );
    }
    throw error;
  }
}

// ============================================================================
// Comprobantes Cancel Command
// ============================================================================

export interface CancelComprobanteOptions {
  id: string;
  force?: boolean;
}

export async function cancelComprobante(
  options: CancelComprobanteOptions
): Promise<void> {
  const client = requireAuth();

  if (!options.id) {
    throw new CLIError('Comprobante ID is required', 'MISSING_REQUIRED_FIELD');
  }

  console.log(`Fetching comprobante ${options.id}...`);

  try {
    // First get the comprobante to check its status
    const comprobante = await client.comprobantes.get(options.id);

    // Check if can be cancelled
    if (comprobante.sunatEstado === 'anulado') {
      console.log('\n⚠️  This comprobante is already cancelled.');
      return;
    }

    if (comprobante.sunatEstado !== 'pendiente') {
      console.log(`\n⚠️  Warning: This comprobante has status "${comprobante.sunatEstado}".`);
      console.log('   Only comprobantes with status "pendiente" can be cancelled via API.');
      console.log('   For other statuses, you may need to issue a nota de crédito.');

      if (!options.force) {
        console.log('\n   Use --force to attempt cancellation anyway.');
        return;
      }

      console.log('\n   Proceeding with cancellation (force mode)...');
    }

    console.log(`\nCancelling comprobante ${options.id}...`);

    const result = await client.comprobantes.cancel(options.id);

    console.log('\n✓ Comprobante cancelled successfully!');
    console.log(`  ID:     ${result.id}`);
    console.log(`  Estado: ${result.sunatEstado}`);
  } catch (error) {
    if (error instanceof CLIError) {
      throw error;
    }
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        throw new CLIError(
          `Comprobante not found: ${options.id}`,
          'COMPROBANTE_NOT_FOUND'
        );
      }
      throw new CLIError(
        `Failed to cancel comprobante: ${error.message}`,
        'CANCEL_COMPROBANTE_ERROR'
      );
    }
    throw error;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTable(rows: string[][]): string {
  if (rows.length === 0) return '';

  // Calculate column widths
  const colWidths = rows[0].map((_, colIndex) => {
    return Math.max(...rows.map((row) => (row[colIndex] || '').length));
  });

  // Format each row
  const formattedRows = rows.map((row, rowIndex) => {
    const cells = row.map((cell, colIndex) => {
      const width = colWidths[colIndex];
      const content = cell || '';
      if (rowIndex === 0) {
        // Header row - center align
        return content
          .padStart(Math.floor((width - content.length) / 2) + content.length)
          .padEnd(width);
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

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
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

export interface ParseComprobantesListResult {
  subcommand: 'list';
  options: ListComprobantesCommandOptions;
}

export interface ParseComprobantesGetResult {
  subcommand: 'get';
  options: GetComprobanteOptions;
}

export interface ParseComprobantesCancelResult {
  subcommand: 'cancel';
  options: CancelComprobanteOptions;
}

export type ComprobantesCommandResult =
  | ParseComprobantesListResult
  | ParseComprobantesGetResult
  | ParseComprobantesCancelResult;

export function parseComprobantesCommand(
  args: string[]
): ComprobantesCommandResult {
  const subcommand = args[0];

  if (subcommand === 'list') {
    const options: ListComprobantesCommandOptions = {};

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--tipo-comprobante':
        case '-t':
          options.tipoComprobante = args[++i] as TipoComprobante;
          break;
        case '--serie':
        case '-s':
          options.serie = args[++i];
          break;
        case '--estado':
        case '-e':
          options.estado = args[++i] as ComprobanteEstado;
          break;
        case '--fecha-desde':
        case '--from':
          options.fechaDesde = args[++i];
          break;
        case '--fecha-hasta':
        case '--to':
          options.fechaHasta = args[++i];
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
          printComprobantesListHelp();
          process.exit(0);
          break;
      }
    }

    return { subcommand: 'list', options };
  }

  if (subcommand === 'get') {
    const options: GetComprobanteOptions = { id: '' };

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--id':
          options.id = args[++i];
          break;
        case '--help':
        case '-h':
          printComprobantesGetHelp();
          process.exit(0);
          break;
        default:
          // If it's not a flag, treat it as the ID
          if (!arg.startsWith('-') && !options.id) {
            options.id = arg;
          }
          break;
      }
    }

    return { subcommand: 'get', options };
  }

  if (subcommand === 'cancel') {
    const options: CancelComprobanteOptions = { id: '' };

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
          printComprobantesCancelHelp();
          process.exit(0);
          break;
        default:
          // If it's not a flag, treat it as the ID
          if (!arg.startsWith('-') && !options.id) {
            options.id = arg;
          }
          break;
      }
    }

    return { subcommand: 'cancel', options };
  }

  // Default to list if no subcommand
  if (!subcommand) {
    return { subcommand: 'list', options: {} };
  }

  throw new CLIError(
    `Unknown comprobantes subcommand: ${subcommand}. Use "list", "get", or "cancel"`,
    'UNKNOWN_SUBCOMMAND'
  );
}

export function printComprobantesListHelp(): void {
  console.log(`
Usage: facturin comprobantes list [options]

List all comprobantes (invoices/receipts) for the current tenant.

Options:
  -t, --tipo-comprobante <code>   Filter by document type (01, 03, 07, 08, 09, 20, 40)
  -s, --serie <code>              Filter by series (e.g., F001)
  -e, --estado <status>           Filter by status (pendiente, enviado, aceptado, rechazado, anulado)
      --fecha-desde <date>        Filter from date (YYYY-MM-DD)
      --fecha-hasta <date>        Filter to date (YYYY-MM-DD)
  -l, --limit <number>            Limit number of results (default: 50)
  -o, --offset <number>           Offset for pagination (default: 0)
  -h, --help                      Show this help message

Document Types:
  01 - Factura
  03 - Boleta
  07 - Nota de Crédito
  08 - Nota de Débito
  09 - Guía de Remisión
  20 - Nota de Crédito (otro)
  40 - Comprobante de Percepción

Examples:
  facturin comprobantes list
  facturin comprobantes list --tipo-comprobante 01
  facturin comprobantes list --estado pendiente --limit 10
  facturin comprobantes list --fecha-desde 2024-01-01 --fecha-hasta 2024-12-31
`);
}

export function printComprobantesGetHelp(): void {
  console.log(`
Usage: facturin comprobantes get <id> [options]

Get detailed information about a specific comprobante.

Arguments:
  <id>                  Comprobante ID (UUID)

Options:
  -h, --help           Show this help message

Examples:
  facturin comprobantes get 550e8400-e29b-41d4-a716-446655440000
  facturin comprobantes get --id 550e8400-e29b-41d4-a716-446655440000
`);
}

export function printComprobantesCancelHelp(): void {
  console.log(`
Usage: facturin comprobantes cancel <id> [options]

Cancel (anular) a comprobante. Only comprobantes with status "pendiente" can be cancelled.

Arguments:
  <id>                  Comprobante ID (UUID)

Options:
  -f, --force          Force cancellation even if status is not "pendiente"
  -h, --help           Show this help message

Examples:
  facturin comprobantes cancel 550e8400-e29b-41d4-a716-446655440000
  facturin comprobantes cancel --id 550e8400-e29b-41d4-a716-446655440000 --force
`);
}

export function printComprobantesHelp(): void {
  console.log(`
Usage: facturin comprobantes <subcommand> [options]

Manage comprobantes (invoices/receipts) for the current tenant.

Subcommands:
  list        List all comprobantes
  get         Get details of a specific comprobante
  cancel      Cancel (anular) a comprobante

Options:
  -h, --help  Show this help message

Examples:
  facturin comprobantes list
  facturin comprobantes list --estado pendiente
  facturin comprobantes get 550e8400-e29b-41d4-a716-446655440000
  facturin comprobantes cancel 550e8400-e29b-41d4-a716-446655440000
`);
}
