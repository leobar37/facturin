// Control API for programmatic mock server configuration
// Mounted at /_control prefix on the mock server

import { Elysia } from 'elysia';
import { mockConfig } from './mock-config';
import { ticketStore } from './ticket-store';
import { getRequestCount, clearRequestHistory } from './request-history';
import type { MockMode, SoapOperation, MockStatusResponse } from './types';

export const controlApi = new Elysia({ prefix: '/_control' })
  .get('/status', () => {
    const status: MockStatusResponse = {
      mode: mockConfig.defaultMode,
      rejectCode: mockConfig.rejectCode,
      observeCode: mockConfig.observeCode,
      observeNotes: mockConfig.observeNotes,
      defaultDelay: mockConfig.defaultDelay,
      processingAttempts: mockConfig.processingAttempts,
      ticketCount: ticketStore.count,
      requestCount: getRequestCount(),
      perOperationModes: Object.fromEntries(
        (['sendBill', 'sendSummary', 'sendPack', 'getStatus', 'getStatusCdr'] as SoapOperation[])
          .map(op => {
            const override = mockConfig.getOperationMode(op);
            return override ? [op, override] : null;
          })
          .filter(Boolean) as [string, { mode: MockMode; code?: string; notes?: string[] }][]
      ),
    };
    return status;
  })

  .post('/mode', ({ body }) => {
    const { mode, code, notes } = body as { mode: MockMode; code?: string; notes?: string[] };
    mockConfig.setMode(mode, { code, notes });
    return { success: true, mode };
  })

  .post('/operation-mode', ({ body }) => {
    const { operation, mode, code, notes } = body as {
      operation: SoapOperation; mode: MockMode; code?: string; notes?: string[];
    };
    mockConfig.setOperationMode(operation, mode, { code, notes });
    return { success: true, operation, mode };
  })

  .post('/delay', ({ body }) => {
    const { ms, operation } = body as { ms: number; operation?: SoapOperation };
    if (operation) {
      mockConfig.setOperationDelay(operation, ms);
    } else {
      mockConfig.setDelay(ms);
    }
    return { success: true, ms, operation };
  })

  .post('/processing-attempts', ({ body }) => {
    const { attempts } = body as { attempts: number };
    mockConfig.setProcessingAttempts(attempts);
    return { success: true, attempts };
  })

  .post('/reset', () => {
    mockConfig.reset();
    ticketStore.reset();
    clearRequestHistory();
    return { success: true };
  })

  .get('/tickets', () => {
    return ticketStore.getAllTickets().map(t => ({
      ticket: t.ticket,
      ruc: t.ruc,
      operation: t.operation,
      status: t.status,
      attempts: t.attempts,
      finalCode: t.finalCode,
      createdAt: t.createdAt.toISOString(),
      resolvedAt: t.resolvedAt?.toISOString(),
    }));
  })

  .get('/tickets/:ticket', ({ params }) => {
    const record = ticketStore.getTicket(params.ticket);
    if (!record) {
      return new Response(JSON.stringify({ error: 'Ticket not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return {
      ticket: record.ticket,
      ruc: record.ruc,
      operation: record.operation,
      status: record.status,
      attempts: record.attempts,
      finalCode: record.finalCode,
      createdAt: record.createdAt.toISOString(),
      resolvedAt: record.resolvedAt?.toISOString(),
    };
  });
