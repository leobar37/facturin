/**
 * BullMQ Worker Definitions for SUNAT Document Processing
 *
 * Creates worker instances for:
 * - sunat-send: Processing comprobante submissions (concurrency: 10)
 * - sunat-consult: Processing CDR consultations (concurrency: 5)
 *
 * Workers are created lazily via the getSunatSendWorker/getSunatConsultWorker functions.
 */

import type { Worker as BullMQWorker, Job as BullMQJob } from 'bullmq';
import type { Processor } from 'bullmq';
import { redisConnection, QUEUE_NAMES } from './queue';
import { processEnviarComprobante } from './processes/enviar-comprobante';
import { processConsultarCdr } from './processes/consultar-cdr';
import type { EnviarComprobanteJobData, ConsultarCdrJobData } from './queue';
import type { EnviarComprobanteResult } from './processes/enviar-comprobante';
import type { ConsultarCdrResult } from './processes/consultar-cdr';

// Lazy-loaded worker instances with proper BullMQ Worker types
let _sunatSendWorker: BullMQWorker<EnviarComprobanteJobData, EnviarComprobanteResult> | null = null;
let _sunatConsultWorker: BullMQWorker<ConsultarCdrJobData, ConsultarCdrResult> | null = null;

/**
 * Get or create the SUNAT send worker
 */
export async function getSunatSendWorker(): Promise<BullMQWorker<EnviarComprobanteJobData, EnviarComprobanteResult>> {
  if (_sunatSendWorker) {
    return _sunatSendWorker;
  }

  // Dynamic import to handle case where BullMQ is not yet installed
  const { Worker } = await import('bullmq');

  const processor: Processor<EnviarComprobanteJobData, EnviarComprobanteResult> = async (job) => {
    console.log(`[sunat-send] Processing job ${job.id}: ${job.name}`);

    try {
      const result = await processEnviarComprobante(job.data);
      console.log(`[sunat-send] Job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      console.error(`[sunat-send] Job ${job.id} failed:`, error);
      throw error; // Re-throw to trigger BullMQ retry mechanism
    }
  };

  _sunatSendWorker = new Worker<EnviarComprobanteJobData, EnviarComprobanteResult>(
    QUEUE_NAMES.SUNAT_SEND,
    processor,
    {
      connection: redisConnection,
      concurrency: 10,
    }
  );

  // Event handlers
  _sunatSendWorker.on('completed', (job: BullMQJob<EnviarComprobanteJobData, EnviarComprobanteResult>) => {
    console.log(`[sunat-send] Job ${job.id} completed at ${new Date().toISOString()}`);
  });

  _sunatSendWorker.on('failed', (job: BullMQJob<EnviarComprobanteJobData, EnviarComprobanteResult> | undefined, err: Error) => {
    console.error(
      `[sunat-send] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
      err.message
    );
  });

  _sunatSendWorker.on('progress', (job: BullMQJob<EnviarComprobanteJobData, EnviarComprobanteResult>, progress: unknown) => {
    console.log(`[sunat-send] Job ${job.id} progress: ${JSON.stringify(progress)}`);
  });

  return _sunatSendWorker;
}

/**
 * Get or create the SUNAT consult worker
 */
export async function getSunatConsultWorker(): Promise<BullMQWorker<ConsultarCdrJobData, ConsultarCdrResult>> {
  if (_sunatConsultWorker) {
    return _sunatConsultWorker;
  }

  // Dynamic import to handle case where BullMQ is not yet installed
  const { Worker } = await import('bullmq');

  const processor: Processor<ConsultarCdrJobData, ConsultarCdrResult> = async (job) => {
    console.log(`[sunat-consult] Processing job ${job.id}: ${job.name}`);

    try {
      const result = await processConsultarCdr(job.data);
      console.log(`[sunat-consult] Job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      console.error(`[sunat-consult] Job ${job.id} failed:`, error);
      throw error; // Re-throw to trigger BullMQ retry mechanism
    }
  };

  _sunatConsultWorker = new Worker<ConsultarCdrJobData, ConsultarCdrResult>(
    QUEUE_NAMES.SUNAT_CONSULT,
    processor,
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  // Event handlers
  _sunatConsultWorker.on('completed', (job: BullMQJob<ConsultarCdrJobData, ConsultarCdrResult>) => {
    console.log(`[sunat-consult] Job ${job.id} completed at ${new Date().toISOString()}`);
  });

  _sunatConsultWorker.on('failed', (job: BullMQJob<ConsultarCdrJobData, ConsultarCdrResult> | undefined, err: Error) => {
    console.error(
      `[sunat-consult] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
      err.message
    );
  });

  _sunatConsultWorker.on('progress', (job: BullMQJob<ConsultarCdrJobData, ConsultarCdrResult>, progress: unknown) => {
    console.log(`[sunat-consult] Job ${job.id} progress: ${JSON.stringify(progress)}`);
  });

  return _sunatConsultWorker;
}

/**
 * Graceful shutdown function for workers
 * Call this when the API server is shutting down
 */
export async function shutdownWorkers(): Promise<void> {
  console.log('[BullMQ] Shutting down workers...');

  const workers: Promise<void>[] = [];

  if (_sunatSendWorker) {
    workers.push(_sunatSendWorker.close());
  }
  if (_sunatConsultWorker) {
    workers.push(_sunatConsultWorker.close());
  }

  await Promise.all(workers);
  console.log('[BullMQ] All workers shut down successfully');
}

/**
 * Initialize workers - call this when the API server starts
 */
export async function initializeWorkers(): Promise<void> {
  console.log('[BullMQ] Initializing workers...');

  // Workers are created lazily, so we just trigger creation and wait for ready
  const sendWorker = await getSunatSendWorker();
  const consultWorker = await getSunatConsultWorker();

  await Promise.all([
    sendWorker.waitUntilReady(),
    consultWorker.waitUntilReady(),
  ]);

  console.log('[BullMQ] Workers initialized and ready');
}
