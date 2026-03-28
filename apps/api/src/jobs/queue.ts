/**
 * BullMQ Queue Definitions for SUNAT Document Processing
 *
 * Defines two queues:
 * - sunat-send: For sending comprobantes to SUNAT
 * - sunat-consult: For consulting CDR status by ticket
 *
 * Queue instances are created lazily via the getSunatSendQueue/getSunatConsultQueue functions.
 */

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
  WEBHOOK: 'webhook',
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

export interface WebhookJobData {
  webhookId: string;
  event: string;
  payload: {
    event: string;
    timestamp: string;
    data: Record<string, unknown>;
  };
  attemptCount: number;
}

// Lazy-loaded queue instances (using any type until BullMQ is installed)
let _sunatSendQueue: any = null;
let _sunatConsultQueue: any = null;
let _webhookQueue: any = null;

/**
 * Get or create the SUNAT send queue instance
 */
export async function getSunatSendQueue(): Promise<any> {
  if (_sunatSendQueue) {
    return _sunatSendQueue;
  }

  // Dynamic import to handle case where BullMQ is not yet installed
  const { Queue } = await import('bullmq');
  _sunatSendQueue = new Queue(QUEUE_NAMES.SUNAT_SEND, {
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
export async function getSunatConsultQueue(): Promise<any> {
  if (_sunatConsultQueue) {
    return _sunatConsultQueue;
  }

  // Dynamic import to handle case where BullMQ is not yet installed
  const { Queue } = await import('bullmq');
  _sunatConsultQueue = new Queue(QUEUE_NAMES.SUNAT_CONSULT, {
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
): Promise<any> {
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
): Promise<any> {
  const queue = await getSunatConsultQueue();
  const jobOptions = delayMs ? { delay: delayMs } : undefined;
  return queue.add('consultar-cdr', {
    ticket,
    tenantId,
    comprobanteId,
  }, jobOptions);
}

/**
 * Get or create the webhook queue instance
 */
export async function getWebhookQueue(): Promise<any> {
  if (_webhookQueue) {
    return _webhookQueue;
  }

  const { Queue } = await import('bullmq');
  _webhookQueue = new Queue(QUEUE_NAMES.WEBHOOK, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        count: 100,
      },
      removeOnFail: {
        count: 500,
      },
    },
  });
  return _webhookQueue;
}

// Export for use in webhooks service
export { _webhookQueue as webhookQueue };
