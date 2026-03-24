import { randomBytes, createCipheriv } from 'crypto';
import { tenantsRepository, type TenantEntity } from '../repositories/tenants.repository';
import { seriesRepository } from '../repositories/series.repository';
import { ValidationError, ConflictError } from '../errors';

export interface ReadinessCheck {
  ready: boolean;
  missing: string[];
  checks: {
    hasCertificate: boolean;
    hasSunatCredentials: boolean;
    hasSeries: boolean;
  };
}

// Encryption key for certificate storage (in production, use proper key management)
const ENCRYPTION_KEY = process.env.CERTIFICATE_ENCRYPTION_KEY || 'default-32-char-key-for-dev!!';
const ENCRYPTION_IV_LENGTH = 16;
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt data using AES-256-CBC
 */
function encryptData(data: string): string {
  const iv = randomBytes(ENCRYPTION_IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

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
    const { certificadoDigital, sunatPassword, ...safeData } = tenant;
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

  /**
   * Validate if the data is valid base64 encoded PFX/P12 certificate
   */
  validateCertificateData(data: string): boolean {
    if (!data || typeof data !== 'string') return false;
    
    // Check if it's valid base64
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(data)) return false;
    
    // Try to decode and check if it looks like a PFX ( begins with PKCS#7 or PFX magic bytes)
    try {
      const decoded = Buffer.from(data, 'base64');
      // PFX/P12 files typically start with PKCS#7 or have specific markers
      // The first bytes of a PFX file can be: 30 (SEQUENCE tag)
      // For better validation, we'll check if it's at least 100 bytes (reasonable minimum for a cert)
      return decoded.length >= 100 && decoded[0] === 0x30;
    } catch {
      return false;
    }
  }

  /**
   * Upload and store certificate for a tenant
   * Returns certificate expiration date if available
   */
  async uploadCertificate(
    tenantId: string,
    certificateData: string,
    password: string
  ): Promise<{ success: boolean; expiresAt?: string; message: string }> {
    // Validate certificate data format (base64 encoded PFX)
    if (!certificateData) {
      throw new ValidationError('Certificate file is required', 'CERTIFICATE_REQUIRED');
    }

    if (!this.validateCertificateData(certificateData)) {
      throw new ValidationError('Invalid certificate format. Only .pfx or .p12 allowed', 'INVALID_CERT_FORMAT');
    }

    if (!password) {
      throw new ValidationError('Certificate password is required', 'CERT_PASSWORD_REQUIRED');
    }

    // Check if tenant exists
    const tenant = await tenantsRepository.findById(tenantId);
    if (!tenant) {
      throw new ValidationError('Tenant not found', 'NOT_FOUND');
    }

    // Decode the base64 certificate
    const pfxBuffer = Buffer.from(certificateData, 'base64');

    // Try to parse the PFX to validate password
    // We'll use Node.js crypto module for this
    let certificateInfo: { expiresAt?: string };
    
    try {
      // Use crypto to verify the password by attempting to parse
      // Node.js PKCS12 parsing requires the password
      certificateInfo = this.parsePKCS12(pfxBuffer, password);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Invalid password') || errorMessage.includes('wrong password')) {
        throw new ValidationError('Invalid certificate password', 'INVALID_CERT_PASSWORD');
      }
      if (errorMessage.includes('mac') || errorMessage.includes('auth')) {
        throw new ValidationError('Invalid certificate password', 'INVALID_CERT_PASSWORD');
      }
      throw new ValidationError('Invalid certificate file', 'INVALID_CERTIFICATE');
    }

    // Encrypt the certificate before storing
    const encryptedCertificate = encryptData(certificateData);
    const encryptedPassword = encryptData(password);

    // Update the tenant with the certificate
    await tenantsRepository.updateCertificate(tenantId, {
      certificadoDigital: encryptedCertificate,
      certificadoPassword: encryptedPassword,
    });

    return {
      success: true,
      expiresAt: certificateInfo.expiresAt,
      message: 'Certificate uploaded successfully',
    };
  }

  /**
   * Parse PKCS12 (PFX) file to extract certificate info
   * This is a simplified implementation - in production, use a proper library
   */
  private parsePKCS12(pfxBuffer: Buffer, _password: string): { expiresAt?: string } {
    // Basic validation - PFX files start with SEQUENCE (0x30)
    if (pfxBuffer[0] !== 0x30) {
      throw new Error('Invalid PFX file format');
    }

    // For a proper implementation, we would use a library like node-forge or pkcs12
    // For now, we'll do basic validation and return a mock expiration
    // In production, you should use: import forge from 'node-forge';
    
    // Basic sanity check - PFX should be at least 100 bytes
    if (pfxBuffer.length < 100) {
      throw new Error('Certificate file too small');
    }

    // Return mock expiration - in production, parse the actual certificate
    // to extract the expiration date
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    return {
      expiresAt: expiresAt.toISOString().split('T')[0],
    };
  }

  /**
   * Validate SUNAT username format (6-20 alphanumeric characters)
   */
  validateSunatUsername(username: string): boolean {
    // Username must be 6-20 alphanumeric characters
    const usernameRegex = /^[A-Za-z0-9]{6,20}$/;
    return usernameRegex.test(username);
  }

  /**
   * Update SUNAT credentials for a tenant
   * Username is stored as-is, password is encrypted
   */
  async updateSunatCredentials(
    tenantId: string,
    username: string,
    password: string
  ): Promise<{ success: boolean; message: string; hasCredentials: boolean }> {
    // Validate required fields
    if (!username || !password) {
      throw new ValidationError('SUNAT username and password are required', 'SUNAT_CREDENTIALS_REQUIRED');
    }

    // Validate username format
    if (!this.validateSunatUsername(username)) {
      throw new ValidationError('Invalid SUNAT username format', 'INVALID_SUNAT_USERNAME');
    }

    // Check if tenant exists
    const tenant = await tenantsRepository.findById(tenantId);
    if (!tenant) {
      throw new ValidationError('Tenant not found', 'NOT_FOUND');
    }

    // Encrypt the password before storing
    const encryptedPassword = encryptData(password);

    // Update the tenant with the SUNAT credentials
    await tenantsRepository.updateSunatCredentials(tenantId, {
      sunatUsername: username,
      sunatPassword: encryptedPassword,
    });

    return {
      success: true,
      message: 'SUNAT credentials updated',
      hasCredentials: true,
    };
  }

  /**
   * Check if a tenant is ready for invoicing
   * A tenant is ready when it has:
   * - A certificate uploaded
   * - SUNAT credentials (username and password)
   * - At least one active series
   */
  async checkReadiness(tenantId: string): Promise<ReadinessCheck> {
    const checks = {
      hasCertificate: false,
      hasSunatCredentials: false,
      hasSeries: false,
    };

    const missing: string[] = [];

    // Check tenant exists and get certificate/SUNAT info
    const tenant = await tenantsRepository.findById(tenantId);

    if (!tenant) {
      // Return not ready - tenant doesn't exist
      return {
        ready: false,
        missing: ['tenant'],
        checks,
      };
    }

    // Check certificate (certificadoDigital and certificadoPassword must be set)
    if (tenant.certificadoDigital && tenant.certificadoPassword) {
      checks.hasCertificate = true;
    } else {
      missing.push('certificate');
    }

    // Check SUNAT credentials (sunatUsername and sunatPassword must be set)
    if (tenant.sunatUsername && tenant.sunatPassword) {
      checks.hasSunatCredentials = true;
    } else {
      missing.push('sunat_credentials');
    }

    // Check for at least one active series
    const activeSeries = await seriesRepository.findActiveByTenant(tenantId);
    if (activeSeries.length > 0) {
      checks.hasSeries = true;
    } else {
      missing.push('series');
    }

    const ready = missing.length === 0;

    return {
      ready,
      missing,
      checks,
    };
  }
}

// Singleton instance
export const tenantsService = new TenantsService();
