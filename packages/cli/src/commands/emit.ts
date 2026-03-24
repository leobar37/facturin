import * as readline from 'node:readline';
import { existsSync, readFileSync } from 'node:fs';
import { requireAuth, CLIError } from './auth.js';
import type {
  CreateComprobanteInput,
  TipoComprobante,
} from '@facturin/sdk';

// ============================================================================
// Types
// ============================================================================

export interface EmitOptions {
  tipoComprobante?: TipoComprobante;
  file?: string;
  interactive?: boolean;
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
// Emit Command
// ============================================================================

export async function emitFactura(options: EmitOptions = {}): Promise<void> {
  const client = requireAuth();
  let input: CreateComprobanteInput;

  // Determine the document type
  const tipoComprobante = options.tipoComprobante || '01';

  if (options.file) {
    // File mode - read JSON from file
    input = await readJsonFile(options.file);
    input.tipoComprobante = tipoComprobante;
  } else if (options.interactive || (!options.file && !options.tipoComprobante)) {
    // Interactive mode or default (no file provided)
    input = await promptForComprobanteData(tipoComprobante);
  } else {
    throw new CLIError(
      'Either --file or --interactive is required',
      'MISSING_OPTION'
    );
  }

  console.log('\nCreando comprobante...');
  console.log(`  Tipo: ${input.tipoComprobante} (${TIPO_COMPROBANTE_LABELS[input.tipoComprobante] || 'Unknown'})`);
  console.log(`  Serie: ${input.serie}`);
  console.log(`  Cliente: ${input.clienteNombre} (${input.clienteTipoDocumento}: ${input.clienteNumeroDocumento})`);
  console.log(`  Detalles: ${input.detalles.length} item(s)`);

  try {
    const comprobante = await client.comprobantes.create(input);

    console.log('\n✓ Comprobante creado exitosamente!');
    console.log(`  ID: ${comprobante.id}`);
    console.log(`  Tipo: ${comprobante.tipoComprobante} (${TIPO_COMPROBANTE_LABELS[comprobante.tipoComprobante] || 'Unknown'})`);
    console.log(`  Número: ${comprobante.serie}-${String(comprobante.numero).padStart(8, '0')}`);
    console.log(`  Cliente: ${comprobante.clienteNombre}`);
    console.log(`  Total: S/ ${comprobante.totalImporte.toFixed(2)}`);
    console.log(`  Estado: ${comprobante.sunatEstado}`);
  } catch (error) {
    if (error instanceof CLIError) {
      throw error;
    }
    // Handle validation errors from SDK
    if (error instanceof Error && error.name === 'ValidationError') {
      throw new CLIError(`Validation error: ${error.message}`, 'VALIDATION_ERROR');
    }
    if (error instanceof Error) {
      throw new CLIError(`Failed to create comprobante: ${error.message}`, 'CREATE_COMPROBANTE_ERROR');
    }
    throw error;
  }
}

// ============================================================================
// JSON File Reader
// ============================================================================

function readJsonFile(filePath: string): CreateComprobanteInput {
  if (!existsSync(filePath)) {
    throw new CLIError(`File not found: ${filePath}`, 'FILE_NOT_FOUND');
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content) as CreateComprobanteInput;

    // Validate required fields
    validateComprobanteInput(data);

    return data;
  } catch (error) {
    if (error instanceof CLIError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new CLIError(`Invalid JSON in file: ${error.message}`, 'INVALID_JSON');
    }
    throw new CLIError(`Failed to read file: ${(error as Error).message}`, 'FILE_READ_ERROR');
  }
}

function validateComprobanteInput(input: CreateComprobanteInput): void {
  if (!input.serie) {
    throw new CLIError('Field "serie" is required in JSON', 'MISSING_REQUIRED_FIELD');
  }
  if (!input.clienteTipoDocumento) {
    throw new CLIError('Field "clienteTipoDocumento" is required in JSON', 'MISSING_REQUIRED_FIELD');
  }
  if (!input.clienteNumeroDocumento) {
    throw new CLIError('Field "clienteNumeroDocumento" is required in JSON', 'MISSING_REQUIRED_FIELD');
  }
  if (!input.clienteNombre) {
    throw new CLIError('Field "clienteNombre" is required in JSON', 'MISSING_REQUIRED_FIELD');
  }
  if (!input.detalles || input.detalles.length === 0) {
    throw new CLIError('Field "detalles" is required and must have at least one item in JSON', 'MISSING_REQUIRED_FIELD');
  }

  // Validate each detalle
  for (let i = 0; i < input.detalles.length; i++) {
    const detalle = input.detalles[i];
    if (!detalle.descripcion) {
      throw new CLIError(`detalles[${i}].descripcion is required`, 'MISSING_REQUIRED_FIELD');
    }
    if (detalle.cantidad === undefined || detalle.cantidad <= 0) {
      throw new CLIError(`detalles[${i}].cantidad must be greater than 0`, 'INVALID_FIELD');
    }
    if (detalle.precioUnitario === undefined || detalle.precioUnitario < 0) {
      throw new CLIError(`detalles[${i}].precioUnitario is required and must be non-negative`, 'INVALID_FIELD');
    }
  }
}

// ============================================================================
// Interactive Mode - Prompt for data
// ============================================================================

const VALID_CLIENT_TIPOS: Record<string, string> = {
  '0': 'Sin documento',
  '1': 'DNI',
  '4': 'Carnet de Extranjería',
  '6': 'RUC',
  '7': 'Pasaporte',
  'A': 'Cédula Diplomatica de Identidad',
};

async function promptForComprobanteData(tipoComprobante: TipoComprobante): Promise<CreateComprobanteInput> {
  const rl = createReadline();

  try {
    // Phase 1: Get serie
    console.log('\n--- Datos del Comprobante ---');
    const serie = await questionAsync(rl, 'Serie (ej: F001): ', (v) => {
      if (!/^[A-Z0-9]{4}$/.test(v.toUpperCase())) {
        return 'La serie debe ser 4 caracteres alfanuméricos mayúsculos (A-Z, 0-9)';
      }
      return null;
    });

    // Phase 2: Get client info
    console.log('\n--- Datos del Cliente ---');
    console.log('Tipos de documento:');
    Object.entries(VALID_CLIENT_TIPOS).forEach(([code, label]) => {
      console.log(`  ${code} - ${label}`);
    });

    const clienteTipoDocumento = await questionAsync(rl, 'Tipo de documento: ', (v) => {
      if (!/^[01467A]$/.test(v.toUpperCase())) {
        return `Tipo inválido. Debe ser uno de: ${Object.keys(VALID_CLIENT_TIPOS).join(', ')}`;
      }
      return null;
    });

    const clienteNumeroDocumento = await questionAsync(rl, 'Número de documento: ', (v) => {
      if (!v.trim()) return 'Este campo es requerido';
      return null;
    });

    const clienteNombre = await questionAsync(rl, 'Nombre/Razón Social: ', (v) => {
      if (!v.trim()) return 'Este campo es requerido';
      return null;
    });

    const clienteDireccion = await questionAsync(rl, 'Dirección (opcional): ');

    // Phase 3: Get details
    console.log('\n--- Detalles del Comprobante ---');
    const detalles: CreateComprobanteInput['detalles'] = [];

    let addMore = true;
    while (addMore) {
      console.log(`\nItem ${detalles.length + 1}:`);

      const descripcion = await questionAsync(rl, '  Descripción: ', (v) => {
        if (!v.trim()) return 'Este campo es requerido';
        return null;
      });

      const cantidadStr = await questionAsync(rl, '  Cantidad: ', (v) => {
        const n = parseFloat(v);
        if (isNaN(n) || n <= 0) return 'Debe ser un número mayor a 0';
        return null;
      });

      const precioStr = await questionAsync(rl, '  Precio Unitario (sin IGV): ', (v) => {
        const n = parseFloat(v);
        if (isNaN(n) || n < 0) return 'Debe ser un número no negativo';
        return null;
      });

      detalles.push({
        descripcion: descripcion.trim(),
        cantidad: parseFloat(cantidadStr),
        precioUnitario: parseFloat(precioStr),
      });

      const more = await questionAsync(rl, '¿Agregar otro item? (s/n): ');
      addMore = /^s|si|y|yes$/i.test(more.trim());
    }

    rl.close();

    return {
      tipoComprobante,
      serie: serie.toUpperCase(),
      clienteTipoDocumento: clienteTipoDocumento.toUpperCase(),
      clienteNumeroDocumento: clienteNumeroDocumento.trim(),
      clienteNombre: clienteNombre.trim(),
      clienteDireccion: clienteDireccion.trim() || undefined,
      detalles,
    };
  } catch (error) {
    rl.close();
    throw error;
  }
}

function questionAsync(
  rl: readline.Interface,
  prompt: string,
  validate?: (v: string) => string | null
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      const trimmed = answer.trim();
      if (validate) {
        const error = validate(trimmed);
        if (error) {
          console.log(`  ✗ ${error}`);
          questionAsync(rl, prompt, validate).then(resolve);
          return;
        }
      }
      resolve(answer);
    });
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

// ============================================================================
// Parse Command Options
// ============================================================================

export interface ParseEmitOptionsResult {
  tipoComprobante: TipoComprobante;
  file?: string;
  interactive: boolean;
}

export function parseEmitCommand(args: string[]): ParseEmitOptionsResult {
  let tipoComprobante: TipoComprobante = '01'; // Default to Factura
  let file: string | undefined;
  let interactive = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--file':
      case '-f':
        file = args[++i];
        break;
      case '--interactive':
      case '-i':
        interactive = true;
        break;
      case '--tipo-comprobante':
      case '-t': {
        const tipo = args[++i];
        if (!tipo || !/^(01|03|07|08|09|20|40)$/.test(tipo)) {
          throw new CLIError(
            'Tipo de comprobante must be one of: 01, 03, 07, 08, 09, 20, 40',
            'INVALID_TIPO_COMPROBANTE'
          );
        }
        tipoComprobante = tipo as TipoComprobante;
        break;
      }
      case '--help':
      case '-h':
        printEmitHelp();
        process.exit(0);
        break;
    }
  }

  return { tipoComprobante, file, interactive };
}

export function printEmitHelp(): void {
  console.log(`
Usage: facturin emit [options]

Emit a comprobante (invoice/receipt).

Options:
  -t, --tipo-comprobante <code>   Document type (01, 03, 07, 08, 09, 20, 40) (default: 01)
  -f, --file <path>               Path to JSON file with comprobante data
  -i, --interactive              Run in interactive mode
  -h, --help                     Show this help message

Document Types:
  01 - Factura
  03 - Boleta
  07 - Nota de Crédito
  08 - Nota de Débito
  09 - Guía de Remisión
  20 - Nota de Crédito (otro)
  40 - Comprobante de Percepción

JSON File Format:
{
  "serie": "F001",
  "clienteTipoDocumento": "6",
  "clienteNumeroDocumento": "12345678901",
  "clienteNombre": "Empresa ABC SAC",
  "clienteDireccion": "Av. Lima 123, Lima",
  "detalles": [
    {
      "descripcion": "Producto A",
      "cantidad": 2,
      "precioUnitario": 100.00
    }
  ]
}

Examples:
  facturin emit --file factura.json
  facturin emit --tipo-comprobante 03 --file boleta.json
  facturin emit --interactive
`);
}

export function printEmitFacturaHelp(): void {
  printEmitHelp();
}
