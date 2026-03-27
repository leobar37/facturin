/**
 * BullMQ Jobs Module - Main exports
 *
 * Provides async background processing for SUNAT operations:
 * - Queue definitions
 * - Worker definitions
 * - Processor functions
 *
 * Usage:
 * ```typescript
 * import { initializeWorkers, shutdownWorkers, enqueueEnviarComprobante } from './jobs';
 *
 * // Initialize workers on server start
 * await initializeWorkers();
 *
 * // Enqueue a comprobante for processing
 * await enqueueEnviarComprobante(comprobanteId, tenantId);
 *
 * // Shutdown gracefully on server close
 * await shutdownWorkers();
 * ```
 */

// Queue exports
export {
  getSunatSendQueue,
  getSunatConsultQueue,
  enqueueEnviarComprobante,
  enqueueConsultarCdr,
  type EnviarComprobanteJobData,
  type ConsultarCdrJobData,
} from './queue';

// Worker exports
export {
  getSunatSendWorker,
  getSunatConsultWorker,
  initializeWorkers,
  shutdownWorkers,
} from './worker';

// Process function exports
export {
  processEnviarComprobante,
  processConsultarCdr,
  type EnviarComprobanteResult,
  type ConsultarCdrResult,
} from './processes';
