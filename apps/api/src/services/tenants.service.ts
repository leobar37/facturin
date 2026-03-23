import { tenantsRepository, type TenantEntity } from '../repositories/tenants.repository';
import { ValidationError, ConflictError } from '../errors';

export interface CreateTenantInput {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion?: {
    direccion?: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;
    ubigeo?: string;
  };
  contactoEmail?: string;
  contactoPhone?: string;
  maxDocumentsPerMonth?: number;
}

export interface UpdateTenantInput {
  razonSocial?: string;
  nombreComercial?: string;
  direccion?: Record<string, string>;
  contactoEmail?: string;
  contactoPhone?: string;
  maxDocumentsPerMonth?: number;
  isActive?: boolean;
}

export interface TenantResponse {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  direccion: TenantEntity['direccion'];
  contactoEmail: string | null;
  contactoPhone: string | null;
  isActive: boolean;
  maxDocumentsPerMonth: number | null;
  createdAt: Date;
  updatedAt: Date;
  hasCertificado?: boolean;
  hasSunatPassword?: boolean;
}

export class TenantsService {
  validateRuc(ruc: string): boolean {
    if (!/^\d{11}$/.test(ruc)) return false;

    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;

    for (let i = 0; i < 10; i++) {
      sum += parseInt(ruc[i]) * weights[i];
    }

    const remainder = sum % 11;
    const checkDigit = 11 - remainder;

    return checkDigit === parseInt(ruc[10]);
  }

  toSafeResponse(tenant: TenantEntity): TenantResponse {
    const { certificadoDigital, certificadoPassword, sunatPassword, ...safeData } = tenant;
    return {
      ...safeData,
      hasCertificado: !!certificadoDigital,
      hasSunatPassword: !!sunatPassword,
    };
  }

  async findAll(options?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    data: TenantResponse[];
    pagination: { total: number; limit: number; offset: number };
  }> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    let result: { data: TenantEntity[]; total: number };

    if (options?.search) {
      result = await tenantsRepository.search(options.search, limit, offset);
    } else {
      result = await tenantsRepository.findAll({ limit, offset });
    }

    return {
      data: result.data.map((t) => this.toSafeResponse(t)),
      pagination: {
        total: result.total,
        limit,
        offset,
      },
    };
  }

  async findById(id: string): Promise<TenantResponse | null> {
    const tenant = await tenantsRepository.findById(id);
    if (!tenant) return null;
    return this.toSafeResponse(tenant);
  }

  async findActiveById(id: string): Promise<TenantEntity | null> {
    return tenantsRepository.findActiveById(id);
  }

  async create(input: CreateTenantInput): Promise<TenantEntity> {
    if (!this.validateRuc(input.ruc)) {
      throw new ValidationError('Invalid RUC format', 'INVALID_RUC');
    }

    const existing = await tenantsRepository.findByRuc(input.ruc);
    if (existing) {
      throw new ConflictError('RUC already registered', 'RUC_EXISTS');
    }

    const tenant = await tenantsRepository.create({
      ruc: input.ruc,
      razonSocial: input.razonSocial,
      nombreComercial: input.nombreComercial,
      direccion: input.direccion,
      contactoEmail: input.contactoEmail,
      contactoPhone: input.contactoPhone,
      maxDocumentsPerMonth: input.maxDocumentsPerMonth,
      isActive: true,
    });

    return tenant;
  }

  async update(id: string, input: UpdateTenantInput): Promise<TenantEntity | null> {
    return tenantsRepository.update(id, input);
  }

  async deactivate(id: string): Promise<{ id: string; isActive: boolean } | null> {
    const deactivated = await tenantsRepository.deactivate(id);
    if (!deactivated) return null;
    return { id: deactivated.id, isActive: false };
  }
}

// Singleton instance
export const tenantsService = new TenantsService();
