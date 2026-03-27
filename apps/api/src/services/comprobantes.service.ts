import { comprobantesRepository, type CreateComprobanteInput, type ComprobanteFilters, type ComprobanteEntity } from '../repositories/comprobantes.repository';
import { seriesRepository } from '../repositories/series.repository';
import { tenantReadinessService } from './tenant-readiness.service';
import { ValidationError, NotFoundError, ForbiddenError } from '../errors';
import { enqueueEnviarComprobante } from '../jobs/queue';

// IGV rate (18%)
const IGV_RATE = 0.18;

export interface CreateComprobanteInputDTO {
  tipoComprobante: string;
  serie: string;
  clienteTipoDocumento: string;
  clienteNumeroDocumento: string;
  clienteNombre: string;
  clienteDireccion?: string;
  detalles: Array<{
    descripcion: string;
    cantidad: number;
    valorUnitario: number;
    precioUnitario?: number;
    igv?: number;
    subTotal?: number;
  }>;
  formaPago?: {
    tipoPago: string;
    montoPagado?: number;
  };
}

export interface ComprobanteResponse {
  id: string;
  tipoComprobante: string;
  serie: string;
  numero: number;
  fechaEmision: Date;
  clienteTipoDocumento: string;
  clienteNumeroDocumento: string;
  clienteNombre: string;
  clienteDireccion: Record<string, unknown> | null;
  totalGravadas: string;
  totalIgv: string;
  totalImporte: string;
  detalles: Record<string, unknown>[];
  estado: string;
  createdAt: Date;
}

export interface ListComprobantesResult {
  data: ComprobanteResponse[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export class ComprobantesService {
  /**
   * Validate client document number based on document type
   */
  private validateClientDocument(tipoDocumento: string, numeroDocumento: string): void {
    // RUC validation when tipoDocumento is "6"
    if (tipoDocumento === '6') {
      if (!/^\d{11}$/.test(numeroDocumento)) {
        throw new ValidationError('Invalid client RUC format', 'INVALID_CLIENT_RUC');
      }

      // Validate RUC checksum
      const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
      let sum = 0;

      for (let i = 0; i < 10; i++) {
        sum += parseInt(numeroDocumento[i]) * weights[i];
      }

      const remainder = sum % 11;
      const checkDigit = 11 - remainder;
      const lastDigit = parseInt(numeroDocumento[10]);

      if (checkDigit !== lastDigit) {
        throw new ValidationError('Invalid client RUC format', 'INVALID_CLIENT_RUC');
      }
    }
  }

  /**
   * Calculate totals from details
   */
  private calculateTotals(detalles: CreateComprobanteInputDTO['detalles']): {
    totalGravadas: string;
    totalIgv: string;
    totalImporte: string;
    calculatedDetalles: Record<string, unknown>[];
  } {
    let totalGravadas = 0;
    const calculatedDetalles: Record<string, unknown>[] = [];

    for (const item of detalles) {
      const cantidad = item.cantidad;
      const valorUnitario = item.valorUnitario;

      // Calculate base value (without IGV)
      const valorVenta = cantidad * valorUnitario;
      const igv = valorVenta * IGV_RATE;
      const precioUnitario = item.precioUnitario ?? valorUnitario * (1 + IGV_RATE);
      const subTotal = item.subTotal ?? valorVenta + igv;

      totalGravadas += valorVenta;

      calculatedDetalles.push({
        descripcion: item.descripcion,
        cantidad,
        valorUnitario,
        precioUnitario,
        igv,
        subTotal,
      });
    }

    const totalIgv = totalGravadas * IGV_RATE;
    const totalImporte = totalGravadas + totalIgv;

    return {
      totalGravadas: totalGravadas.toFixed(2),
      totalIgv: totalIgv.toFixed(2),
      totalImporte: totalImporte.toFixed(2),
      calculatedDetalles,
    };
  }

  /**
   * Validate that the serie belongs to the tenant and is active
   */
  private async validateSerie(tenantId: string, tipoComprobante: string, serie: string): Promise<void> {
    const serieRecord = await seriesRepository.findByTenantAndTipoAndSerie(
      tenantId,
      tipoComprobante,
      serie
    );

    if (!serieRecord || !serieRecord.isActive) {
      throw new ValidationError('Invalid serie for tenant', 'INVALID_SERIE');
    }
  }

  /**
   * Get the next correlativo number for a serie
   */
  private async getNextCorrelativo(tenantId: string, tipoComprobante: string, serie: string): Promise<number> {
    const lastNumero = await comprobantesRepository.getLastNumeroBySerie(
      tenantId,
      tipoComprobante,
      serie
    );
    return lastNumero + 1;
  }

  /**
   * List comprobantes for a tenant with optional filters
   */
  async list(
    tenantId: string,
    filters?: {
      tipoComprobante?: string;
      serie?: string;
      estado?: string;
      fechaDesde?: string;
      fechaHasta?: string;
    },
    options?: { limit?: number; offset?: number }
  ): Promise<ListComprobantesResult> {
    const parsedFilters: ComprobanteFilters = {};

    if (filters?.tipoComprobante) {
      parsedFilters.tipoComprobante = filters.tipoComprobante;
    }

    if (filters?.serie) {
      parsedFilters.serie = filters.serie.toUpperCase();
    }

    if (filters?.estado) {
      parsedFilters.estado = filters.estado;
    }

    if (filters?.fechaDesde) {
      parsedFilters.fechaDesde = new Date(filters.fechaDesde);
    }

    if (filters?.fechaHasta) {
      parsedFilters.fechaHasta = new Date(filters.fechaHasta);
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const result = await comprobantesRepository.findByTenant(tenantId, parsedFilters, { limit, offset });

    return {
      data: result.data.map((c) => this.toResponse(c)),
      pagination: {
        total: result.total,
        limit,
        offset,
      },
    };
  }

  /**
   * Get a comprobante by ID
   */
  async getById(tenantId: string, id: string): Promise<ComprobanteResponse> {
    const comprobante = await comprobantesRepository.findByTenantAndId(tenantId, id);

    if (!comprobante) {
      throw new NotFoundError('Comprobante not found', 'NOT_FOUND');
    }

    return this.toResponse(comprobante);
  }

  /**
   * Create a new comprobante
   */
  async create(tenantId: string, input: CreateComprobanteInputDTO): Promise<ComprobanteResponse> {
    // 1. Validate tenant readiness
    const readiness = await tenantReadinessService.checkReadiness(tenantId);
    if (!readiness.ready) {
      throw new ForbiddenError('Tenant not ready for invoicing', 'TENANT_NOT_READY');
    }

    // 2. Validate client document
    this.validateClientDocument(input.clienteTipoDocumento, input.clienteNumeroDocumento);

    // 3. Validate serie belongs to tenant and is active
    const upperSerie = input.serie.toUpperCase();
    await this.validateSerie(tenantId, input.tipoComprobante, upperSerie);

    // 4. Calculate totals
    const { totalGravadas, totalIgv, totalImporte, calculatedDetalles } = this.calculateTotals(input.detalles);

    // 5. Get next correlativo
    const numero = await this.getNextCorrelativo(tenantId, input.tipoComprobante, upperSerie);

    // 6. Create the comprobante
    const createInput: CreateComprobanteInput = {
      tenantId,
      tipoComprobante: input.tipoComprobante,
      serie: upperSerie,
      numero,
      clienteTipoDocumento: input.clienteTipoDocumento,
      clienteNumeroDocumento: input.clienteNumeroDocumento,
      clienteNombre: input.clienteNombre,
      clienteDireccion: input.clienteDireccion ? { direccion: input.clienteDireccion } : undefined,
      totalGravadas,
      totalIgv,
      totalImporte,
      detalles: calculatedDetalles,
      formaPago: input.formaPago,
    };

    const comprobante = await comprobantesRepository.create(createInput);

    // Queue SUNAT send job asynchronously (don't await)
    enqueueEnviarComprobante(comprobante.id, tenantId).catch((err) => {
      console.error('Failed to enqueue SUNAT send job:', err);
    });

    return this.toResponse(comprobante);
  }

  /**
   * Cancel (anular) a comprobante - only if it's in "pendiente" status
   */
  async cancel(tenantId: string, id: string): Promise<ComprobanteResponse> {
    const comprobante = await comprobantesRepository.findByTenantAndId(tenantId, id);

    if (!comprobante) {
      throw new NotFoundError('Comprobante not found', 'NOT_FOUND');
    }

    if (comprobante.sunatEstado !== 'pendiente') {
      throw new ValidationError('Cannot cancel sent comprobante', 'CANNOT_CANCEL_SENT');
    }

    const updated = await comprobantesRepository.updateEstado(id, 'anulado');

    if (!updated) {
      throw new NotFoundError('Comprobante not found', 'NOT_FOUND');
    }

    return this.toResponse(updated);
  }

  /**
   * Convert entity to response format
   */
  private toResponse(entity: ComprobanteEntity): ComprobanteResponse {
    return {
      id: entity.id,
      tipoComprobante: entity.tipoComprobante,
      serie: entity.serie,
      numero: entity.numero,
      fechaEmision: entity.fechaEmision,
      clienteTipoDocumento: entity.clienteTipoDocumento,
      clienteNumeroDocumento: entity.clienteNumeroDocumento,
      clienteNombre: entity.clienteNombre,
      clienteDireccion: entity.clienteDireccion,
      totalGravadas: entity.totalGravadas,
      totalIgv: entity.totalIgv,
      totalImporte: entity.totalImporte,
      detalles: entity.detalles,
      estado: entity.sunatEstado,
      createdAt: entity.createdAt,
    };
  }
}

// Singleton instance
export const comprobantesService = new ComprobantesService();
