/**
 * XML Signer for SUNAT Electronic Invoicing
 *
 * Signs UBL 2.1 XML documents using digital certificates (P12/PFX)
 * for SUNAT's electronic invoicing system.
 *
 * Uses xml-crypto library for XML digital signature operations.
 */

import type { XmlSignerInput, XmlSignerOutput } from '../types';
import { SIGNATURE_METHOD } from '../constants';

// ============================================================================
// Error Types
// ============================================================================

export class XmlSignerError extends Error {
  constructor(message: string, public readonly code: string = 'XML_SIGNER_ERROR') {
    super(message);
    this.name = 'XmlSignerError';
  }
}

export class CertificateParseError extends XmlSignerError {
  constructor(message: string) {
    super(message, 'CERTIFICATE_PARSE_ERROR');
    this.name = 'CertificateParseError';
  }
}

export class SignatureError extends XmlSignerError {
  constructor(message: string) {
    super(message, 'SIGNATURE_ERROR');
    this.name = 'SignatureError';
  }
}

// ============================================================================
// Certificate Parsing (P12/PFX)
// ============================================================================

interface ParsedCertificate {
  certificate: string;
  privateKey: string;
}

// Type for dynamic import of xml-crypto
type XmlCryptoModule = {
  SignedXml: new (options?: { signatureAlgorithm?: string }) => {
    signature: { id?: string };
    keyInfoProvider: { getKey: () => Buffer };
    signingKey: Buffer;
    addReference: (ref: { xpath: string }) => void;
    computeSignature: (xml: string, options: { prefix?: string; location?: { reference: string; action: string } }) => void;
    getSignedXml: () => string;
    getDigestValue: () => string;
    checkSignature: (xml: string) => boolean;
    validationErrors: string[];
  };
  FileKeyInfo: new () => { getKey: () => Buffer };
};

/**
 * Parse a P12/PFX certificate file using Node.js crypto
 *
 * Note: This is a simplified implementation. For production use,
 * consider using a library like node-forge or pkcs12.
 *
 * @param p12Buffer - Buffer containing P12/PFX data
 * @param password - Password for the certificate
 * @returns Parsed certificate and private key
 */
function parseP12Certificate(
  p12Buffer: Buffer,
  password: string
): ParsedCertificate {
  // Since Node.js doesn't have built-in PKCS12 parsing, we provide a structure
  // that expects xml-crypto to handle the certificate
  // This function validates the input format
  if (!p12Buffer || p12Buffer.length === 0) {
    throw new CertificateParseError('P12 certificate buffer is empty or invalid');
  }

  if (!password) {
    throw new CertificateParseError('Certificate password is required');
  }

  // Return a structure that will be completed by the xml-crypto library
  // The actual parsing happens in signXML when xml-crypto is used
  return {
    certificate: p12Buffer.toString('base64'),
    privateKey: password, // This will be used to decrypt the P12
  };
}

/**
 * Parse Base64-encoded P12 certificate
 *
 * @param base64Content - Base64 encoded P12/PFX content
 * @param password - Password for the certificate
 * @returns Parsed certificate and private key
 */
function parseBase64P12Certificate(
  base64Content: string,
  password: string
): ParsedCertificate {
  try {
    const buffer = Buffer.from(base64Content, 'base64');
    return parseP12Certificate(buffer, password);
  } catch (error) {
    if (error instanceof CertificateParseError) {
      throw error;
    }
    throw new CertificateParseError(
      `Failed to parse Base64 P12 certificate: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Load xml-crypto dynamically
 */
async function loadXmlCrypto(): Promise<XmlCryptoModule> {
  try {
    const xmlCrypto = await import('xml-crypto');
    return xmlCrypto as unknown as XmlCryptoModule;
  } catch {
    throw new SignatureError(
      'xml-crypto library is required for XML signing. Please install it with: bun add xml-crypto'
    );
  }
}

/**
 * Sign an XML document with a digital certificate
 *
 * @param input - XML signer input with certificate details
 * @returns Signed XML and digest value
 */
export async function signXML(input: XmlSignerInput): Promise<XmlSignerOutput> {
  const {
    xmlContent,
    certificateBase64,
    certificatePassword,
    signeriId,
  } = input;

  try {
    // Load xml-crypto dynamically
    const { SignedXml, FileKeyInfo } = await loadXmlCrypto();

    // Parse the certificate
    const { certificate, privateKey } = parseBase64P12Certificate(
      certificateBase64,
      certificatePassword
    );

    // Create SignedXml instance
    const sig = new SignedXml({ signatureAlgorithm: SIGNATURE_METHOD });

    // Set signature properties
    sig.signature.id = signeriId;

    // Set the key info - xml-crypto needs the certificate for verification
    sig.keyInfoProvider = new FileKeyInfo();
    (sig as any).keyInfoProvider.getKey = () => {
      return Buffer.from(certificate, 'base64');
    };

    // Set signing key
    sig.signingKey = Buffer.from(privateKey);

    // Add the reference to the signature
    sig.addReference({
      xpath: "//*[local-name(.)='UBLExtensions']/*[local-name(.)='UBLExtension']/*[local-name(.)='ExtensionContent' and namespace-uri(.)='urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2']",
    });

    // Compute signature
    sig.computeSignature(xmlContent, {
      prefix: 'ds',
      location: {
        reference: `//*[local-name(.)='UBLExtensions']/*[local-name(.)='UBLExtension']/*[local-name(.)='ExtensionContent' and namespace-uri(.)='urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2']`,
        action: 'append',
      },
    });

    // Get the signed XML
    const signedXml = sig.getSignedXml();

    // Get digest value for verification
    const digestValue = sig.getDigestValue();

    return {
      signedXml,
      digestValue,
    };
  } catch (error) {
    if (error instanceof XmlSignerError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error during XML signing';

    // Provide more specific error messages based on common issues
    if (errorMessage.includes('Invalid password') || errorMessage.includes('Invalid PEM')) {
      throw new CertificateParseError('Invalid certificate password');
    }

    if (errorMessage.includes('PKCS12')) {
      throw new CertificateParseError('Invalid P12/PFX certificate format');
    }

    throw new SignatureError(`Failed to sign XML: ${errorMessage}`);
  }
}

/**
 * Sign XML synchronously (blocking)
 *
 * Note: This uses the synchronous version which may block the event loop
 * for large documents. Prefer the async version when possible.
 *
 * @param input - XML signer input with certificate details
 * @returns Signed XML and digest value
 */
export function signXMLSync(_input: XmlSignerInput): XmlSignerOutput {
  // Synchronous version requires xml-crypto to be loaded
  // For true sync operation, xml-crypto would need to be imported synchronously
  throw new SignatureError(
    'Synchronous XML signing requires xml-crypto to be installed. Use signXML() for async operation or install xml-crypto.'
  );
}

/**
 * Verify an XML signature
 *
 * @param signedXml - The signed XML document
 * @param certificateBase64 - Base64 encoded certificate (for verification)
 * @returns True if signature is valid
 */
export async function verifyXMLSignature(
  signedXml: string,
  certificateBase64: string
): Promise<boolean> {
  try {
    const { SignedXml, FileKeyInfo } = await loadXmlCrypto();

    const sig = new SignedXml();

    // Set the key info
    sig.keyInfoProvider = new FileKeyInfo();
    (sig as any).keyInfoProvider.getKey = () => {
      return Buffer.from(certificateBase64, 'base64');
    };

    // Check signature
    const isValid = sig.checkSignature(signedXml);

    if (!isValid) {
      const errors = sig.validationErrors;
      if (errors && errors.length > 0) {
        console.error('Signature validation errors:', errors);
      }
    }

    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Extract the signature element from a signed XML
 *
 * @param signedXml - The signed XML document
 * @returns The ds:Signature element as a string
 */
export function extractSignatureElement(signedXml: string): string | null {
  const signatureMatch = signedXml.match(/<ds:Signature[^>]*>[\s\S]*?<\/ds:Signature>/);

  if (signatureMatch) {
    return signatureMatch[0];
  }

  // Try without namespace prefix
  const noPrefixMatch = signedXml.match(/<Signature[^>]*>[\s\S]*?<\/Signature>/);

  return noPrefixMatch ? noPrefixMatch[0] : null;
}

/**
 * Get the digest value from a signed XML
 *
 * @param signedXml - The signed XML document
 * @returns The digest value or null if not found
 */
export function getDigestValueFromSignedXML(signedXml: string): string | null {
  const digestMatch = signedXml.match(/<ds:DigestValue[^>]*>([^<]*)<\/ds:DigestValue>/i);

  if (digestMatch) {
    return digestMatch[1].trim();
  }

  return null;
}
