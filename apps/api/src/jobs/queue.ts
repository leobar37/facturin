/**
 * BullMQ Queue Definitions for SUNAT Document Processing
 *
 * Defines two queues:
 * - sunat-send: For sending comprobantes to SUNAT
 * - sunat-consult: For consulting CDR status by ticket
 *
 * Queue instances are created lazily via the getSunatSendQueue/getSunatConsultQueue functions.
 */

import type { Queue as BullMQQueue, Job as BullMQJob } from 'bullmq';

// Redis connection configuration
// In production, use REDIS_URL env variable
export const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6380,
  password: process.env.REDIS_PASSWORD || undefined,
};

/**
 * Queue names
 */
export const QUEUE_NAMES = {
  SUNAT_SEND: 'sunat-send',
  SUNAT_CONSULT: 'sunat-consult',
} as const;

/**
 * Job data types for type safety
 */

export interface EnviarComprobanteJobData {
  comprobanteId: string;
  tenantId: string;
}

export interface ConsultarCdrJobData {
  ticket: string;
  tenantId: string;
  comprobanteId: string;
  attemptNumber?: number;
}

// Lazy-loaded queue instances with proper BullMQ Queue types
let _sunatSendQueue: BullMQQueue<EnviarComprobanteJobData> | null = null;
let _sunatConsultQueue: BullMQQueue<ConsultarCdrJobData> | null = null;

/**
 * Get or create the SUNAT send queue instance
 */
export async function getSunatSendQueue(): Promise<BullMQQueue<EnviarComprobanteJobData>> {
  if (_sunatSendQueue) {
    return _sunatSendQueue;
  }

  // Dynamic import to handle case where BullMQ is not yet installed
  const { Queue } = await import('bullmq');
  _sunatSendQueue = new Queue<EnviarComprobanteJobData>(QUEUE_NAMES.SUNAT_SEND, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000, // 1 second initial delay
      },
      removeOnComplete: {
        count: 100, // Keep last 100 completed jobs
      },
      removeOnFail: {
        count: 500, // Keep last 500 failed jobs for debugging
      },
    },
  });
  return _sunatSendQueue;
}

/**
 * Get or create the SUNAT consult queue instance
 */
export async function getSunatConsultQueue(): Promise<BullMQQueue<ConsultarCdrJobData>> {
  if (_sunatConsultQueue) {
    return _sunatConsultQueue;
  }

  // Dynamic import to handle case where BullMQ is not yet installed
  const { Queue } = await import('bullmq');
  _sunatConsultQueue = new Queue<ConsultarCdrJobData>(QUEUE_NAMES.SUNAT_CONSULT, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000, // 2 seconds initial delay
      },
      removeOnComplete: {
        count: 100,
      },
      removeOnFail: {
        count: 500,
      },
    },
  });
  return _sunatConsultQueue;
}

/**
 * Enqueue a comprobante for SUNAT sending
 */
export async function enqueueEnviarComprobante(
  comprobanteId: string,
  tenantId: string
): Promise<BullMQJob<EnviarComprobanteJobData>> {
  const queue = await getSunatSendQueue();
  return queue.add('enviar-comprobante', {
    comprobanteId,
    tenantId,
  });
}

/**
 * Enqueue a CDR consultation with delay
 */
export async function enqueueConsultarCdr(
  ticket: string,
  tenantId: string,
  comprobanteId: string,
  delayMs?: number
): Promise<BullMQJob<ConsultarCdrJobData>> {
  const queue = await getSunatConsultQueue();
  const jobOptions = delayMs ? { delay: delayMs } : undefined;
  return queue.add('consultar-cdr', {
    ticket,
    tenantId,
    comprobanteId,
  }, jobOptions);
}
