import { describe, expect, test } from 'bun:test';
import { generateCDR } from '../cdr-generator';
import { parseCDR } from '../../cdr/parser';

describe('generateCDR', () => {
  test('generates valid ApplicationResponse XML for accepted status', () => {
    const xml = generateCDR({
      responseCode: 0,
      description: 'ACEPTADO',
      referenceId: 'F001-00000001',
    });

    expect(xml).toContain('<cbc:ResponseCode>0</cbc:ResponseCode>');
    expect(xml).toContain('<cbc:Description>ACEPTADO</cbc:Description>');
    expect(xml).toContain('<cbc:ReferenceID>F001-00000001</cbc:ReferenceID>');
    expect(xml).toContain('ApplicationResponse');
    expect(xml).toContain('xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2"');
  });

  test('generates valid XML for rejected status', () => {
    const xml = generateCDR({
      responseCode: 2078,
      description: 'RECHAZADO',
      referenceId: 'F001-00000002',
    });

    expect(xml).toContain('<cbc:ResponseCode>2078</cbc:ResponseCode>');
    expect(xml).toContain('<cbc:Description>RECHAZADO</cbc:Description>');
  });

  test('includes observation notes for 4000+ codes', () => {
    const xml = generateCDR({
      responseCode: 4287,
      description: 'ACEPTADO CON OBSERVACIONES',
      referenceId: 'F001-00000003',
      notes: ['4287 - Precio unitario difiere'],
    });

    expect(xml).toContain('<cbc:Note>4287 - Precio unitario difiere</cbc:Note>');
    expect(xml).toContain('<cbc:ResponseCode>4287</cbc:ResponseCode>');
  });

  test('excludes notes when not provided', () => {
    const xml = generateCDR({
      responseCode: 0,
      description: 'ACEPTADO',
      referenceId: 'F001-00000004',
    });

    expect(xml).not.toContain('<cbc:Note>');
  });
});

describe('CDR compatibility with CDRParser', () => {
  test('accepted CDR is parseable by CDRParser', () => {
    const cdrXml = generateCDR({
      responseCode: 0,
      description: 'ACEPTADO',
      referenceId: 'F001-00000001',
    });

    const result = parseCDR(cdrXml);

    expect(result.statusCode).toBe(0);
    expect(result.status).toBe('ACEPTADO');
    expect(result.description).toBe('ACEPTADO');
  });

  test('rejected CDR is parseable by CDRParser', () => {
    const cdrXml = generateCDR({
      responseCode: 2078,
      description: 'RECHAZADO',
      referenceId: 'F001-00000002',
    });

    const result = parseCDR(cdrXml);

    expect(result.statusCode).toBe(2078);
    expect(result.status).toBe('RECHAZADO');
  });

  test('observation CDR is parseable by CDRParser', () => {
    const cdrXml = generateCDR({
      responseCode: 4287,
      description: 'ACEPTADO CON OBSERVACIONES',
      referenceId: 'F001-00000003',
      notes: ['4287 - Precio unitario difiere'],
    });

    const result = parseCDR(cdrXml);

    expect(result.statusCode).toBe(4287);
    expect(result.status).toBe('ACEPTADO');
    expect(result.notes).toBeDefined();
    expect(result.notes!.length).toBeGreaterThan(0);
  });

  test('exception code is parseable by CDRParser', () => {
    const cdrXml = generateCDR({
      responseCode: 99,
      description: 'EXCEPCION',
      referenceId: 'F001-00000004',
    });

    const result = parseCDR(cdrXml);

    expect(result.statusCode).toBe(99);
    expect(result.status).toBe('EXCEPCION');
  });
});
