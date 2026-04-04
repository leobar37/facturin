// Mock SUNAT server - public exports

export { startMockServer, stopMockServer, getMockServerUrl, app } from './server';
export { mockConfig } from './mock-config';
export { ticketStore } from './ticket-store';
export type { TicketRecord } from './ticket-store';
export { generateCDR, type CDRInput } from './cdr-generator';
export { zipXml, unzipBase64 } from './zip-utils';
export { parseSoapEnvelope } from './soap-parser';
export { getRequestHistory, getRequestCount, clearRequestHistory } from './request-history';
export type { HistoryEntry } from './request-history';
export type { MockMode, SoapOperation, MockStatusResponse, MockModeOptions, ParsedSoapRequest } from './types';
