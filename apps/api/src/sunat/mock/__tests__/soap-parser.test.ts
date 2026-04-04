import { describe, expect, test } from 'bun:test';
import { parseSoapEnvelope } from '../soap-parser';

const SAMPLE_SEND_BILL_ENVELOPE = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>20123456789MODDATOS</wsse:Username>
        <wsse:Password>moddatos</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ser:sendBill>
      <fileName>20123456789-01-F001-00000001.xml</fileName>
      <contentFile>base64content</contentFile>
    </ser:sendBill>
  </soapenv:Body>
</soapenv:Envelope>`;

const SAMPLE_GET_STATUS_ENVELOPE = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>20123456789MODDATOS</wsse:Username>
        <wsse:Password>moddatos</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ser:getStatus>
      <ticket>123456789012345</ticket>
    </ser:getStatus>
  </soapenv:Body>
</soapenv:Envelope>`;

describe('parseSoapEnvelope', () => {
  test('parses sendBill envelope correctly', () => {
    const result = parseSoapEnvelope(SAMPLE_SEND_BILL_ENVELOPE);

    expect(result.operation).toBe('sendBill');
    expect(result.credentials.username).toBe('20123456789MODDATOS');
    expect(result.credentials.password).toBe('moddatos');
    expect(result.params.fileName).toBe('20123456789-01-F001-00000001.xml');
    expect(result.params.contentFile).toBe('base64content');
  });

  test('parses getStatus envelope correctly', () => {
    const result = parseSoapEnvelope(SAMPLE_GET_STATUS_ENVELOPE);

    expect(result.operation).toBe('getStatus');
    expect(result.credentials.username).toBe('20123456789MODDATOS');
    expect(result.params.ticket).toBe('123456789012345');
  });

  test('handles empty credentials gracefully', () => {
    const noAuthEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <ser:sendBill>
      <fileName>test.xml</fileName>
      <contentFile>content</contentFile>
    </ser:sendBill>
  </soapenv:Body>
</soapenv:Envelope>`;

    const result = parseSoapEnvelope(noAuthEnvelope);
    expect(result.operation).toBe('sendBill');
    expect(result.credentials.username).toBe('');
    expect(result.credentials.password).toBe('');
  });

  test('defaults to sendBill for unknown operation', () => {
    const unknownEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <ser:unknownOperation>
      <param>value</param>
    </ser:unknownOperation>
  </soapenv:Body>
</soapenv:Envelope>`;

    const result = parseSoapEnvelope(unknownEnvelope);
    expect(result.operation).toBe('sendBill');
  });
});
