/**
 * CDR (Constancia de Recepción) Parser
 *
 * Parses SUNAT's Response about document acceptance/rejection
 * The CDR is returned inside a SOAP response after sending a document
 */

import type { CdrResponse, SunatStatusCode, SunatStatus } from '../types';
import { parseSunatErrorCode } from '../errors/sunat-errors';

/**
 * Parse CDR from XML content
 *
 * The CDR (Constancia de Recepción) is a UBL document that contains
 * SUNAT's response about whether a document was accepted or rejected.
 *
 * @param xmlContent - The XML string containing the CDR or SOAP response with CDR
 * @returns CdrResponse with parsed status and content
 */
export function parseCDR(xmlContent: string): CdrResponse {
  // First, check if this is a SOAP envelope and extract the body
  const soapBody = extractSoapBody(xmlContent);

  // Check for SOAP fault
  if (soapBody.includes('soapenv:Fault') || soapBody.includes('Fault')) {
    return parseSoapFaultCDR(soapBody);
  }

  // Try to parse as ApplicationResponse (UBL CDR)
  if (soapBody.includes('ApplicationResponse')) {
    return parseApplicationResponse(soapBody);
  }

  // Check for direct applicationResponse element (without namespace)
  if (soapBody.includes('applicationResponse')) {
    return parseDirectApplicationResponse(soapBody);
  }

  // Try to parse status from SOAP response
  const statusResult = parseSoapStatusResponse(soapBody);
  if (statusResult) {
    return statusResult;
  }

  // If we can't determine the format, return an error
  return {
    id: '',
    statusCode: 99 as SunatStatusCode,
    status: 'UNKNOWN',
    description: 'Unable to parse CDR content',
  };
}

/**
 * Extract SOAP body content
 */
function extractSoapBody(xmlContent: string): string {
  // Remove XML declaration if present
  let content = xmlContent.replace(/<\?xml[^?]*\?>/, '').trim();

  // Check if this is a SOAP envelope and extract body
  const bodyMatch = content.match(/<soapenv:Body[^>]*>([\s\S]*?)<\/soapenv:Body>/i);
  if (bodyMatch) {
    return bodyMatch[1].trim();
  }

  // Check for alternative SOAP envelope format
  const soapBodyMatch = content.match(/<soap:Body[^>]*>([\s\S]*?)<\/soap:Body>/i);
  if (soapBodyMatch) {
    return soapBodyMatch[1].trim();
  }

  // Check for basic Body tag
  const basicBodyMatch = content.match(/<Body[^>]*>([\s\S]*?)<\/Body>/i);
  if (basicBodyMatch) {
    return basicBodyMatch[1].trim();
  }

  // Return original content if no SOAP envelope found
  return content;
}

/**
 * Parse SOAP fault
 */
function parseSoapFaultCDR(soapBody: string): CdrResponse {
  const faultStringMatch = soapBody.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/i);
  const faultCodeMatch = soapBody.match(/<faultcode[^>]*>([\s\S]*?)<\/faultcode>/i);

  const description = faultStringMatch
    ? faultStringMatch[1].replace(/<[^>]+>/g, '').trim()
    : 'SOAP Fault occurred';

  const errorCode = faultCodeMatch ? faultCodeMatch[1].replace(/<[^>]+>/g, '').trim() : 'SOAP_FAULT';

  return {
    id: '',
    statusCode: 99 as SunatStatusCode,
    status: 'EXCEPCION',
    description: description,
    notes: [`Error code: ${errorCode}`],
  };
}

/**
 * Parse ApplicationResponse (UBL CDR format)
 */
function parseApplicationResponse(soapBody: string): CdrResponse {
  // Extract ID
  const idMatch = soapBody.match(/<cbc:ID[^>]*>([\s\S]*?)<\/cbc:ID>/i);
  const id = idMatch ? idMatch[1].trim() : '';

  // Extract ResponseCode
  const responseCodeMatch = soapBody.match(
    /<cbc:ResponseCode[^>]*>([\s\S]*?)<\/cbc:ResponseCode>/i
  );
  const statusCode = responseCodeMatch
    ? (parseInt(responseCodeMatch[1].trim(), 10) as SunatStatusCode)
    : (99 as SunatStatusCode);

  // Extract Description
  const descriptionMatch = soapBody.match(
    /<cbc:Description[^>]*>([\s\S]*?)<\/cbc:Description>/i
  );
  const description = descriptionMatch ? descriptionMatch[1].trim() : parseSunatErrorCode(statusCode);

  // Extract Notes (can be multiple)
  const noteMatches = soapBody.matchAll(/<cbc:Note[^>]*>([\s\S]*?)<\/cbc:Note>/gi);
  const notes: string[] = [];
  for (const match of noteMatches) {
    const note = match[1].trim();
    if (note) {
      notes.push(note);
    }
  }

  // Extract ApplicationResponse content (CDR ZIP in base64)
  const applicationResponseMatch = soapBody.match(
    /<ext:ApplicationResponse[\s\S]*?>([\s\S]*?)<\/ext:ApplicationResponse>/i
  );
  let cdrContent: string | undefined;

  if (applicationResponseMatch) {
    // Look for the DocumentResponse -> Response -> DocumentReference
    const docRefMatch = applicationResponseMatch[1].match(
      /<cac:DocumentReference[\s\S]*?>[\s\S]*?<cbc:Attachment[\s\S]*?>[\s\S]*?<cbc:EmbeddedDocumentBinaryObject[^>]*>([\s\S]*?)<\/cbc:EmbeddedDocumentBinaryObject>/i
    );
    if (docRefMatch) {
      cdrContent = docRefMatch[1].trim();
    }
  }

  // Also check for Response -> DocumentReference pattern directly
  if (!cdrContent) {
    const attachmentMatch = soapBody.match(
      /<cbc:EmbeddedDocumentBinaryObject[^>]*fileName="[^"]*"[^>]*>([\s\S]*?)<\/cbc:EmbeddedDocumentBinaryObject>/i
    );
    if (attachmentMatch) {
      cdrContent = attachmentMatch[1].trim();
    }
  }

  // Determine status
  const status = mapStatusCodeToSunatStatus(statusCode);

  return {
    id,
    statusCode,
    status,
    description,
    notes: notes.length > 0 ? notes : undefined,
    cdrContent,
  };
}

/**
 * Parse direct applicationResponse element (without full ApplicationResponse wrapper)
 * This handles cases where SUNAT returns just the applicationResponse element
 */
function parseDirectApplicationResponse(soapBody: string): CdrResponse {
  // Look for applicationResponse content (may have namespace prefix like ns2:)
  const appResponseMatch = soapBody.match(
    /<(?:\w+:)?applicationResponse[^>]*>([\s\S]*?)<\/(?:\w+:)?applicationResponse>/i
  );

  let cdrContent: string | undefined;
  if (appResponseMatch) {
    cdrContent = appResponseMatch[1].trim();
  }

  // Default to success (code 0) when we have applicationResponse but no explicit status code
  const statusCode = 0 as SunatStatusCode;
  const status = mapStatusCodeToSunatStatus(statusCode);

  return {
    id: '',
    statusCode,
    status,
    description: 'Document received successfully',
    cdrContent,
  };
}

/**
 * Parse status response from SOAP (when status is returned directly in SOAP)
 */
function parseSoapStatusResponse(soapBody: string): CdrResponse | null {
  // Look for statusCode element
  const statusCodeMatch = soapBody.match(/<statusCode[^>]*>([\s\S]*?)<\/statusCode>/i);
  if (!statusCodeMatch) {
    return null;
  }

  const statusCode = parseInt(statusCodeMatch[1].trim(), 10) as SunatStatusCode;

  // Look for responseContent (CDR ZIP in base64)
  const responseContentMatch = soapBody.match(
    /<responseContent[^>]*>([\s\S]*?)<\/responseContent>/i
  );
  const cdrContent = responseContentMatch ? responseContentMatch[1].trim() : undefined;

  // Look for description
  const descriptionMatch = soapBody.match(
    /<description[^>]*>([\s\S]*?)<\/description>/i
  );
  const description = descriptionMatch
    ? descriptionMatch[1].trim()
    : parseSunatErrorCode(statusCode);

  // Look for notes
  const noteMatches = soapBody.matchAll(/<Note[^>]*>([\s\S]*?)<\/Note>/gi);
  const notes: string[] = [];
  for (const match of noteMatches) {
    const note = match[1].trim();
    if (note) {
      notes.push(note);
    }
  }

  const status = mapStatusCodeToSunatStatus(statusCode);

  return {
    id: '',
    statusCode,
    status,
    description,
    notes: notes.length > 0 ? notes : undefined,
    cdrContent,
  };
}

/**
 * Map numeric status code to SunatStatus enum
 * Based on Java reference implementation in Status.fromCode()
 */
function mapStatusCodeToSunatStatus(code: SunatStatusCode): SunatStatus {
  if (code === 0) return 'ACEPTADO';
  if (code === 98) return 'EN_PROCESO';
  if (code === 99) return 'EXCEPCION';
  if (code >= 100 && code < 2000) return 'EXCEPCION';
  if (code >= 2000 && code < 4000) return 'RECHAZADO';
  if (code >= 4000) return 'ACEPTADO';
  return 'UNKNOWN';
}

/**
 * Extract CDR content from SOAP response
 * Returns the base64 encoded ZIP content
 */
export function extractCDRContent(soapResponse: string): string | null {
  // Try applicationResponse first
  const appResponseMatch = soapResponse.match(
    /<applicationResponse[^>]*>([\s\S]*?)<\/applicationResponse>/i
  );
  if (appResponseMatch) {
    return appResponseMatch[1].trim();
  }

  // Try responseContent
  const responseContentMatch = soapResponse.match(
    /<responseContent[^>]*>([\s\S]*?)<\/responseContent>/i
  );
  if (responseContentMatch) {
    return responseContentMatch[1].trim();
  }

  // Try EmbeddedDocumentBinaryObject
  const embeddedMatch = soapResponse.match(
    /<cbc:EmbeddedDocumentBinaryObject[^>]*>([\s\S]*?)<\/cbc:EmbeddedDocumentBinaryObject>/i
  );
  if (embeddedMatch) {
    return embeddedMatch[1].trim();
  }

  return null;
}

/**
 * Check if the CDR indicates acceptance
 */
export function isCDRAccepted(cdr: CdrResponse): boolean {
  return cdr.status === 'ACEPTADO';
}

/**
 * Check if the CDR indicates rejection
 */
export function isCDRRejected(cdr: CdrResponse): boolean {
  return cdr.status === 'RECHAZADO';
}

/**
 * Check if the CDR indicates an exception
 */
export function isCDRException(cdr: CdrResponse): boolean {
  return cdr.status === 'EXCEPCION';
}
