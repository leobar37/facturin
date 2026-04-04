// CDR ApplicationResponse XML generator
// Produces UBL 2.1 ApplicationResponse XML parseable by the existing CDRParser

export interface CDRInput {
  responseCode: number;
  description: string;
  referenceId: string;
  notes?: string[];
  responseDate?: string;
}

/**
 * Generate a UBL 2.1 ApplicationResponse XML
 *
 * The CDRParser.parseCDR() expects:
 * - <cbc:ResponseCode> for status code
 * - <cbc:Description> for description
 * - <cbc:Note> for observations
 * - <cbc:ID> for reference ID
 *
 * The SunatClient.parseSendBillResponse() expects:
 * - <applicationResponse> wrapping the CDR content (without namespace prefix)
 * - <ResponseCode> inside (without namespace prefix)
 */
export function generateCDR(input: CDRInput): string {
  const date = input.responseDate || new Date().toISOString().split('T')[0];

  const notesXml = input.notes?.map(note => `        <cbc:Note>${escapeXml(note)}</cbc:Note>`).join('\n') || '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2"
    xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
    xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
    xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <cbc:ID>${escapeXml(input.referenceId)}</cbc:ID>
  <cbc:ResponseDate>${date}</cbc:ResponseDate>
  <cac:DocumentResponse>
    <cac:Response>
      <cbc:ReferenceID>${escapeXml(input.referenceId)}</cbc:ReferenceID>
      <cbc:ResponseCode>${input.responseCode}</cbc:ResponseCode>
      <cbc:Description>${escapeXml(input.description)}</cbc:Description>
${notesXml}    </cac:Response>
  </cac:DocumentResponse>
  <ds:Signature>
    <ds:SignedInfo>
      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
      <ds:Reference URI="">
        <ds:Transforms>
          <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        </ds:Transforms>
        <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
        <ds:DigestValue>MOCK_DIGEST_VALUE</ds:DigestValue>
      </ds:Reference>
    </ds:SignedInfo>
    <ds:SignatureValue>MOCK_SIGNATURE_VALUE</ds:SignatureValue>
    <ds:KeyInfo>
      <ds:X509Data>
        <ds:X509Certificate>MOCK_CERTIFICATE</ds:X509Certificate>
      </ds:X509Data>
    </ds:KeyInfo>
  </ds:Signature>
</ApplicationResponse>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
