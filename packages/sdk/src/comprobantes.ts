import type { FacturinClient } from './client.js';
import type {
  Comprobante,
  CreateComprobanteInput,
  TipoComprobante,
  ComprobanteEstado,
} from './types.js';
import { ValidationError } from './errors.js';

/**
 * Validates that tipoComprobante is one of the allowed values
 */
const VALID_TIPOS_COMPROBANTE: TipoComprobante[] = ['01', '03', '07', '08', '09', '20', '40'];

/**
 * Validates that the serie format is correct (4 uppercase alphanumeric characters)
 */
function validateSerieFormat(serie: string): { isValid: boolean; error?: string } {
  if (!serie) {
    return { isValid: false, error: 'Serie is required' };
  }

  if (!/^[A-Z0-9]{4}$/.test(serie)) {
    return {
      isValid: false,
      error: 'Serie must be 4 uppercase alphanumeric characters (A-Z, 0-9)',
    };
  }

  return { isValid: true };
}

/**
 * Validates clienteTipoDocumento format
 * Allowed values: 0-6 or A
 */
function validateClienteTipoDocumento(
  tipo: string
): { isValid: boolean; error?: string } {
  if (!tipo) {
    return { isValid: false, error: 'Cliente tipo documento is required' };
  }

  if (!/^[0-6A]$/.test(tipo)) {
    return {
      isValid: false,
      error: 'Cliente tipo documento must be 0-6 or A',
    };
  }

  return { isValid: true };
}

export interface ListComprobantesOptions {
  tipoComprobante?: TipoComprobante;
  serie?: string;
  estado?: ComprobanteEstado;
  fechaDesde?: string;
  fechaHasta?: string;
  limit?: number;
  offset?: number;
}

export interface ListComprobantesResult {
  comprobantes: Comprobante[];
  total: number;
  limit: number;
  offset: number;
}

export class ComprobantesAPI {
  constructor(private readonly client: FacturinClient) {}

  /**
   * List all comprobantes for the current tenant
   */
  async list(options?: ListComprobantesOptions): Promise<ListComprobantesResult> {
    const params: Record<string, string | number | boolean | undefined> = {};

    if (options?.tipoComprobante !== undefined) {
      params.tipoComprobante = options.tipoComprobante;
    }
    if (options?.serie !== undefined) {
      params.serie = options.serie;
    }
    if (options?.estado !== undefined) {
      params.estado = options.estado;
    }
    if (options?.fechaDesde !== undefined) {
      params.fechaDesde = options.fechaDesde;
    }
    if (options?.fechaHasta !== undefined) {
      params.fechaHasta = options.fechaHasta;
    }
    if (options?.limit !== undefined) {
      params.limit = options.limit;
    }
    if (options?.offset !== undefined) {
      params.offset = options.offset;
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const comprobantes = await this.client.get<Comprobante[]>('/api/v1/comprobantes', {
      params,
    });

    return {
      comprobantes,
      total: comprobantes.length,
      limit,
      offset,
    };
  }

  /**
   * Get a comprobante by ID
   *
   * VAL-SDK-014: Comprobantes get retorna comprobante por ID
   */
  async get(id: string): Promise<Comprobante> {
    return this.client.get<Comprobante>(`/api/v1/comprobantes/${id}`);
  }

  /**
   * Create a new comprobante (invoice/receipt)
   *
   * VAL-SDK-012: Comprobantes create emite factura
   * VAL-SDK-013: Comprobantes create calcula totales correctamente
   *
   * Note: Totals are calculated automatically by the API based on the details.
   * The API calculates:
   * - totalGravadas: Sum of (cantidad * precioUnitario) for each detail
   * - totalIgv: 18% of totalGravadas
   * - totalImporte: totalGravadas + totalIgv
   */
  async create(input: CreateComprobanteInput): Promise<Comprobante> {
    // Validate tipoComprobante
    if (!input.tipoComprobante) {
      throw new ValidationError('tipoComprobante is required', [
        { field: 'tipoComprobante', message: 'tipoComprobante is required' },
      ]);
    }

    if (!VALID_TIPOS_COMPROBANTE.includes(input.tipoComprobante)) {
      throw new ValidationError(
        `Invalid tipoComprobante: ${input.tipoComprobante}. Must be one of: ${VALID_TIPOS_COMPROBANTE.join(', ')}`,
        [
          {
            field: 'tipoComprobante',
            message: `Must be one of: ${VALID_TIPOS_COMPROBANTE.join(', ')}`,
          },
        ]
      );
    }

    // Validate serie format
    const serieValidation = validateSerieFormat(input.serie);
    if (!serieValidation.isValid) {
      throw new ValidationError(`Invalid serie: ${serieValidation.error}`, [
        { field: 'serie', message: serieValidation.error || 'Invalid serie format' },
      ]);
    }

    // Validate clienteTipoDocumento
    const clienteTipoValidation = validateClienteTipoDocumento(
      input.clienteTipoDocumento
    );
    if (!clienteTipoValidation.isValid) {
      throw new ValidationError(
        `Invalid clienteTipoDocumento: ${clienteTipoValidation.error}`,
        [
          {
            field: 'clienteTipoDocumento',
            message: clienteTipoValidation.error || 'Invalid cliente tipo documento',
          },
        ]
      );
    }

    // Validate clienteNumeroDocumento
    if (!input.clienteNumeroDocumento || input.clienteNumeroDocumento.trim() === '') {
      throw new ValidationError('clienteNumeroDocumento is required', [
        {
          field: 'clienteNumeroDocumento',
          message: 'clienteNumeroDocumento is required',
        },
      ]);
    }

    // Validate clienteNombre
    if (!input.clienteNombre || input.clienteNombre.trim() === '') {
      throw new ValidationError('clienteNombre is required', [
        { field: 'clienteNombre', message: 'clienteNombre is required' },
      ]);
    }

    // Validate detalles
    if (!input.detalles || input.detalles.length === 0) {
      throw new ValidationError('At least one detalle is required', [
        { field: 'detalles', message: 'At least one detalle is required' },
      ]);
    }

    // Validate each detalle has required fields
    for (let i = 0; i < input.detalles.length; i++) {
      const detalle = input.detalles[i];

      if (!detalle.descripcion || detalle.descripcion.trim() === '') {
        throw new ValidationError(
          `Detalle ${i + 1}: descripcion is required`,
          [
            {
              field: `detalles[${i}].descripcion`,
              message: 'descripcion is required',
            },
          ]
        );
      }

      if (detalle.cantidad === undefined || detalle.cantidad <= 0) {
        throw new ValidationError(
          `Detalle ${i + 1}: cantidad must be greater than 0`,
          [
            {
              field: `detalles[${i}].cantidad`,
              message: 'cantidad must be greater than 0',
            },
          ]
        );
      }

      if (detalle.precioUnitario === undefined || detalle.precioUnitario < 0) {
        throw new ValidationError(
          `Detalle ${i + 1}: precioUnitario is required and must be non-negative`,
          [
            {
              field: `detalles[${i}].precioUnitario`,
              message: 'precioUnitario is required and must be non-negative',
            },
          ]
        );
      }
    }

    return this.client.post<Comprobante>('/api/v1/comprobantes', input);
  }

  /**
   * Cancel (anular) a comprobante
   * Only comprobantes with status "pendiente" can be cancelled
   */
  async cancel(id: string): Promise<{ id: string; sunatEstado: ComprobanteEstado }> {
    return this.client.delete<{ id: string; sunatEstado: ComprobanteEstado }>(
      `/api/v1/comprobantes/${id}`
    );
  }
}
