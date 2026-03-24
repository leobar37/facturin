import * as readline from 'node:readline';
import { requireAuth, CLIError } from './auth.js';
import type { CreateSerieInput, Serie, TipoComprobante } from '@facturin/sdk';

// ============================================================================
// Types
// ============================================================================

export interface ListSeriesOptions {
  tipoComprobante?: TipoComprobante;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

interface ListSeriesResult {
  series: Serie[];
  total: number;
  limit: number;
  offset: number;
}

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

// ============================================================================
// Series List Command
// ============================================================================

export async function listSeries(options: ListSeriesOptions = {}): Promise<void> {
  const client = requireAuth();

  console.log('Fetching series...');

  try {
    const result = await (client.series.list as any)(options) as ListSeriesResult;

    if (result.series.length === 0) {
      console.log('\nNo series found.');
      return;
    }

    // Print table header
    console.log('\n' + formatTable([
      ['ID', 'Tipo', 'Serie', 'Correlativo', 'Activo'],
      ...result.series.map((s: Serie) => [
        s.id.substring(0, 8) + '...',
        TIPO_COMPROBANTE_LABELS[s.tipoComprobante] || s.tipoComprobante,
        s.serie,
        String(s.correlativoActual).padStart(8, '0'),
        s.isActive ? '✓' : '✗',
      ])
    ]));

    console.log(`\nTotal: ${result.series.length} series(s)`);
  } catch (error) {
    if (error instanceof CLIError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new CLIError(`Failed to list series: ${error.message}`, 'LIST_SERIES_ERROR');
    }
    throw error;
  }
}

// ============================================================================
// Series Create Command
// ============================================================================

export interface CreateSeriesOptions {
  tipoComprobante?: TipoComprobante;
  serie?: string;
  interactive?: boolean;
}

export async function createSeries(options: CreateSeriesOptions = {}): Promise<void> {
  const client = requireAuth();
  let input: CreateSerieInput;

  if (options.interactive || (!options.tipoComprobante && !options.serie)) {
    // Interactive mode
    input = await promptForSeriesData();
  } else {
    // Flags mode - validate required fields
    if (!options.tipoComprobante) {
      throw new CLIError(
        'Tipo de comprobante is required. Use --tipo-comprobante flag or run in interactive mode.',
        'MISSING_REQUIRED_FIELD'
      );
    }
    if (!options.serie) {
      throw new CLIError(
        'Serie is required. Use --serie flag or run in interactive mode.',
        'MISSING_REQUIRED_FIELD'
      );
    }

    input = {
      tipoComprobante: options.tipoComprobante,
      serie: options.serie.toUpperCase(),
    };
  }

  console.log('\nCreating series...');
  console.log(`  Tipo: ${input.tipoComprobante} (${TIPO_COMPROBANTE_LABELS[input.tipoComprobante] || 'Unknown'})`);
  console.log(`  Serie: ${input.serie}`);

  try {
    const serie = await client.series.create(input);

    console.log('\n✓ Series created successfully!');
    console.log(`  ID: ${serie.id}`);
    console.log(`  Tipo: ${serie.tipoComprobante} (${TIPO_COMPROBANTE_LABELS[serie.tipoComprobante] || 'Unknown'})`);
    console.log(`  Serie: ${serie.serie}`);
    console.log(`  Correlativo Actual: ${serie.correlativoActual}`);
    console.log(`  Activo: ${serie.isActive ? 'Sí' : 'No'}`);
  } catch (error) {
    if (error instanceof CLIError) {
      throw error;
    }
    // Handle validation errors from SDK
    if (error instanceof Error && error.name === 'ValidationError') {
      throw new CLIError(`Validation error: ${error.message}`, 'VALIDATION_ERROR');
    }
    if (error instanceof Error) {
      throw new CLIError(`Failed to create series: ${error.message}`, 'CREATE_SERIES_ERROR');
    }
    throw error;
  }
}

// ============================================================================
// Interactive Mode - Prompt for data
// ============================================================================

const VALID_TIPOS: TipoComprobante[] = ['01', '03', '07', '08', '09', '20', '40'];

async function promptForSeriesData(): Promise<CreateSerieInput> {
  const rl = createReadline();

  return new Promise((resolve, reject) => {
    const input: CreateSerieInput = {
      tipoComprobante: '01',
      serie: '',
    };

    // Show available types
    console.log('\nAvailable document types:');
    VALID_TIPOS.forEach((tipo) => {
      console.log(`  ${tipo} - ${TIPO_COMPROBANTE_LABELS[tipo]}`);
    });
    console.log('');

    const questions: Array<{ key: keyof CreateSerieInput; prompt: string; validate?: (v: string) => boolean }> = [
      {
        key: 'tipoComprobante',
        prompt: 'Ingrese tipo de comprobante (01, 03, 07, 08, 09, 20, 40): ',
        validate: (v) => {
          if (!VALID_TIPOS.includes(v as TipoComprobante)) {
            console.log(`  ✗ Tipo inválido. Debe ser uno de: ${VALID_TIPOS.join(', ')}`);
            return false;
          }
          return true;
        }
      },
      {
        key: 'serie',
        prompt: 'Ingrese serie (4 caracteres alfanuméricos mayúsculos, ej: F001, B001): ',
        validate: (v) => {
          if (!/^[A-Z0-9]{4}$/.test(v)) {
            console.log('  ✗ La serie debe ser 4 caracteres alfanuméricos mayúsculos (A-Z, 0-9)');
            return false;
          }
          return true;
        }
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
        const trimmedAnswer = answer.trim().toUpperCase();

        if (q.key === 'tipoComprobante') {
          if (!trimmedAnswer) {
            console.log('  ✗ Este campo es requerido');
            askNext(); // Retry
            return;
          }
          input.tipoComprobante = trimmedAnswer as TipoComprobante;
        } else if (q.key === 'serie') {
          if (!trimmedAnswer) {
            console.log('  ✗ Este campo es requerido');
            askNext(); // Retry
            return;
          }
          input.serie = trimmedAnswer;
        }

        // Validate if validator exists
        if (q.validate && !q.validate(trimmedAnswer)) {
          askNext(); // Retry
          return;
        }

        askNext();
      });
    };

    rl.on('close', () => {
      // Ensure required fields are present
      if (!input.tipoComprobante || !input.serie) {
        reject(new CLIError('Tipo de comprobante and Serie are required', 'MISSING_REQUIRED_FIELDS'));
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

export interface ParseSeriesListOptionsResult {
  subcommand: 'list';
  options: ListSeriesOptions;
}

export interface ParseSeriesCreateOptionsResult {
  subcommand: 'create';
  options: CreateSeriesOptions;
}

export type SeriesCommandResult = ParseSeriesListOptionsResult | ParseSeriesCreateOptionsResult;

export function parseSeriesCommand(args: string[]): SeriesCommandResult {
  const subcommand = args[0];

  if (subcommand === 'list') {
    const options: ListSeriesOptions = {};

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case '--tipo-comprobante':
        case '-t':
          options.tipoComprobante = args[++i] as TipoComprobante;
          break;
        case '--active':
        case '-a':
          options.isActive = args[++i] === 'true';
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
          printSeriesListHelp();
          process.exit(0);
          break;
      }
    }

    return { subcommand: 'list', options };
  }

  if (subcommand === 'create') {
    const options: CreateSeriesOptions = {};

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
        case '--interactive':
        case '-i':
          options.interactive = true;
          break;
        case '--help':
        case '-h':
          printSeriesCreateHelp();
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
    `Unknown series subcommand: ${subcommand}. Use "list" or "create".`,
    'UNKNOWN_SUBCOMMAND'
  );
}

export function printSeriesListHelp(): void {
  console.log(`
Usage: facturin series list [options]

List all series for the current tenant.

Options:
  -t, --tipo-comprobante <code>   Filter by document type (01, 03, 07, 08, 09, 20, 40)
  -a, --active <true|false>       Filter by active status
  -l, --limit <number>             Limit number of results (default: 50)
  -o, --offset <number>            Offset for pagination (default: 0)
  -h, --help                       Show this help message

Document Types:
  01 - Factura
  03 - Boleta
  07 - Nota de Crédito
  08 - Nota de Débito
  09 - Guía de Remisión
  20 - Nota de Crédito (otro)
  40 - Comprobante de Percepción

Examples:
  facturin series list
  facturin series list --tipo-comprobante 01
  facturin series list --active true
`);
}

export function printSeriesCreateHelp(): void {
  console.log(`
Usage: facturin series create [options]

Create a new series for the current tenant.

Options:
  -t, --tipo-comprobante <code>   Document type (01, 03, 07, 08, 09, 20, 40) (required unless --interactive)
  -s, --serie <code>              Series code (4 uppercase alphanumeric, e.g., F001, B001) (required unless --interactive)
  -i, --interactive               Run in interactive mode
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
  facturin series create --tipo-comprobante 01 --serie F001
  facturin series create --interactive
`);
}

export function printSeriesHelp(): void {
  console.log(`
Usage: facturin series <subcommand> [options]

Manage series for the current tenant.

Subcommands:
  list        List all series
  create      Create a new series

Options:
  -h, --help  Show this help message

Document Types:
  01 - Factura
  03 - Boleta
  07 - Nota de Crédito
  08 - Nota de Débito
  09 - Guía de Remisión
  20 - Nota de Crédito (otro)
  40 - Comprobante de Percepción

Examples:
  facturin series list
  facturin series list --tipo-comprobante 01
  facturin series create --tipo-comprobante 01 --serie F001
  facturin series create --interactive
`);
}
