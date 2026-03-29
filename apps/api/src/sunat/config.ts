/**
 * SUNAT Configuration Loader
 *
 * Loads SUNAT endpoints from instance_config table.
 * Falls back to default values if not configured.
 */

import { db } from '../db';
import { instanceConfig } from '../db/schema';
import type { SunatEnvironment } from './types';

export interface SunatEndpointSet {
  soap: string;
  rest: string;
}

export interface SunatConfig {
  soapUrl: string;
  restUrl: string;
  environment: SunatEnvironment;
}

/**
 * Default SUNAT endpoints (fallback)
 */
const DEFAULT_ENDPOINTS: Record<SunatEnvironment, SunatEndpointSet> = {
  beta: {
    soap: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl',
    rest: 'https://e-beta.sunat.gob.pe:443/ol-ti-itcpfegem-beta/',
  },
  production: {
    soap: 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService?wsdl',
    rest: 'https://e-factura.sunat.gob.pe:443/ol-ti-itcpfegem/',
  },
  mock: {
    soap: 'mock://localhost:8080/billService',
    rest: 'mock://localhost:8080/',
  },
};

/**
 * Get SUNAT configuration based on environment mode
 *
 * Priority:
 * 1. Check instance_config for custom endpoints
 * 2. Fall back to default SUNAT endpoints
 */
export async function getSunatConfig(environment: SunatEnvironment = 'production'): Promise<SunatConfig> {
  try {
    // Get first instance config record
    const configs = await db
      .select()
      .from(instanceConfig)
      .limit(1);

    const config = configs[0];

    if (config) {
      // Check if custom endpoints are configured
      const hasCustomBeta = config.sunatBetaWsdlUrl && config.sunatBetaRestUrl;
      const hasCustomProd = config.sunatProdWsdlUrl && config.sunatProdRestUrl;

      if (environment === 'beta' && hasCustomBeta) {
        return {
          soapUrl: config.sunatBetaWsdlUrl!,
          restUrl: config.sunatBetaRestUrl!,
          environment: 'beta',
        };
      }

      if (environment === 'production' && hasCustomProd) {
        return {
          soapUrl: config.sunatProdWsdlUrl!,
          restUrl: config.sunatProdRestUrl!,
          environment: 'production',
        };
      }
    }
  } catch (error) {
    console.warn('[SUNAT Config] Failed to load from DB, using defaults:', error);
  }

  // Fall back to default endpoints
  const defaults = DEFAULT_ENDPOINTS[environment];
  return {
    soapUrl: defaults.soap,
    restUrl: defaults.rest,
    environment,
  };
}

/**
 * Get SOAP URL for SUNAT
 */
export async function getSunatSoapUrl(environment?: SunatEnvironment): Promise<string> {
  const config = await getSunatConfig(environment);
  return config.soapUrl;
}

/**
 * Get REST URL for SUNAT
 */
export async function getSunatRestUrl(environment?: SunatEnvironment): Promise<string> {
  const config = await getSunatConfig(environment);
  return config.restUrl;
}

/**
 * Get environment mode from instance_config
 * Returns 'beta' or 'production'
 */
export async function getSunatEnvironment(): Promise<SunatEnvironment> {
  try {
    const configs = await db
      .select()
      .from(instanceConfig)
      .limit(1);

    const config = configs[0];

    if (config?.mode === 'homologation' || config?.mode === 'beta') {
      return 'beta';
    }
  } catch (error) {
    console.warn('[SUNAT Config] Failed to get environment mode:', error);
  }

  return 'production';
}
