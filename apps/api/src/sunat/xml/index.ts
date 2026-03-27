/**
 * SUNAT XML Module - UBL 2.1 XML Generation and Signing
 *
 * This module provides functionality for:
 * - Generating UBL 2.1 XML documents for SUNAT electronic invoicing
 * - Signing XML documents with digital certificates
 * - Verifying XML signatures
 */

// Generator exports
export {
  generateInvoiceXML,
  generateCreditNoteXML,
  generateDebitNoteXML,
  generateXML,
} from './generator';

export { generateDespatchAdviceXML } from './guide';
export { generatePerceptionXML } from './perception';

// Signer exports
export {
  signXML,
  signXMLSync,
  verifyXMLSignature,
  extractSignatureElement,
  getDigestValueFromSignedXML,
  XmlSignerError,
  CertificateParseError,
  SignatureError,
} from './signer';

// Re-export types for convenience
export type {
  XmlSignerInput,
  XmlSignerOutput,
} from '../types';
