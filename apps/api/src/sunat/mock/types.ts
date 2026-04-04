// Mock SUNAT server types

export type MockMode = 'accept' | 'reject' | 'observe' | 'exception' | 'auth-failure';

export type SoapOperation = 'sendBill' | 'sendSummary' | 'sendPack' | 'getStatus' | 'getStatusCdr';

export interface ParsedSoapRequest {
  operation: SoapOperation;
  credentials: {
    username: string;
    password: string;
  };
  params: Record<string, string>;
  rawBody: string;
}

export interface MockRequestRecord {
  timestamp: string;
  operation: SoapOperation;
  credentials: { username: string; password: string };
  fileName?: string;
  ticket?: string;
}

export interface MockStatusResponse {
  mode: MockMode;
  rejectCode?: string;
  observeCode?: string;
  observeNotes?: string[];
  defaultDelay: number;
  processingAttempts: number;
  ticketCount: number;
  requestCount: number;
  perOperationModes: Partial<Record<SoapOperation, { mode: MockMode; code?: string; notes?: string[] }>>;
}

export interface MockModeOptions {
  code?: string;
  notes?: string[];
}
