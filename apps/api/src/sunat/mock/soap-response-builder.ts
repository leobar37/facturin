// SOAP response builder for the mock SUNAT server
// Produces responses that match the format expected by SunatClient's regex-based parsers

const SOAP_NS = 'http://schemas.xmlsoap.org/soap/envelope/';
const SER_NS = 'http://service.sunat.gob.pe';

/**
 * Build a SOAP envelope wrapping a body
 */
function buildSoapEnvelope(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="${SOAP_NS}" xmlns:ser="${SER_NS}">
  <soapenv:Body>
    ${body}
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Build a SOAP fault response
 * Matches the format expected by SunatClient.parseSoapFault():
 *   <soapenv:Fault><faultcode>...</faultcode><faultstring>...</faultstring></soapenv:Fault>
 */
export function buildSoapFault(faultCode: string, faultString: string): string {
  const body = `<soapenv:Fault>
      <faultcode>${escapeXml(faultCode)}</faultcode>
      <faultstring>${escapeXml(faultString)}</faultstring>
    </soapenv:Fault>`;
  return buildSoapEnvelope(body);
}

/**
 * Build a ticket response for async operations (sendBill, sendSummary, sendPack)
 * Matches the format expected by SunatClient.parseSendBillResponse():
 *   <ticket>(\d+)</ticket>
 */
export function buildTicketResponse(ticket: string): string {
  const body = `<ser:sendBillResponse>
      <ticket>${ticket}</ticket>
    </ser:sendBillResponse>`;
  return buildSoapEnvelope(body);
}

/**
 * Build a sync sendBill response with status code and CDR content
 * Matches the format expected by SunatClient.parseSendBillResponse():
 *   <statusCode>(\d+)</statusCode>
 *   <applicationResponse>([\s\S]*?)</applicationResponse>
 */
export function buildSendBillResponse(statusCode: number, cdrBase64: string): string {
  const body = `<ser:sendBillResponse>
      <statusCode>${statusCode}</statusCode>
      <applicationResponse>${cdrBase64}</applicationResponse>
    </ser:sendBillResponse>`;
  return buildSoapEnvelope(body);
}

/**
 * Build a getStatus response with status code and CDR content
 * Matches the format expected by SunatClient.parseStatusResponse():
 *   <statusCode>(\d+)</statusCode>
 *   <responseContent>([\s\S]*?)</responseContent>
 */
export function buildGetStatusResponse(statusCode: number, cdrBase64?: string): string {
  const responseContent = cdrBase64
    ? `\n      <responseContent>${cdrBase64}</responseContent>`
    : '';
  const body = `<ser:getStatusResponse>
      <statusCode>${statusCode}</statusCode>${responseContent}
    </ser:getStatusResponse>`;
  return buildSoapEnvelope(body);
}

/**
 * Build a getStatusCdr response
 */
export function buildGetStatusCdrResponse(
  statusCode: number,
  statusMessage: string,
  cdrBase64: string
): string {
  const body = `<ser:getStatusCdrResponse>
      <statusCode>${statusCode}</statusCode>
      <statusMessage>${escapeXml(statusMessage)}</statusMessage>
      <content>${cdrBase64}</content>
    </ser:getStatusCdrResponse>`;
  return buildSoapEnvelope(body);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
