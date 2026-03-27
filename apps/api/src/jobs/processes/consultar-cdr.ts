/**
 * BullMQ Processor: Consultar CDR
 *
 * Processes a CDR consultation job:
 * 1. Get comprobante by ticket
 * 2. Call SUNAT getStatus
 * 3. Parse response (0=aceptado, 98=en proceso, otro=rechazado)
 * 4. If 98 (en proceso), re-add job with delay
 * 5. Update comprobante with final status
 * 6. On success, update cdrContent
 */

import { SunatClient, createSunatClient } from '../../sunat/client';
import type {
  SunatEnvironment,
  ComprobanteSunatEstado,
  SunatStatusCode,
} from '../../sunat/types';
import { comprobantesRepository } from '../../repositories/comprobantes.repository';
import { tenantsRepository } from '../../repositories/tenants.repository';
import { enqueueConsultarCdr } from '../queue';
import type { ConsultarCdrJobData } from '../queue';

// Maximum attempts to avoid infinite loops
const MAX_CONSULT_ATTEMPTS = 20;

// Delay between retries (in ms) - exponential backoff base
const BASE_RETRY_DELAY_MS = 5000;

/**
 * Map SUNAT status codes to internal estado
 */
function mapStatusCodeToEstado(statusCode: SunatStatusCode): ComprobanteSunatEstado {
  if (statusCode === 0) return 'aceptado';
  if (statusCode === 98) return 'en_proceso';
  if (statusCode === 99) return 'excepcion';
  // Codes 100-1999: Excepciones
  // Codes 2000-3999: Rechazados
  // Codes 4000+: Aceptados
  if (statusCode >= 2000 && statusCode < 4000) return 'rechazado';
  if (statusCode >= 4000) return 'aceptado';
  return 'rechazado';
}

export interface ConsultarCdrResult {
  success: boolean;
  ticket: string;
  comprobanteId: string;
  estado: ComprobanteSunatEstado;
  statusCode?: SunatStatusCode;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Process a CDR consultation job
 */
export async function processConsultarCdr(
  data: ConsultarCdrJobData
): Promise<ConsultarCdrResult> {
  const { ticket, tenantId, comprobanteId, attemptNumber = 1 } = data;

  console.log(`[consultar-cdr] Starting consultation for ticket ${ticket}, attempt ${attemptNumber}`);

  // Step 1: Get comprobante by ticket
  const comprobante = await comprobantesRepository.findBySunatTicket(ticket);

  if (!comprobante) {
    console.error(`[consultar-cdr] Comprobante not found for ticket ${ticket}`);
    return {
      success: false,
      ticket,
      comprobanteId,
      estado: 'rechazado',
      errorCode: 'NOT_FOUND',
      errorMessage: `Comprobante not found for ticket ${ticket}`,
    };
  }

  // Get tenant for SUNAT credentials
  const tenant = await tenantsRepository.findById(tenantId);

  if (!tenant) {
    console.error(`[consultar-cdr] Tenant ${tenantId} not found`);
    return {
      success: false,
      ticket,
      comprobanteId,
      estado: 'rechazado',
      errorCode: 'TENANT_NOT_FOUND',
      errorMessage: `Tenant ${tenantId} not found`,
    };
  }

  if (!tenant.sunatUsername || !tenant.sunatPassword) {
    console.error(`[consultar-cdr] Tenant ${tenantId} missing SUNAT credentials`);
    return {
      success: false,
      ticket,
      comprobanteId,
      estado: 'rechazado',
      errorCode: 'MISSING_CREDENTIALS',
      errorMessage: 'Tenant SUNAT credentials not configured',
    };
  }

  try {
    // Step 2: Call SUNAT getStatus
    console.log(`[consultar-cdr] Calling SUNAT getStatus for ticket ${ticket}`);

    const environment: SunatEnvironment = process.env.SUNAT_ENVIRONMENT as SunatEnvironment || 'beta';

    const sunatClient: SunatClient = createSunatClient(
      {
        username: tenant.sunatUsername,
        password: tenant.sunatPassword,
      },
      environment
    );

    const statusResult = await sunatClient.getStatus(ticket);

    if (!statusResult.success) {
      console.error(`[consultar-cdr] SUNAT getStatus failed for ticket ${ticket}:`, statusResult.errorMessage);

      // Check if we should retry
      if (attemptNumber < MAX_CONSULT_ATTEMPTS) {
        const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attemptNumber - 1);
        console.log(`[consultar-cdr] Re-scheduling ticket ${ticket} for retry in ${delayMs}ms`);

        await enqueueConsultarCdr(ticket, tenantId, comprobanteId, delayMs);

        return {
          success: true,
          ticket,
          comprobanteId,
          estado: 'en_proceso',
        };
      }

      // Max attempts reached
      await comprobantesRepository.updateSunatEstado(comprobanteId, 'excepcion');

      return {
        success: false,
        ticket,
        comprobanteId,
        estado: 'excepcion',
        errorCode: statusResult.errorCode,
        errorMessage: statusResult.errorMessage || 'Max consultation attempts reached',
      };
    }

    const { statusCode, xmlContent } = statusResult;

    console.log(`[consultar-cdr] SUNAT status for ticket ${ticket}: code=${statusCode}, status=${statusResult.status}`);

    // Step 3: Parse response
    const estado = mapStatusCodeToEstado(statusCode);

    // Step 4: If 98 (en proceso), re-add job with delay
    if (statusCode === 98) {
      // Still processing, re-schedule
      if (attemptNumber < MAX_CONSULT_ATTEMPTS) {
        const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attemptNumber - 1);
        console.log(`[consultar-cdr] Ticket ${ticket} still processing, re-scheduling in ${delayMs}ms`);

        await enqueueConsultarCdr(ticket, tenantId, comprobanteId, delayMs);

        return {
          success: true,
          ticket,
          comprobanteId,
          estado: 'en_proceso',
          statusCode,
        };
      } else {
        // Max attempts reached, mark as exception
        console.error(`[consultar-cdr] Ticket ${ticket} max attempts reached, marking as exception`);
        await comprobantesRepository.updateSunatEstado(comprobanteId, 'excepcion');

        return {
          success: false,
          ticket,
          comprobanteId,
          estado: 'excepcion',
          statusCode,
          errorCode: 'MAX_ATTEMPTS',
          errorMessage: 'Max consultation attempts reached',
        };
      }
    }

    // Step 5: Update comprobante with final status
    await comprobantesRepository.updateSunatEstado(comprobanteId, estado);

    // Step 6: On success, update cdrContent
    if (xmlContent) {
      const cdrStatus = statusResult.status || (estado === 'aceptado' ? 'ACEPTADO' : 'RECHAZADO');
      await comprobantesRepository.updateCdr(comprobanteId, estado, xmlContent, cdrStatus);
    }

    return {
      success: estado === 'aceptado',
      ticket,
      comprobanteId,
      estado,
      statusCode,
    };
  } catch (error) {
    console.error(`[consultar-cdr] Error consulting ticket ${ticket}:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if we should retry on error
    if (attemptNumber < MAX_CONSULT_ATTEMPTS) {
      const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attemptNumber - 1);
      console.log(`[consultar-cdr] Re-scheduling ticket ${ticket} for retry after error in ${delayMs}ms`);

      await enqueueConsultarCdr(ticket, tenantId, comprobanteId, delayMs);

      return {
        success: true,
        ticket,
        comprobanteId,
        estado: 'en_proceso',
        errorCode: 'RETRY_SCHEDULED',
        errorMessage: errorMessage,
      };
    }

    // Max attempts reached
    await comprobantesRepository.updateSunatEstado(comprobanteId, 'excepcion');

    return {
      success: false,
      ticket,
      comprobanteId,
      estado: 'excepcion',
      errorCode: 'PROCESS_ERROR',
      errorMessage,
    };
  }
}
