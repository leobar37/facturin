// Mock SUNAT SOAP Server
// Simulates SUNAT BillService and BillConsultService for development and testing

import { Elysia } from 'elysia';
import { parseSoapEnvelope } from './soap-parser';
import {
  buildSoapFault,
  buildTicketResponse,
  buildSendBillResponse,
  buildGetStatusResponse,
  buildGetStatusCdrResponse,
} from './soap-response-builder';
import { generateCDR, type CDRInput } from './cdr-generator';
import { zipXml } from './zip-utils';
import { ticketStore } from './ticket-store';
import { mockConfig } from './mock-config';
import { controlApi } from './control-api';
import { addRequestHistory, getRequestHistory, clearRequestHistory } from './request-history';
import type { SoapOperation, MockModeOptions } from './types';

/**
 * Resolve the effective mode for an operation (per-operation override or default)
 */
function resolveMode(operation: SoapOperation): { mode: string; options: MockModeOptions } {
  const override = mockConfig.getOperationMode(operation);
  if (override) {
    return { mode: override.mode, options: { code: override.code, notes: override.notes } };
  }
  const mode = mockConfig.defaultMode;
  const code = mode === 'auth-failure' ? mockConfig.authFailureCode : mode === 'observe' ? mockConfig.observeCode : mockConfig.rejectCode;
  const notes = mode === 'observe' ? mockConfig.observeNotes : undefined;
  return { mode, options: { code, notes } };
}

/**
 * Generate a CDR ZIP for a given response code
 */
async function buildCdrResponse(code: number, referenceId: string, notes?: string[]): Promise<string> {
  const description = code === 0 ? 'ACEPTADO' : code >= 4000 ? 'ACEPTADO CON OBSERVACIONES' : 'RECHAZADO';
  const cdrInput: CDRInput = {
    responseCode: code,
    description,
    referenceId,
    notes,
  };
  const cdrXml = generateCDR(cdrInput);
  return zipXml(cdrXml);
}

// ============================================================================
// Operation Handlers
// ============================================================================

async function handleSendBill(
  credentials: { username: string; password: string },
  fileName: string,
  _contentFile: string
): Promise<string> {
  addRequestHistory('sendBill', credentials, fileName);

  const delay = mockConfig.getDelay('sendBill');
  if (delay > 0) await Bun.sleep(delay);

  const { mode, options } = resolveMode('sendBill');

  // Auth failure mode
  if (mode === 'auth-failure') {
    const code = options.code || '0102';
    return buildSoapFault(code, getAuthErrorMessage(code));
  }

  // Exception mode
  if (mode === 'exception') {
    return buildGetStatusResponse(99);
  }

  // Determine response code
  let responseCode: number;
  let notes: string[] | undefined;

  if (mode === 'reject') {
    responseCode = parseInt(options.code || '2078', 10);
  } else if (mode === 'observe') {
    responseCode = parseInt(options.code || '4287', 10);
    notes = options.notes || [`${options.code || '4287'} - Observacion simulada por mock`];
  } else {
    // accept mode
    responseCode = 0;
  }

  const referenceId = fileName || 'F001-00000001';
  const cdrBase64 = await buildCdrResponse(responseCode, referenceId, notes);

  return buildSendBillResponse(responseCode, cdrBase64);
}

async function handleSendSummary(
  credentials: { username: string; password: string },
  fileName: string
): Promise<string> {
  addRequestHistory('sendSummary', credentials, fileName);

  const delay = mockConfig.getDelay('sendSummary');
  if (delay > 0) await Bun.sleep(delay);

  const { mode, options } = resolveMode('sendSummary');

  // Auth failure mode
  if (mode === 'auth-failure') {
    const code = options.code || '0102';
    return buildSoapFault(code, getAuthErrorMessage(code));
  }

  // Exception mode
  if (mode === 'exception') {
    return buildGetStatusResponse(99);
  }

  // sendSummary always returns a ticket (async mode)
  const ticket = ticketStore.createTicket(credentials.username, 'sendSummary');

  return buildTicketResponse(ticket);
}

async function handleSendPack(
  credentials: { username: string; password: string },
  fileName: string
): Promise<string> {
  addRequestHistory('sendPack', credentials, fileName);

  const delay = mockConfig.getDelay('sendPack');
  if (delay > 0) await Bun.sleep(delay);

  const { mode, options } = resolveMode('sendPack');

  if (mode === 'auth-failure') {
    const code = options.code || '0102';
    return buildSoapFault(code, getAuthErrorMessage(code));
  }

  if (mode === 'exception') {
    return buildGetStatusResponse(99);
  }

  const ticket = ticketStore.createTicket(credentials.username, 'sendPack');

  return buildTicketResponse(ticket);
}

async function handleGetStatus(
  credentials: { username: string; password: string },
  ticket: string
): Promise<string> {
  addRequestHistory('getStatus', credentials, undefined, ticket);

  const delay = mockConfig.getDelay('getStatus');
  if (delay > 0) await Bun.sleep(delay);

  const { mode, options } = resolveMode('getStatus');

  // Auth failure mode
  if (mode === 'auth-failure') {
    const code = options.code || '0102';
    return buildSoapFault(code, getAuthErrorMessage(code));
  }

  // Look up ticket
  const ticketRecord = ticketStore.getTicket(ticket);
  if (!ticketRecord) {
    // Ticket not found
    return buildGetStatusResponse(3002);
  }

  // Already resolved
  if (ticketRecord.status === 'resolved') {
    const code = ticketRecord.finalCode ?? 0;
    const cdrBase64 = await buildCdrResponse(code, ticket);
    return buildGetStatusResponse(code, cdrBase64);
  }

  // Still processing - increment attempts
  ticketRecord.attempts++;
  const processingAttempts = mockConfig.processingAttempts;

  if (ticketRecord.attempts < processingAttempts) {
    // Still in process
    return buildGetStatusResponse(98);
  }

  // Processing complete - resolve based on configured mode
  let finalCode: number;
  let notes: string[] | undefined;

  if (mode === 'reject') {
    finalCode = parseInt(options.code || '2078', 10);
  } else if (mode === 'observe') {
    finalCode = parseInt(options.code || '4287', 10);
    notes = options.notes || [`${options.code || '4287'} - Observacion simulada por mock`];
  } else if (mode === 'exception') {
    finalCode = 99;
  } else {
    finalCode = 0;
  }

  ticketStore.resolveTicket(ticket, finalCode);
  const cdrBase64 = await buildCdrResponse(finalCode, ticket, notes);
  return buildGetStatusResponse(finalCode, cdrBase64);
}

async function handleGetStatusCdr(
  credentials: { username: string; password: string },
  rucComprobante: string,
  tipoComprobante: string,
  serieComprobante: string,
  numeroComprobante: string
): Promise<string> {
  addRequestHistory('getStatusCdr', credentials, `${rucComprobante}-${tipoComprobante}-${serieComprobante}-${numeroComprobante}`);

  const delay = mockConfig.getDelay('getStatusCdr');
  if (delay > 0) await Bun.sleep(delay);

  const { mode, options } = resolveMode('getStatusCdr');

  if (mode === 'auth-failure') {
    const code = options.code || '0102';
    return buildSoapFault(code, getAuthErrorMessage(code));
  }

  let responseCode: number;
  let statusMessage: string;
  let notes: string[] | undefined;

  if (mode === 'reject') {
    responseCode = parseInt(options.code || '2078', 10);
    statusMessage = 'RECHAZADO';
  } else if (mode === 'observe') {
    responseCode = parseInt(options.code || '4287', 10);
    statusMessage = 'ACEPTADO CON OBSERVACIONES';
    notes = options.notes;
  } else if (mode === 'exception') {
    responseCode = 99;
    statusMessage = 'EXCEPCION';
  } else {
    responseCode = 0;
    statusMessage = 'ACEPTADO';
  }

  const referenceId = `${serieComprobante}-${numeroComprobante}`;
  const cdrBase64 = await buildCdrResponse(responseCode, referenceId, notes);

  return buildGetStatusCdrResponse(responseCode, statusMessage, cdrBase64);
}

function getAuthErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    '0101': 'Security header incorrect',
    '0102': 'Usuario o contraseña incorrectos',
    '0103': 'Usuario no existe',
    '0105': 'Usuario no esta activo',
    '0112': 'Usuario debe ser secundario',
    '0113': 'Usuario no esta afiliado a emision electronica',
  };
  return messages[code] || 'Error de autenticacion';
}

// ============================================================================
// Elysia App
// ============================================================================

const app = new Elysia({ prefix: '' })
  .use(controlApi)
  .post('/billService', async ({ body }) => {
    const rawXml = typeof body === 'string' ? body : body?.toString() || '';
    console.log('[MockSUNAT] POST /billService received');

    try {
      const parsed = parseSoapEnvelope(rawXml);
      const { params } = parsed;

      switch (parsed.operation) {
        case 'sendBill':
          return await handleSendBill(parsed.credentials, params.fileName || '', params.contentFile || '');
        case 'sendSummary':
          return await handleSendSummary(parsed.credentials, params.fileName || '');
        case 'sendPack':
          return await handleSendPack(parsed.credentials, params.fileName || '');
        case 'getStatus':
          return await handleGetStatus(parsed.credentials, params.ticket || '');
        default:
          return buildSoapFault('INVALID_OPERATION', `Unknown operation: ${parsed.operation}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      console.error('[MockSUNAT] Error processing request:', message);
      return buildSoapFault('SERVER_ERROR', message);
    }
  })
  .post('/billConsultService', async ({ body }) => {
    const rawXml = typeof body === 'string' ? body : body?.toString() || '';
    console.log('[MockSUNAT] POST /billConsultService received');

    try {
      const parsed = parseSoapEnvelope(rawXml);
      const { params } = parsed;

      switch (parsed.operation) {
        case 'getStatusCdr': {
          return await handleGetStatusCdr(
            parsed.credentials,
            params.rucComprobante || '',
            params.tipoComprobante || '',
            params.serieComprobante || '',
            params.numeroComprobante || ''
          );
        }
        case 'getStatus':
          return await handleGetStatus(parsed.credentials, params.ticket || '');
        default:
          return buildSoapFault('INVALID_OPERATION', `Unknown operation: ${parsed.operation}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      console.error('[MockSUNAT] Error processing request:', message);
      return buildSoapFault('SERVER_ERROR', message);
    }
  });

// ============================================================================
// Control API (mounted here, defined in control-api.ts)
// ============================================================================

export { getRequestHistory, clearRequestHistory };

// ============================================================================
// Server Lifecycle
// ============================================================================

let server: ReturnType<typeof app.listen> | null = null;

export function getMockServerUrl(): string {
  const port = process.env.MOCK_SUNAT_PORT || '3099';
  return `http://localhost:${port}`;
}

export async function startMockServer(port?: number): Promise<void> {
  const actualPort = port || parseInt(process.env.MOCK_SUNAT_PORT || '3099', 10);
  server = await app.listen(actualPort);
  console.log(`[MockSUNAT] Server running on http://localhost:${actualPort}`);
  console.log(`[MockSUNAT] BillService:      http://localhost:${actualPort}/billService`);
  console.log(`[MockSUNAT] BillConsultService: http://localhost:${actualPort}/billConsultService`);
}

export async function stopMockServer(): Promise<void> {
  if (server) {
    try {
      server.stop();
    } catch {
      // Elysia may throw if already stopped
    }
    server = null;
    console.log('[MockSUNAT] Server stopped');
  }
}

// Auto-start when run directly
const isDirectRun = process.argv[1]?.includes('mock/server');
if (isDirectRun) {
  startMockServer().catch(console.error);
}

export { app };
