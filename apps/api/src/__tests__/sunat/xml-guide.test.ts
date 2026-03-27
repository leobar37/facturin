/**
 * Unit tests for UBL 2.1 DespatchAdvice (Guía de Remisión) XML Generator
 */

import { describe, it, expect } from 'bun:test';
import { generateDespatchAdviceXML } from '../../sunat/xml/guide';
import type { XmlGuiaInput } from '../../sunat/xml/guide';

describe('XML Guide Generator', () => {
  describe('generateDespatchAdviceXML', () => {
    it('should generate valid XML for Guía de Remisión tipo 09', () => {
      const input: XmlGuiaInput = {
        tipoComprobante: '09',
        serie: 'T001',
        numero: 1,
        fechaEmision: '2024-01-15',
        tenant: {
          ruc: '20480000001',
          razonSocial: 'EMPRESA TEST S.A.C.',
          nombreComercial: 'Empresa Test',
          direccion: 'Av. Principal 123',
          ubigeo: '150101',
        },
        destinatario: {
          tipoDocumento: '6',
          numeroDocumento: '20480000002',
          nombre: 'CLIENTE TEST S.A.',
          direccion: 'Calle Secundaria 456',
        },
        detalles: [
          {
            numeroLinea: 1,
            cantidad: 10,
            unidad: 'UNID',
            descripcion: 'Producto de prueba',
          },
        ],
        ubigeoPuntoLlegada: '150101',
        direccionPuntoLlegada: 'Av. Destino 789',
        ubigeoPuntoPartida: '150102',
        direccionPuntoPartida: 'Av. Origen 456',
        motivoTraslado: '01',
        indicadorTraslado: '01',
        descripcionTraslado: 'Venta de mercadería',
        pesoTotal: 5.5,
        numeroBultos: 2,
      };

      const xml = generateDespatchAdviceXML(input);

      // Verify XML structure
      expect(xml).toContain('<?xml version="1.0" encoding="ISO-8859-1"?>');
      expect(xml).toContain('<DespatchAdvice');
      expect(xml).toContain('xmlns="urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2"');

      // Verify document ID
      expect(xml).toContain('<cbc:ID>T001-1</cbc:ID>');

      // Verify dates
      expect(xml).toContain('<cbc:IssueDate>2024-01-15</cbc:IssueDate>');

      // Verify type code
      expect(xml).toContain('<cbc:DespatchAdviceTypeCode');
      expect(xml).toContain('>09<');

      // Verify supplier party
      expect(xml).toContain('<cac:DespatchSupplierParty>');
      expect(xml).toContain('20480000001');

      // Verify customer party
      expect(xml).toContain('<cac:DeliveryCustomerParty>');
      expect(xml).toContain('20480000002');

      // Verify shipment info
      expect(xml).toContain('<cac:Shipment>');
      expect(xml).toContain('5.50'); // pesoTotal
      expect(xml).toContain('2'); // numeroBultos

      // Verify despatch line
      expect(xml).toContain('<cac:DespatchLine>');
      expect(xml).toContain('<cbc:ID>1</cbc:ID>');
      expect(xml).toContain('<cbc:DeliveredQuantity unitCode="UNID"');
      expect(xml).toContain('>10<');
      expect(xml).toContain('Producto de prueba');
    });

    it('should use type code 31 for transportista guide', () => {
      const input: XmlGuiaInput = {
        tipoComprobante: '31',
        serie: 'T002',
        numero: 1,
        fechaEmision: '2024-01-15',
        tenant: {
          ruc: '20480000001',
          razonSocial: 'EMPRESA TEST S.A.C.',
          direccion: 'Av. Principal 123',
          ubigeo: '150101',
        },
        destinatario: {
          tipoDocumento: '6',
          numeroDocumento: '20480000002',
          nombre: 'CLIENTE TEST S.A.',
          direccion: 'Calle Secundaria 456',
        },
        detalles: [
          {
            numeroLinea: 1,
            cantidad: 5,
            descripcion: 'Item transportado',
          },
        ],
        ubigeoPuntoLlegada: '150101',
        direccionPuntoLlegada: 'Av. Destino 789',
        ubigeoPuntoPartida: '150102',
        direccionPuntoPartida: 'Av. Origen 456',
      };

      const xml = generateDespatchAdviceXML(input);

      expect(xml).toContain('>31<');
    });

    it('should include optional fields when provided', () => {
      const input: XmlGuiaInput = {
        tipoComprobante: '09',
        serie: 'T001',
        numero: 1,
        fechaEmision: '2024-01-15',
        fechaTraslado: '2024-01-16',
        tenant: {
          ruc: '20480000001',
          razonSocial: 'EMPRESA TEST S.A.C.',
          direccion: 'Av. Principal 123',
          ubigeo: '150101',
        },
        destinatario: {
          tipoDocumento: '6',
          numeroDocumento: '20480000002',
          nombre: 'CLIENTE TEST S.A.',
          direccion: 'Calle Secundaria 456',
        },
        terceros: [
          {
            tipoDocumento: '6',
            numeroDocumento: '20480000003',
            nombre: 'TERCERO TEST S.A.',
          },
        ],
        detalles: [
          {
            numeroLinea: 1,
            cantidad: 1,
            descripcion: 'Producto único',
          },
        ],
        ubigeoPuntoLlegada: '150101',
        direccionPuntoLlegada: 'Av. Destino 789',
        ubigeoPuntoPartida: '150102',
        direccionPuntoPartida: 'Av. Origen 456',
        motivoTraslado: '04',
        indicadorTraslado: '02',
        descripcionTraslado: 'Transferencia entre warehouses',
        pesoTotal: 10.0,
        numeroBultos: 5,
      };

      const xml = generateDespatchAdviceXML(input);

      // Verify SUNAT agreement elements when provided
      expect(xml).toContain('<sac:SUNATAgrement>');
      expect(xml).toContain('<sac:SUNATTransportModeCode>02</sac:SUNATTransportModeCode>');
    });

    it('should handle multiple despatch lines', () => {
      const input: XmlGuiaInput = {
        tipoComprobante: '09',
        serie: 'T001',
        numero: 1,
        fechaEmision: '2024-01-15',
        tenant: {
          ruc: '20480000001',
          razonSocial: 'EMPRESA TEST S.A.C.',
          direccion: 'Av. Principal 123',
          ubigeo: '150101',
        },
        destinatario: {
          tipoDocumento: '6',
          numeroDocumento: '20480000002',
          nombre: 'CLIENTE TEST S.A.',
          direccion: 'Calle Secundaria 456',
        },
        detalles: [
          {
            numeroLinea: 1,
            cantidad: 5,
            descripcion: 'Producto A',
          },
          {
            numeroLinea: 2,
            cantidad: 3,
            descripcion: 'Producto B',
          },
          {
            numeroLinea: 3,
            cantidad: 2,
            descripcion: 'Producto C',
          },
        ],
        ubigeoPuntoLlegada: '150101',
        direccionPuntoLlegada: 'Av. Destino 789',
        ubigeoPuntoPartida: '150102',
        direccionPuntoPartida: 'Av. Origen 456',
      };

      const xml = generateDespatchAdviceXML(input);

      // Verify all three lines are present
      expect(xml).toContain('<cbc:ID>1</cbc:ID>');
      expect(xml).toContain('<cbc:ID>2</cbc:ID>');
      expect(xml).toContain('<cbc:ID>3</cbc:ID>');
      expect(xml).toContain('Producto A');
      expect(xml).toContain('Producto B');
      expect(xml).toContain('Producto C');
    });

    it('should use NIU as default unit when not specified', () => {
      const input: XmlGuiaInput = {
        tipoComprobante: '09',
        serie: 'T001',
        numero: 1,
        fechaEmision: '2024-01-15',
        tenant: {
          ruc: '20480000001',
          razonSocial: 'EMPRESA TEST S.A.C.',
          direccion: 'Av. Principal 123',
          ubigeo: '150101',
        },
        destinatario: {
          tipoDocumento: '6',
          numeroDocumento: '20480000002',
          nombre: 'CLIENTE TEST S.A.',
          direccion: 'Calle Secundaria 456',
        },
        detalles: [
          {
            numeroLinea: 1,
            cantidad: 10,
            descripcion: 'Producto sin unidad',
          },
        ],
        ubigeoPuntoLlegada: '150101',
        direccionPuntoLlegada: 'Av. Destino 789',
        ubigeoPuntoPartida: '150102',
        direccionPuntoPartida: 'Av. Origen 456',
      };

      const xml = generateDespatchAdviceXML(input);

      // NIU is the default unit
      expect(xml).toContain('unitCode="NIU"');
    });
  });
});
