/**
 * CDR (Constancia de Recepción) Module
 *
 * Exports all CDR-related functionality for parsing SUNAT responses
 */

// Parser
export { parseCDR, extractCDRContent, isCDRAccepted, isCDRRejected, isCDRException } from './parser';

// Types are re-exported from the parent module
export type { CdrResponse, CdrContent } from '../types';
