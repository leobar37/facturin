/**
 * Type declarations for xml-crypto
 * This stub allows TypeScript to compile until xml-crypto is installed
 */

declare module 'xml-crypto' {
  export interface SignedXmlOptions {
    signatureAlgorithm?: string;
  }

  export interface KeyInfoProvider {
    getKey(): Buffer;
  }

  export interface Reference {
    xpath: string;
  }

  export interface ComputeSignatureOptions {
    prefix?: string;
    location?: {
      reference: string;
      action: string;
    };
  }

  export class SignedXml {
    signature: { id?: string };
    keyInfoProvider: KeyInfoProvider;
    signingKey: Buffer;
    validationErrors: string[];

    constructor(options?: SignedXmlOptions);

    addReference(ref: Reference): void;
    computeSignature(xml: string, options?: ComputeSignatureOptions): void;
    getSignedXml(): string;
    getDigestValue(): string;
    checkSignature(xml: string): boolean;
  }

  export class FileKeyInfo {
    getKey(): Buffer;
  }
}
