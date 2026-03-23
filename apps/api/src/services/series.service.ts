import { seriesRepository, type SerieEntity } from '../repositories/series.repository';
import { ValidationError, ConflictError } from '../errors';

const VALID_TIPO_COMPROBANTE = ['01', '03', '07', '08', '09', '20', '40'] as const;

export interface CreateSerieInput {
  tenantId: string;
  tipoComprobante: string;
  serie: string;
  correlativoActual?: number;
}

export interface UpdateSerieInput {
  correlativoActual?: number;
  isActive?: boolean;
}

export class SeriesService {
  isValidTipoComprobante(tipo: string): boolean {
    return VALID_TIPO_COMPROBANTE.includes(tipo as typeof VALID_TIPO_COMPROBANTE[number]);
  }

  isValidSerieFormat(serie: string): boolean {
    return /^[A-Z0-9]{4}$/.test(serie);
  }

  async findAllByTenant(tenantId: string): Promise<SerieEntity[]> {
    return seriesRepository.findActiveByTenant(tenantId);
  }

  async findByTenantAndId(tenantId: string, id: string): Promise<SerieEntity | null> {
    return seriesRepository.findByTenantAndId(tenantId, id);
  }

  async create(input: CreateSerieInput): Promise<SerieEntity> {
    if (!this.isValidTipoComprobante(input.tipoComprobante)) {
      throw new ValidationError(
        `Invalid tipoComprobante. Must be one of: ${VALID_TIPO_COMPROBANTE.join(', ')}`,
        'INVALID_TIPO_COMPROBANTE'
      );
    }

    const upperSerie = input.serie.toUpperCase();
    if (!this.isValidSerieFormat(upperSerie)) {
      throw new ValidationError(
        'Serie must be exactly 4 uppercase alphanumeric characters (e.g., F001, B001)',
        'INVALID_SERIE'
      );
    }

    const existing = await seriesRepository.findByTenantAndTipoAndSerie(
      input.tenantId,
      input.tipoComprobante,
      upperSerie
    );

    if (existing) {
      throw new ConflictError('This series already exists for this document type', 'DUPLICATE_SERIE');
    }

    const newSerie = await seriesRepository.create({
      tenantId: input.tenantId,
      tipoComprobante: input.tipoComprobante,
      serie: upperSerie,
      correlativoActual: input.correlativoActual || 0,
      isActive: true,
    });

    return newSerie;
  }

  async update(tenantId: string, id: string, input: UpdateSerieInput): Promise<SerieEntity | null> {
    const existing = await seriesRepository.findByTenantAndId(tenantId, id);
    if (!existing) return null;

    return seriesRepository.update(id, {
      ...(input.correlativoActual !== undefined && { correlativoActual: input.correlativoActual }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    });
  }

  async deactivate(tenantId: string, id: string): Promise<{ id: string; isActive: boolean } | null> {
    const existing = await seriesRepository.findByTenantAndId(tenantId, id);
    if (!existing) return null;

    const deactivated = await seriesRepository.deactivate(id);
    if (!deactivated) return null;

    return { id: deactivated.id, isActive: false };
  }

  async getNextCorrelativo(tenantId: string, id: string): Promise<number | null> {
    const serie = await seriesRepository.findByTenantAndId(tenantId, id);
    if (!serie) return null;
    return serie.correlativoActual + 1;
  }

  async incrementCorrelativo(id: string): Promise<SerieEntity | null> {
    return seriesRepository.incrementCorrelativo(id);
  }
}

// Singleton instance
export const seriesService = new SeriesService();
