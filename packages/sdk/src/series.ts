import type { FacturinClient } from './client.js';
import type { Serie, CreateSerieInput, TipoComprobante } from './types.js';
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

export interface ListSeriesOptions {
  tipoComprobante?: TipoComprobante;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface ListSeriesResult {
  series: Serie[];
  total: number;
  limit: number;
  offset: number;
}

export class SeriesAPI {
  constructor(private readonly client: FacturinClient) {}

  /**
   * List all series for the current tenant
   *
   * VAL-SDK-009: Series list retorna series del tenant
   */
  async list(options?: ListSeriesOptions): Promise<ListSeriesResult> {
    const params: Record<string, string | number | boolean | undefined> = {};

    if (options?.tipoComprobante !== undefined) {
      params.tipoComprobante = options.tipoComprobante;
    }
    if (options?.isActive !== undefined) {
      params.isActive = options.isActive;
    }
    if (options?.limit !== undefined) {
      params.limit = options.limit;
    }
    if (options?.offset !== undefined) {
      params.offset = options.offset;
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const series = await this.client.get<Serie[]>('/api/v1/series', {
      params,
    });

    // Filter by tipoComprobante if specified (since API doesn't support this filter)
    let filteredSeries = series;
    if (options?.tipoComprobante) {
      filteredSeries = series.filter(
        (s) => s.tipoComprobante === options.tipoComprobante
      );
    }

    // Filter by isActive if specified
    if (options?.isActive !== undefined) {
      filteredSeries = filteredSeries.filter(
        (s) => s.isActive === options.isActive
      );
    }

    return {
      series: filteredSeries,
      total: filteredSeries.length,
      limit,
      offset,
    };
  }

  /**
   * Get a series by ID
   */
  async get(id: string): Promise<Serie> {
    return this.client.get<Serie>(`/api/v1/series/${id}`);
  }

  /**
   * Create a new series for the current tenant
   *
   * VAL-SDK-010: Series create crea nueva serie
   * VAL-SDK-011: Series create valida tipo de comprobante
   */
  async create(input: CreateSerieInput): Promise<Serie> {
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

    return this.client.post<Serie>('/api/v1/series', input);
  }

  /**
   * Update a series
   */
  async update(
    id: string,
    data: { correlativoActual?: number; isActive?: boolean }
  ): Promise<Serie> {
    return this.client.put<Serie>(`/api/v1/series/${id}`, data);
  }

  /**
   * Deactivate a series (soft delete)
   */
  async deactivate(id: string): Promise<{ id: string; isActive: boolean }> {
    return this.client.delete<{ id: string; isActive: boolean }>(
      `/api/v1/series/${id}`
    );
  }
}
