// Mock server configuration - configurable response modes and delays

import type { MockMode, SoapOperation } from './types';

interface OperationModeOverride {
  mode: MockMode;
  code?: string;
  notes?: string[];
}

class MockConfigClass {
  defaultMode: MockMode = 'accept';
  rejectCode: string = '2078';
  observeCode: string = '4287';
  observeNotes: string[] = [];
  defaultDelay: number = 0;
  processingAttempts: number = 2;
  authFailureCode: string = '0102';

  private perOperationModes: Map<string, OperationModeOverride> = new Map();
  private perOperationDelay: Map<string, number> = new Map();

  /**
   * Set the default mode for all operations
   */
  setMode(mode: MockMode, options?: { code?: string; notes?: string[] }): void {
    this.defaultMode = mode;
    if (options?.code) {
      if (mode === 'reject') this.rejectCode = options.code;
      if (mode === 'observe') {
        this.observeCode = options.code;
        this.observeNotes = options.notes || [];
      }
    }
    if (options?.notes) {
      this.observeNotes = options.notes;
    }
    console.log(`[MockSUNAT] Mode set to: ${mode}${options?.code ? ` (code: ${options.code})` : ''}`);
  }

  /**
   * Set mode override for a specific operation
   */
  setOperationMode(operation: SoapOperation, mode: MockMode, options?: { code?: string; notes?: string[] }): void {
    this.perOperationModes.set(operation, { mode, code: options?.code, notes: options?.notes });
  }

  /**
   * Get the effective mode for an operation
   */
  getOperationMode(operation: SoapOperation): OperationModeOverride | null {
    return this.perOperationModes.get(operation) || null;
  }

  /**
   * Set default delay for all operations
   */
  setDelay(ms: number): void {
    this.defaultDelay = ms;
  }

  /**
   * Set delay for a specific operation
   */
  setOperationDelay(operation: SoapOperation, ms: number): void {
    this.perOperationDelay.set(operation, ms);
  }

  /**
   * Get the effective delay for an operation
   */
  getDelay(operation: SoapOperation): number {
    return this.perOperationDelay.get(operation) ?? this.defaultDelay;
  }

  /**
   * Set how many times getStatus returns 98 before resolving
   */
  setProcessingAttempts(n: number): void {
    this.processingAttempts = n;
  }

  /**
   * Set auth failure code
   */
  setAuthFailureCode(code: string): void {
    this.authFailureCode = code;
  }

  /**
   * Reset all configuration to defaults
   */
  reset(): void {
    this.defaultMode = 'accept';
    this.rejectCode = '2078';
    this.observeCode = '4287';
    this.observeNotes = [];
    this.defaultDelay = 0;
    this.processingAttempts = 2;
    this.authFailureCode = '0102';
    this.perOperationModes.clear();
    this.perOperationDelay.clear();
    console.log('[MockSUNAT] Config reset to defaults');
  }
}

export const mockConfig = new MockConfigClass();
