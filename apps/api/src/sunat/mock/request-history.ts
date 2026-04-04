// Request history for control API (capped at 100)

import type { SoapOperation } from './types';

export interface HistoryEntry {
  timestamp: string;
  operation: SoapOperation;
  credentials: { username: string; password: string };
  fileName?: string;
  ticket?: string;
}

const history: HistoryEntry[] = [];
const MAX_HISTORY = 100;

export function addRequestHistory(
  operation: SoapOperation,
  credentials: { username: string; password: string },
  fileName?: string,
  ticket?: string
): void {
  history.push({
    timestamp: new Date().toISOString(),
    operation,
    credentials: { username: credentials.username, password: '***' },
    fileName,
    ticket,
  });
  if (history.length > MAX_HISTORY) {
    history.shift();
  }
}

export function getRequestHistory(): HistoryEntry[] {
  return history;
}

export function getRequestCount(): number {
  return history.length;
}

export function clearRequestHistory(): void {
  history.length = 0;
}
