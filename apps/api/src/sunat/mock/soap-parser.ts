// SOAP envelope parser for the mock SUNAT server

import { XMLParser } from 'fast-xml-parser';
import type { ParsedSoapRequest, SoapOperation } from './types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

const KNOWN_OPERATIONS: SoapOperation[] = ['sendBill', 'sendSummary', 'sendPack', 'getStatus', 'getStatusCdr'];

/**
 * Parse a raw SOAP envelope XML string into a structured request
 */
export function parseSoapEnvelope(rawXml: string): ParsedSoapRequest {
  const parsed = parser.parse(rawXml);

  const envelope = findChild(parsed, 'Envelope');
  const header = envelope ? findChild(envelope, 'Header') : null;
  const body = envelope ? findChild(envelope, 'Body') : null;

  const credentials = extractCredentials(header);
  const { operation, params } = extractOperation(body);

  return {
    operation,
    credentials,
    params,
    rawBody: rawXml,
  };
}

/**
 * Find a direct child element by local tag name (stripping namespace prefix).
 * Only searches one level deep, not recursively.
 */
function findChild(obj: unknown, tagName: string): Record<string, unknown> | null {
  if (!obj || typeof obj !== 'object') return null;

  const asRecord = obj as Record<string, unknown>;
  for (const key of Object.keys(asRecord)) {
    // Skip XML declaration and attributes
    if (key === '?xml' || key.startsWith('@_')) continue;

    const localName = key.includes(':') ? key.split(':').pop()! : key;
    if (localName === tagName) {
      const value = asRecord[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        return value[0] as Record<string, unknown>;
      }
      return null;
    }
  }

  return null;
}

function extractCredentials(header: Record<string, unknown> | null): { username: string; password: string } {
  if (!header) return { username: '', password: '' };

  const security = findChild(header, 'Security');
  if (!security) return { username: '', password: '' };

  const usernameToken = findChild(security, 'UsernameToken');
  if (!usernameToken) return { username: '', password: '' };

  return {
    username: extractText(usernameToken, 'Username'),
    password: extractText(usernameToken, 'Password'),
  };
}

function extractText(parent: Record<string, unknown>, tagName: string): string {
  for (const key of Object.keys(parent)) {
    if (key.startsWith('@_') || key === '#text') continue;

    const localName = key.includes(':') ? key.split(':').pop()! : key;
    if (localName === tagName) {
      return textFromValue(parent[key]);
    }
  }
  return '';
}

function textFromValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    const asRecord = value as Record<string, unknown>;
    if (typeof asRecord['#text'] === 'string') return asRecord['#text'].trim();
  }
  return '';
}

function extractOperation(body: Record<string, unknown> | null): { operation: SoapOperation; params: Record<string, string> } {
  if (!body) return { operation: 'sendBill', params: {} };

  for (const key of Object.keys(body)) {
    if (key.startsWith('@_') || key === '#text') continue;

    const localName = key.includes(':') ? key.split(':').pop()! : key;

    if (KNOWN_OPERATIONS.includes(localName as SoapOperation)) {
      const operationBody = body[key];
      const params = extractParams(operationBody);
      return { operation: localName as SoapOperation, params };
    }
  }

  return { operation: 'sendBill', params: {} };
}

function extractParams(operationBody: unknown): Record<string, string> {
  const params: Record<string, string> = {};

  let obj: Record<string, unknown> | null = null;
  if (Array.isArray(operationBody)) {
    obj = operationBody[0] as Record<string, unknown> | null;
  } else if (operationBody && typeof operationBody === 'object') {
    obj = operationBody as Record<string, unknown>;
  }

  if (!obj) return params;

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('@_') || key === '#text') continue;
    const text = textFromValue(value);
    if (text) {
      params[key] = text;
    }
  }

  return params;
}
