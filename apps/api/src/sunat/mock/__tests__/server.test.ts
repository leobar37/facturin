import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { startMockServer, stopMockServer, getRequestHistory, clearRequestHistory } from '../server';
import { mockConfig } from '../mock-config';
import { ticketStore } from '../ticket-store';

const PORT = 3098;
const BASE = `http://localhost:${PORT}`;

const SOAP_AUTH_HEADER = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>20123456789MODDATOS</wsse:Username>
        <wsse:Password>moddatos</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>`;

function makeEnvelope(body: string): string {
  return `${SOAP_AUTH_HEADER}
  <soapenv:Body>
    ${body}
  </soapenv:Body>
</soapenv:Envelope>`;
}

beforeEach(() => {
  mockConfig.reset();
  ticketStore.reset();
  clearRequestHistory();
});

afterEach(async () => {
  await stopMockServer();
});

describe('Mock SUNAT Server - sendBill', () => {
  test('returns accepted response in accept mode', async () => {
    await startMockServer(PORT);

    const envelope = makeEnvelope(`<ser:sendBill>
      <fileName>20123456789-01-F001-00000001.xml</fileName>
      <contentFile>base64content</contentFile>
    </ser:sendBill>`);

    const res = await fetch(`${BASE}/billService`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: envelope,
    });

    const text = await res.text();
    expect(text).toContain('<statusCode>0</statusCode>');
    expect(text).toContain('<applicationResponse>');
  });

  test('returns rejected response in reject mode', async () => {
    mockConfig.setMode('reject', { code: '2078' });
    await startMockServer(PORT);

    const envelope = makeEnvelope(`<ser:sendBill>
      <fileName>20123456789-01-F001-00000001.xml</fileName>
      <contentFile>base64content</contentFile>
    </ser:sendBill>`);

    const res = await fetch(`${BASE}/billService`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: envelope,
    });

    const text = await res.text();
    expect(text).toContain('<statusCode>2078</statusCode>');
  });

  test('returns auth failure in auth-failure mode', async () => {
    mockConfig.setMode('auth-failure', { code: '0102' });
    await startMockServer(PORT);

    const envelope = makeEnvelope(`<ser:sendBill>
      <fileName>20123456789-01-F001-00000001.xml</fileName>
      <contentFile>base64content</contentFile>
    </ser:sendBill>`);

    const res = await fetch(`${BASE}/billService`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: envelope,
    });

    const text = await res.text();
    expect(text).toContain('<faultcode>0102</faultcode>');
    expect(text).toContain('Usuario o contraseña incorrectos');
  });

  test('records request in history', async () => {
    await startMockServer(PORT);

    const envelope = makeEnvelope(`<ser:sendBill>
      <fileName>20123456789-01-F001-00000001.xml</fileName>
      <contentFile>base64content</contentFile>
    </ser:sendBill>`);

    await fetch(`${BASE}/billService`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: envelope,
    });

    const history = getRequestHistory();
    expect(history).toHaveLength(1);
    expect(history[0].operation).toBe('sendBill');
    expect(history[0].credentials.username).toBe('20123456789MODDATOS');
    expect(history[0].fileName).toBe('20123456789-01-F001-00000001.xml');
  });
});

describe('Mock SUNAT Server - sendPack records correct operation', () => {
  test('sendPack records sendPack (not sendSummary) in history', async () => {
    await startMockServer(PORT);

    const envelope = makeEnvelope(`<ser:sendPack>
      <fileName>20123456789-01-RC-00000001.zip</fileName>
    </ser:sendPack>`);

    const res = await fetch(`${BASE}/billService`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: envelope,
    });

    expect(res.ok).toBe(true);
    const history = getRequestHistory();
    expect(history).toHaveLength(1);
    expect(history[0].operation).toBe('sendPack');
  });
});

describe('Mock SUNAT Server - sendSummary', () => {
  test('returns a ticket', async () => {
    await startMockServer(PORT);

    const envelope = makeEnvelope(`<ser:sendSummary>
      <fileName>20123456789-01-RA-00000001.zip</fileName>
    </ser:sendSummary>`);

    const res = await fetch(`${BASE}/billService`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: envelope,
    });

    const text = await res.text();
    expect(text).toMatch(/<ticket>\d{15}<\/ticket>/);
  });
});

describe('Mock SUNAT Server - ticket polling', () => {
  test('getStatus returns 98 while processing, then resolves', async () => {
    mockConfig.setProcessingAttempts(2);
    await startMockServer(PORT);

    // Create a ticket via sendSummary
    const envelope = makeEnvelope(`<ser:sendSummary>
      <fileName>20123456789-01-RA-00000001.zip</fileName>
    </ser:sendSummary>`);

    const summaryRes = await fetch(`${BASE}/billService`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: envelope,
    });

    const summaryText = await summaryRes.text();
    const ticketMatch = summaryText.match(/<ticket>(\d{15})<\/ticket>/);
    expect(ticketMatch).not.toBeNull();
    const ticket = ticketMatch![1];

    // First getStatus call: should return 98 (processing)
    const statusEnvelope = makeEnvelope(`<ser:getStatus>
      <ticket>${ticket}</ticket>
    </ser:getStatus>`);

    const status1 = await fetch(`${BASE}/billService`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: statusEnvelope,
    });
    const status1Text = await status1.text();
    expect(status1Text).toContain('<statusCode>98</statusCode>');

    // Second getStatus call: should resolve (processingAttempts=2, attempts now at 2)
    const status2 = await fetch(`${BASE}/billService`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: statusEnvelope,
    });
    const status2Text = await status2.text();
    expect(status2Text).toContain('<statusCode>0</statusCode>');
    expect(status2Text).toContain('<responseContent>');
  });

  test('getStatus returns 3002 for unknown ticket', async () => {
    await startMockServer(PORT);

    const envelope = makeEnvelope(`<ser:getStatus>
      <ticket>000000000000000</ticket>
    </ser:getStatus>`);

    const res = await fetch(`${BASE}/billService`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: envelope,
    });

    const text = await res.text();
    expect(text).toContain('<statusCode>3002</statusCode>');
  });
});

describe('Mock SUNAT Server - getStatusCdr', () => {
  test('returns status with CDR content', async () => {
    await startMockServer(PORT);

    const envelope = makeEnvelope(`<ser:getStatusCdr>
      <rucComprobante>20123456789</rucComprobante>
      <tipoComprobante>01</tipoComprobante>
      <serieComprobante>F001</serieComprobante>
      <numeroComprobante>00000001</numeroComprobante>
    </ser:getStatusCdr>`);

    const res = await fetch(`${BASE}/billConsultService`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: envelope,
    });

    const text = await res.text();
    expect(text).toContain('<statusCode>0</statusCode>');
    expect(text).toContain('ACEPTADO');
    expect(text).toContain('<content>');
  });
});

describe('Mock SUNAT Server - control API', () => {
  test('/_control/status returns correct requestCount', async () => {
    await startMockServer(PORT);

    // Make a request first
    const envelope = makeEnvelope(`<ser:sendBill>
      <fileName>test.xml</fileName>
      <contentFile>content</contentFile>
    </ser:sendBill>`);

    await fetch(`${BASE}/billService`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: envelope,
    });

    const statusRes = await fetch(`${BASE}/_control/status`);
    const status = await statusRes.json() as Record<string, unknown>;
    expect(status.requestCount).toBe(1);
  });

  test('/_control/reset clears everything', async () => {
    await startMockServer(PORT);

    // Make requests
    const envelope = makeEnvelope(`<ser:sendBill>
      <fileName>test.xml</fileName>
      <contentFile>content</contentFile>
    </ser:sendBill>`);
    await fetch(`${BASE}/billService`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: envelope,
    });

    // Reset
    await fetch(`${BASE}/_control/reset`, { method: 'POST' });

    // Verify cleared
    const statusRes = await fetch(`${BASE}/_control/status`);
    const status = await statusRes.json() as Record<string, unknown>;
    expect(status.requestCount).toBe(0);
    expect(status.ticketCount).toBe(0);
    expect(status.mode).toBe('accept');
  });

  test('/_control/mode changes mode dynamically', async () => {
    await startMockServer(PORT);

    // Set reject mode via control API
    await fetch(`${BASE}/_control/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'reject', code: '2012' }),
    });

    const envelope = makeEnvelope(`<ser:sendBill>
      <fileName>test.xml</fileName>
      <contentFile>content</contentFile>
    </ser:sendBill>`);

    const res = await fetch(`${BASE}/billService`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: envelope,
    });

    const text = await res.text();
    expect(text).toContain('<statusCode>2012</statusCode>');
  });
});

describe('Mock SUNAT Server - per-operation mode overrides', () => {
  test('sendBill can be rejected while sendSummary stays accepted', async () => {
    mockConfig.setMode('accept');
    mockConfig.setOperationMode('sendBill', 'reject', { code: '2012' });
    await startMockServer(PORT);

    // sendBill should be rejected
    const billEnvelope = makeEnvelope(`<ser:sendBill>
      <fileName>test.xml</fileName>
      <contentFile>content</contentFile>
    </ser:sendBill>`);
    const billRes = await fetch(`${BASE}/billService`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: billEnvelope,
    });
    const billText = await billRes.text();
    expect(billText).toContain('<statusCode>2012</statusCode>');

    // sendSummary should still work
    const summaryEnvelope = makeEnvelope(`<ser:sendSummary>
      <fileName>test.zip</fileName>
    </ser:sendSummary>`);
    const summaryRes = await fetch(`${BASE}/billService`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: summaryEnvelope,
    });
    const summaryText = await summaryRes.text();
    expect(summaryText).toContain('<ticket>');
  });
});
