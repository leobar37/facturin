import { describe, expect, test, beforeEach } from 'bun:test';
import { mockConfig } from '../mock-config';
import { ticketStore } from '../ticket-store';

describe('MockConfig', () => {
  beforeEach(() => {
    mockConfig.reset();
  });

  test('defaults to accept mode', () => {
    expect(mockConfig.defaultMode).toBe('accept');
  });

  test('setMode changes default mode', () => {
    mockConfig.setMode('reject', { code: '2078' });
    expect(mockConfig.defaultMode).toBe('reject');
    expect(mockConfig.rejectCode).toBe('2078');
  });

  test('setMode with observe stores notes', () => {
    mockConfig.setMode('observe', { code: '4287', notes: ['4287 - test'] });
    expect(mockConfig.defaultMode).toBe('observe');
    expect(mockConfig.observeCode).toBe('4287');
    expect(mockConfig.observeNotes).toEqual(['4287 - test']);
  });

  test('setOperationMode overrides default for specific operation', () => {
    mockConfig.setMode('accept');
    mockConfig.setOperationMode('sendBill', 'reject', { code: '2012' });

    expect(mockConfig.defaultMode).toBe('accept');
    expect(mockConfig.getOperationMode('sendBill')).toEqual({ mode: 'reject', code: '2012', notes: undefined });
    expect(mockConfig.getOperationMode('getStatus')).toBeNull();
  });

  test('setDelay sets default delay', () => {
    mockConfig.setDelay(100);
    expect(mockConfig.defaultDelay).toBe(100);
    expect(mockConfig.getDelay('sendBill')).toBe(100);
  });

  test('setOperationDelay overrides default delay', () => {
    mockConfig.setDelay(50);
    mockConfig.setOperationDelay('sendBill', 200);

    expect(mockConfig.getDelay('sendBill')).toBe(200);
    expect(mockConfig.getDelay('getStatus')).toBe(50);
  });

  test('reset restores all defaults', () => {
    mockConfig.setMode('reject');
    mockConfig.setDelay(500);
    mockConfig.setProcessingAttempts(5);
    mockConfig.setOperationMode('sendBill', 'observe');

    mockConfig.reset();

    expect(mockConfig.defaultMode).toBe('accept');
    expect(mockConfig.defaultDelay).toBe(0);
    expect(mockConfig.processingAttempts).toBe(2);
    expect(mockConfig.getOperationMode('sendBill')).toBeNull();
  });
});

describe('TicketStore', () => {
  beforeEach(() => {
    ticketStore.reset();
  });

  test('creates a 15-digit ticket', () => {
    const ticket = ticketStore.createTicket('20123456789', 'sendSummary');
    expect(ticket).toHaveLength(15);
    expect(/^\d{15}$/.test(ticket)).toBe(true);
  });

  test('retrieves a created ticket', () => {
    const ticket = ticketStore.createTicket('20123456789', 'sendSummary');
    const record = ticketStore.getTicket(ticket);

    expect(record).toBeDefined();
    expect(record!.ticket).toBe(ticket);
    expect(record!.ruc).toBe('20123456789');
    expect(record!.operation).toBe('sendSummary');
    expect(record!.status).toBe('processing');
    expect(record!.attempts).toBe(0);
    expect(record!.finalCode).toBeNull();
  });

  test('resolves a ticket', () => {
    const ticket = ticketStore.createTicket('20123456789', 'sendSummary');
    ticketStore.resolveTicket(ticket, 0);

    const record = ticketStore.getTicket(ticket);
    expect(record!.status).toBe('resolved');
    expect(record!.finalCode).toBe(0);
    expect(record!.resolvedAt).toBeDefined();
  });

  test('returns undefined for unknown ticket', () => {
    expect(ticketStore.getTicket('000000000000000')).toBeUndefined();
  });

  test('getAllTickets returns all tickets', () => {
    ticketStore.createTicket('20123456789', 'sendSummary');
    ticketStore.createTicket('20123456789', 'sendSummary');

    expect(ticketStore.getAllTickets()).toHaveLength(2);
  });

  test('reset clears all tickets', () => {
    ticketStore.createTicket('20123456789', 'sendSummary');
    ticketStore.createTicket('20123456789', 'sendSummary');
    ticketStore.reset();

    expect(ticketStore.count).toBe(0);
  });
});
