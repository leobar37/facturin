/**
 * SUNAT SOAP Client for electronic invoicing
 *
 * Handles communication with SUNAT BillService for:
 * - Sending signed XML documents (sendBill)
 * - Querying ticket status (getStatus)
 *
 * Configurable via instance_config table or environment variables.
 */

import { SOAP_NAMESPACES } from './constants';
import type {
  SunatCredentials,
  SunatEnvioResult,
  SunatStatusResult,
  SunatEnvironment,
  SunatStatusCode,
} from './types';
import { parseSunatErrorCode, isSunatAcceptanceCode } from './errors/sunat-errors';
import { getSunatSoapUrl } from './config';

export class SunatClient {
  private readonly credentials: SunatCredentials;
  private readonly soapEndpoint: string;

  constructor(credentials: SunatCredentials, soapEndpoint: string) {
    this.credentials = credentials;
    this.soapEndpoint = soapEndpoint;
  }

  /**
   * Create a SunatClient using config from instance_config
   * Falls back to default endpoints if not configured
   */
  static async create(credentials: SunatCredentials, environment: SunatEnvironment = 'production'): Promise<SunatClient> {
    const soapUrl = await getSunatSoapUrl(environment);
    return new SunatClient(credentials, soapUrl);
  }

  /**
   * Build SOAP envelope for sendBill operation
   */
  private buildSendBillEnvelope(fileName: string, xmlContent: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="${SOAP_NAMESPACES.soapenv}" xmlns:ser="${SOAP_NAMESPACES.ser}" xmlns:wsse="${SOAP_NAMESPACES.wsse}">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${this.escapeXml(this.credentials.username)}</wsse:Username>
        <wsse:Password>${this.escapeXml(this.credentials.password)}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ser:sendBill>
      <fileName>${this.escapeXml(fileName)}</fileName>
      <contentFile>${this.escapeXml(xmlContent)}</contentFile>
    </ser:sendBill>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  /**
   * Build SOAP envelope for getStatus operation
   */
  private buildGetStatusEnvelope(ticket: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="${SOAP_NAMESPACES.soapenv}" xmlns:ser="${SOAP_NAMESPACES.ser}" xmlns:wsse="${SOAP_NAMESPACES.wsse}">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${this.escapeXml(this.credentials.username)}</wsse:Username>
        <wsse:Password>${this.escapeXml(this.credentials.password)}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ser:getStatus>
      <ticket>${this.escapeXml(ticket)}</ticket>
    </ser:getStatus>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  /**
   * Escape special XML characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Send signed XML to SUNAT BillService
   *
   * @param fileName - Name of the file (e.g., "20480001234-01-F001-00000001.zip")
   * @param xmlContent - Base64 encoded XML content or the XML string
   * @returns SunatEnvioResult with success/ticket/error
   */
  async sendBill(fileName: string, xmlContent: string): Promise<SunatEnvioResult> {
    const envelope = this.buildSendBillEnvelope(fileName, xmlContent);

    try {
      const response = await this.makeSoapRequest(envelope, 'sendBill');

      // Parse the response to determine if it's a ticket or direct response
      const parsed = this.parseSendBillResponse(response);

      return parsed;
    } catch (error) {
      return this.handleSoapError(error);
    }
  }

  /**
   * Query SUNAT for ticket status
   *
   * @param ticket - The ticket number returned from sendBill
   * @returns SunatStatusResult with status code and response
   */
  async getStatus(ticket: string): Promise<SunatStatusResult> {
    const envelope = this.buildGetStatusEnvelope(ticket);

    try {
      const response = await this.makeSoapRequest(envelope, 'getStatus');

      // Parse the status response
      const parsed = this.parseStatusResponse(response);

      return parsed;
    } catch (error) {
      return this.handleStatusError(error);
    }
  }

  /**
   * Make SOAP request to SUNAT
   */
  private async makeSoapRequest(envelope: string, _operation: string): Promise<string> {
    const response = await fetch(this.soapEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: `""`,
      },
      body: envelope,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * Parse sendBill response
   * SUNAT can return:
   * - A ticket number (for async processing)
   * - A status code with CDR ZIP (for sync processing)
   */
  private parseSendBillResponse(xmlResponse: string): SunatEnvioResult {
    // Check for SOAP fault
    const faultMatch = xmlResponse.match(/<soapenv:Fault>[\s\S]*?<\/soapenv:Fault>/);
    if (faultMatch) {
      return this.parseSoapFault(faultMatch[0]);
    }

    // Check for ticket response (async mode)
    const ticketMatch = xmlResponse.match(/<ticket>(\d+)<\/ticket>/);
    if (ticketMatch) {
      return {
        success: true,
        ticket: ticketMatch[1],
        statusCode: 98 as SunatStatusCode, // EN_PROCESO
      };
    }

    // Check for response code (sync mode - direct CDR)
    const statusCodeMatch = xmlResponse.match(/<statusCode>(\d+)<\/statusCode>/);
    const responseContentMatch = xmlResponse.match(/<responseContent>([\s\S]*?)<\/responseContent>/);

    if (statusCodeMatch) {
      const statusCode = parseInt(statusCodeMatch[1], 10) as SunatStatusCode;
      const responseContent = responseContentMatch ? responseContentMatch[1] : undefined;

      if (isSunatAcceptanceCode(statusCode)) {
        return {
          success: true,
          statusCode,
          xmlContent: responseContent,
        };
      } else {
        return {
          success: false,
          statusCode,
          errorCode: String(statusCode),
          errorMessage: parseSunatErrorCode(statusCode),
        };
      }
    }

    // Check for applicationResponse (CDR in Base64)
    const applicationResponseMatch = xmlResponse.match(/<applicationResponse>([\s\S]*?)<\/applicationResponse>/);
    if (applicationResponseMatch) {
      // Direct CDR response - check for status in ResponseCode
      const responseCodeMatch = xmlResponse.match(/<ResponseCode>(\d+)<\/ResponseCode>/);
      if (responseCodeMatch) {
        const statusCode = parseInt(responseCodeMatch[1], 10) as SunatStatusCode;
        return {
          success: isSunatAcceptanceCode(statusCode),
          statusCode,
          xmlContent: applicationResponseMatch[1],
          errorCode: isSunatAcceptanceCode(statusCode) ? undefined : String(statusCode),
          errorMessage: isSunatAcceptanceCode(statusCode) ? undefined : parseSunatErrorCode(statusCode),
        };
      }

      // If no ResponseCode found, assume success with code 0
      return {
        success: true,
        statusCode: 0 as SunatStatusCode,
        xmlContent: applicationResponseMatch[1],
      };
    }

    // If we can't determine the response type, look for any statusCode
    const anyStatusMatch = xmlResponse.match(/<statusCode>(\d+)<\/statusCode>/);
    if (anyStatusMatch) {
      const statusCode = parseInt(anyStatusMatch[1], 10) as SunatStatusCode;
      return {
        success: isSunatAcceptanceCode(statusCode),
        statusCode,
        errorCode: isSunatAcceptanceCode(statusCode) ? undefined : String(statusCode),
        errorMessage: isSunatAcceptanceCode(statusCode) ? undefined : parseSunatErrorCode(statusCode),
      };
    }

    // Unable to parse - return generic error
    return {
      success: false,
      errorCode: 'PARSE_ERROR',
      errorMessage: 'Unable to parse SUNAT response',
    };
  }

  /**
   * Parse getStatus response
   */
  private parseStatusResponse(xmlResponse: string): SunatStatusResult {
    // Check for SOAP fault
    const faultMatch = xmlResponse.match(/<soapenv:Fault>[\s\S]*?<\/soapenv:Fault>/);
    if (faultMatch) {
      const faultResult = this.parseSoapFault(faultMatch[0]);
      return {
        success: false,
        statusCode: 99 as SunatStatusCode,
        status: 'EXCEPCION',
        errorCode: faultResult.errorCode,
        errorMessage: faultResult.errorMessage,
      };
    }

    // Check for statusCode and responseContent
    const statusCodeMatch = xmlResponse.match(/<statusCode>(\d+)<\/statusCode>/);
    const responseContentMatch = xmlResponse.match(/<responseContent>([\s\S]*?)<\/responseContent>/);

    if (statusCodeMatch) {
      const statusCode = parseInt(statusCodeMatch[1], 10) as SunatStatusCode;
      const responseContent = responseContentMatch ? responseContentMatch[1] : undefined;

      return {
        success: isSunatAcceptanceCode(statusCode),
        statusCode,
        status: this.mapStatusCode(statusCode),
        xmlContent: responseContent,
        errorCode: isSunatAcceptanceCode(statusCode) ? undefined : String(statusCode),
        errorMessage: isSunatAcceptanceCode(statusCode) ? undefined : parseSunatErrorCode(statusCode),
      };
    }

    // Check for ApplicationResponse CDR
    const applicationResponseMatch = xmlResponse.match(/<applicationResponse>([\s\S]*?)<\/applicationResponse>/);
    if (applicationResponseMatch) {
      const responseCodeMatch = xmlResponse.match(/<ResponseCode>(\d+)<\/ResponseCode>/);
      const statusCode = responseCodeMatch
        ? parseInt(responseCodeMatch[1], 10) as SunatStatusCode
        : 0 as SunatStatusCode;

      return {
        success: isSunatAcceptanceCode(statusCode),
        statusCode,
        status: this.mapStatusCode(statusCode),
        xmlContent: applicationResponseMatch[1],
      };
    }

    // Check for processStatusCode (alternative field name)
    const processStatusMatch = xmlResponse.match(/<processStatusCode>(\d+)<\/processStatusCode>/);
    if (processStatusMatch) {
      const statusCode = parseInt(processStatusMatch[1], 10) as SunatStatusCode;
      return {
        success: isSunatAcceptanceCode(statusCode),
        statusCode,
        status: this.mapStatusCode(statusCode),
        errorCode: isSunatAcceptanceCode(statusCode) ? undefined : String(statusCode),
        errorMessage: isSunatAcceptanceCode(statusCode) ? undefined : parseSunatErrorCode(statusCode),
      };
    }

    // Unable to parse
    return {
      success: false,
      statusCode: 99 as SunatStatusCode,
      status: 'EXCEPCION',
      errorCode: 'PARSE_ERROR',
      errorMessage: 'Unable to parse SUNAT status response',
    };
  }

  /**
   * Parse SOAP fault
   */
  private parseSoapFault(faultXml: string): SunatEnvioResult {
    const faultStringMatch = faultXml.match(/<faultstring>([\s\S]*?)<\/faultstring>/);
    const faultCodeMatch = faultXml.match(/<faultcode>([\s\S]*?)<\/faultcode>/);

    const errorMessage = faultStringMatch ? faultStringMatch[1].trim() : 'SOAP Fault occurred';
    const errorCode = faultCodeMatch ? faultCodeMatch[1].trim() : 'SOAP_FAULT';

    // Map common SOAP fault codes
    let mappedErrorCode = errorCode;
    if (errorCode.includes('1000') || errorMessage.includes('autenticación')) {
      mappedErrorCode = '1000';
    } else if (errorCode.includes('1001') || errorMessage.includes('acceso')) {
      mappedErrorCode = '1001';
    } else if (errorCode.includes('1002') || errorMessage.includes('certificado')) {
      mappedErrorCode = '1002';
    }

    return {
      success: false,
      errorCode: mappedErrorCode,
      errorMessage: errorMessage,
    };
  }

  /**
   * Map numeric status code to SunatStatus string
   */
  private mapStatusCode(code: SunatStatusCode): SunatStatusResult['status'] {
    if (code === 0) return 'ACEPTADO';
    if (code === 98) return 'EN_PROCESO';
    if (code === 99) return 'EXCEPCION';
    if (code >= 100 && code < 2000) return 'EXCEPCION';
    if (code >= 2000 && code < 4000) return 'RECHAZADO';
    if (code >= 4000) return 'ACEPTADO';
    return 'UNKNOWN';
  }

  /**
   * Handle SOAP errors for sendBill
   */
  private handleSoapError(error: unknown): SunatEnvioResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific HTTP status codes
    if (errorMessage.includes('401')) {
      return {
        success: false,
        errorCode: '1000',
        errorMessage: 'Invalid SUNAT credentials',
      };
    }

    if (errorMessage.includes('403')) {
      return {
        success: false,
        errorCode: '1001',
        errorMessage: 'Access denied to SUNAT service',
      };
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return {
        success: false,
        errorCode: '1007',
        errorMessage: 'Timeout connecting to SUNAT',
      };
    }

    return {
      success: false,
      errorCode: 'SYSTEM_ERROR',
      errorMessage: errorMessage,
    };
  }

  /**
   * Handle SOAP errors for getStatus
   */
  private handleStatusError(error: unknown): SunatStatusResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific HTTP status codes
    if (errorMessage.includes('401')) {
      return {
        success: false,
        statusCode: 99 as SunatStatusCode,
        status: 'EXCEPCION',
        errorCode: '1000',
        errorMessage: 'Invalid SUNAT credentials',
      };
    }

    if (errorMessage.includes('403')) {
      return {
        success: false,
        statusCode: 99 as SunatStatusCode,
        status: 'EXCEPCION',
        errorCode: '1001',
        errorMessage: 'Access denied to SUNAT service',
      };
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return {
        success: false,
        statusCode: 99 as SunatStatusCode,
        status: 'EXCEPCION',
        errorCode: '1007',
        errorMessage: 'Timeout connecting to SUNAT',
      };
    }

    return {
      success: false,
      statusCode: 99 as SunatStatusCode,
      status: 'EXCEPCION',
      errorCode: 'SYSTEM_ERROR',
      errorMessage: errorMessage,
    };
  }
}

// Factory function for creating client instances
export function createSunatClient(credentials: SunatCredentials, environment: SunatEnvironment = 'beta'): SunatClient {
  return new SunatClient(credentials, environment);
}
