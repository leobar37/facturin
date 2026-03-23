import { tenantsRepository } from '../repositories/tenants.repository';
import { seriesRepository } from '../repositories/series.repository';

export interface ReadinessCheck {
  ready: boolean;
  missing: string[];
  checks: {
    hasCertificate: boolean;
    hasSunatCredentials: boolean;
    hasSeries: boolean;
  };
}

export class TenantReadinessService {
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
export const tenantReadinessService = new TenantReadinessService();
