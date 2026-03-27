/**
 * BullMQ Worker Definitions for SUNAT Document Processing
 *
 * Creates worker instances for:
 * - sunat-send: Processing comprobante submissions (concurrency: 10)
 * - sunat-consult: Processing CDR consultations (concurrency: 5)
 *
 * Workers are created lazily via the getSunatSendWorker/getSunatConsultWorker functions.
 */

import { redisConnection, QUEUE_NAMES } from './queue';
import { processEnviarComprobante } from './processes/enviar-comprobante';
import { processConsultarCdr } from './processes/consultar-cdr';
import type { EnviarComprobanteJobData, ConsultarCdrJobData } from './queue';

// Lazy-loaded worker instances (using any type until BullMQ is installed)
let _sunatSendWorker: any = null;
let _sunatConsultWorker: any = null;

/**
 * Get or create the SUNAT send worker
 */
export async function getSunatSendWorker(): Promise<any> {
  if (_sunatSendWorker) {
    return _sunatSendWorker;
  }

  // Dynamic import to handle case where BullMQ is not yet installed
  const { Worker } = await import('bullmq');

  _sunatSendWorker = new Worker(
    QUEUE_NAMES.SUNAT_SEND,
    async (job: any) => {
      console.log(`[sunat-send] Processing job ${job.id}: ${job.name}`);

      try {
        const result = await processEnviarComprobante(job.data as EnviarComprobanteJobData);
        console.log(`[sunat-send] Job ${job.id} completed successfully`);
        return result;
      } catch (error) {
        console.error(`[sunat-send] Job ${job.id} failed:`, error);
        throw error; // Re-throw to trigger BullMQ retry mechanism
      }
    },
    {
      connection: redisConnection,
      concurrency: 10,
    }
  );

  // Event handlers
  _sunatSendWorker.on('completed', (job: any) => {
    console.log(`[sunat-send] Job ${job.id} completed at ${new Date().toISOString()}`);
  });

  _sunatSendWorker.on('failed', (job: any, err: Error) => {
    console.error(
      `[sunat-send] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
      err.message
    );
  });

  _sunatSendWorker.on('progress', (job: any, progress: any) => {
    console.log(`[sunat-send] Job ${job.id} progress: ${JSON.stringify(progress)}`);
  });

  return _sunatSendWorker;
}

/**
 * Get or create the SUNAT consult worker
 */
export async function getSunatConsultWorker(): Promise<any> {
  if (_sunatConsultWorker) {
    return _sunatConsultWorker;
  }

  // Dynamic import to handle case where BullMQ is not yet installed
  const { Worker } = await import('bullmq');

  _sunatConsultWorker = new Worker(
    QUEUE_NAMES.SUNAT_CONSULT,
    async (job: any) => {
      console.log(`[sunat-consult] Processing job ${job.id}: ${job.name}`);

      try {
        const result = await processConsultarCdr(job.data as ConsultarCdrJobData);
        console.log(`[sunat-consult] Job ${job.id} completed successfully`);
        return result;
      } catch (error) {
        console.error(`[sunat-consult] Job ${job.id} failed:`, error);
        throw error; // Re-throw to trigger BullMQ retry mechanism
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  // Event handlers
  _sunatConsultWorker.on('completed', (job: any) => {
    console.log(`[sunat-consult] Job ${job.id} completed at ${new Date().toISOString()}`);
  });

  _sunatConsultWorker.on('failed', (job: any, err: Error) => {
    console.error(
      `[sunat-consult] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`,
      err.message
    );
  });

  _sunatConsultWorker.on('progress', (job: any, progress: any) => {
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
