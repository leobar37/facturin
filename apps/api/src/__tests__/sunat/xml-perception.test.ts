/**
 * Unit tests for UBL 2.1 Perception (Comprobante de Percepción) XML Generator
 */

import { describe, it, expect } from 'bun:test';
import { generatePerceptionXML } from '../../sunat/xml/perception';
import type { XmlPercepcionInput } from '../../sunat/types';

describe('XML Perception Generator', () => {
  describe('generatePerceptionXML', () => {
    it('should generate valid XML for Comprobante de Percepción', () => {
      const input: XmlPercepcionInput = {
        tipoComprobante: '40',
        serie: 'P001',
        numero: 1,
        fechaEmision: '2024-01-15',
        tenant: {
          ruc: '20480000001',
          razonSocial: 'EMPRESA TEST S.A.C.',
          nombreComercial: 'Empresa Test',
          direccion: 'Av. Principal 123',
          ubigeo: '150101',
        },
        cliente: {
          tipoDocumento: '6',
          numeroDocumento: '20480000002',
          nombre: 'CLIENTE TEST S.A.',
          direccion: 'Calle Secundaria 456',
        },
        percepciones: [
          {
            numeroLinea: 1,
            tipoComprobante: '01',
            serieComprobante: 'F001',
            numeroComprobante: 1,
            fechaEmisionComprobante: '2024-01-10',
            montoComprobante: 1180.0,
            importePercibido: 20.0,
            importeBasePercibida: 1000.0,
            tasaPercepcion: 2.0,
            tipoDocIdentidadReceptor: '6',
            numeroDocIdentidadReceptor: '20480000002',
            denominacionReceptor: 'CLIENTE TEST S.A.',
            importeTotalComprobante: 1180.0,
            fechaOperacion: '2024-01-15',
          },
        ],
        totales: {
          totalImportePercibido: 20.0,
          totalImporteBasePercibida: 1000.0,
          totalImporteTotal: 1200.0,
        },
      };

      const xml = generatePerceptionXML(input);

      // Verify XML structure
      expect(xml).toContain('<?xml version="1.0" encoding="ISO-8859-1"?>');
      expect(xml).toContain('<Perception');
      expect(xml).toContain('xmlns="urn:oasis:names:specification:ubl:schema:xsd:Perception-2"');

      // Verify document ID
      expect(xml).toContain('<cbc:ID>P001-1</cbc:ID>');

      // Verify dates
      expect(xml).toContain('<cbc:IssueDate>2024-01-15</cbc:IssueDate>');

      // Verify perception code
      expect(xml).toContain('<cbc:PerceptionCode>40</cbc:PerceptionCode>');

      // Verify currency
      expect(xml).toContain('<cbc:DocumentCurrencyCode listID="ISO 4217 Alpha"');
      expect(xml).toContain('PEN');

      // Verify supplier party
      expect(xml).toContain('<cac:AccountingSupplierParty>');
      expect(xml).toContain('20480000001');

      // Verify customer party
      expect(xml).toContain('<cac:AccountingCustomerParty>');
      expect(xml).toContain('20480000002');

      // Verify monetary totals
      expect(xml).toContain('<sac:SUNATAggregatedMonetaryTotal>');
      expect(xml).toContain('20.00'); // importePercibido
      expect(xml).toContain('1000.00'); // importeBasePercibida

      // Verify perception document reference
      expect(xml).toContain('<sac:SUNATPerceptionDocuments>');
      expect(xml).toContain('<sac:SUNATPerceptionDocumentReference>');
      expect(xml).toContain('F001-00000001');
    });

    it('should handle multiple perception lines', () => {
      const input: XmlPercepcionInput = {
        tipoComprobante: '40',
        serie: 'P001',
        numero: 1,
        fechaEmision: '2024-01-15',
        tenant: {
          ruc: '20480000001',
          razonSocial: 'EMPRESA TEST S.A.C.',
          direccion: 'Av. Principal 123',
          ubigeo: '150101',
        },
        cliente: {
          tipoDocumento: '6',
          numeroDocumento: '20480000002',
          nombre: 'CLIENTE TEST S.A.',
          direccion: 'Calle Secundaria 456',
        },
        percepciones: [
          {
            numeroLinea: 1,
            tipoComprobante: '01',
            serieComprobante: 'F001',
            numeroComprobante: 1,
            fechaEmisionComprobante: '2024-01-10',
            montoComprobante: 1180.0,
            importePercibido: 20.0,
            importeBasePercibida: 1000.0,
            tasaPercepcion: 2.0,
            tipoDocIdentidadReceptor: '6',
            numeroDocIdentidadReceptor: '20480000002',
            denominacionReceptor: 'CLIENTE TEST S.A.',
            importeTotalComprobante: 1180.0,
            fechaOperacion: '2024-01-15',
          },
          {
            numeroLinea: 2,
            tipoComprobante: '01',
            serieComprobante: 'F001',
            numeroComprobante: 2,
            fechaEmisionComprobante: '2024-01-12',
            montoComprobante: 2360.0,
            importePercibido: 40.0,
            importeBasePercibida: 2000.0,
            tasaPercepcion: 2.0,
            tipoDocIdentidadReceptor: '6',
            numeroDocIdentidadReceptor: '20480000002',
            denominacionReceptor: 'CLIENTE TEST S.A.',
            importeTotalComprobante: 2360.0,
            fechaOperacion: '2024-01-15',
          },
        ],
        totales: {
          totalImportePercibido: 60.0,
          totalImporteBasePercibida: 3000.0,
          totalImporteTotal: 3600.0,
        },
      };

      const xml = generatePerceptionXML(input);

      // Verify both lines are present
      expect(xml).toContain('F001-00000001');
      expect(xml).toContain('F001-00000002');
      expect(xml).toContain('20.00'); // First perception amount
      expect(xml).toContain('40.00'); // Second perception amount
    });

    it('should include observations when provided', () => {
      const input: XmlPercepcionInput = {
        tipoComprobante: '40',
        serie: 'P001',
        numero: 1,
        fechaEmision: '2024-01-15',
        tenant: {
          ruc: '20480000001',
          razonSocial: 'EMPRESA TEST S.A.C.',
          direccion: 'Av. Principal 123',
          ubigeo: '150101',
        },
        cliente: {
          tipoDocumento: '6',
          numeroDocumento: '20480000002',
          nombre: 'CLIENTE TEST S.A.',
          direccion: 'Calle Secundaria 456',
        },
        percepciones: [
          {
            numeroLinea: 1,
            tipoComprobante: '01',
            serieComprobante: 'F001',
            numeroComprobante: 1,
            fechaEmisionComprobante: '2024-01-10',
            montoComprobante: 1180.0,
            importePercibido: 20.0,
            importeBasePercibida: 1000.0,
            tasaPercepcion: 2.0,
            tipoDocIdentidadReceptor: '6',
            numeroDocIdentidadReceptor: '20480000002',
            denominacionReceptor: 'CLIENTE TEST S.A.',
            importeTotalComprobante: 1180.0,
            fechaOperacion: '2024-01-15',
          },
        ],
        totales: {
          totalImportePercibido: 20.0,
          totalImporteBasePercibida: 1000.0,
          totalImporteTotal: 1200.0,
        },
        observaciones: 'Percepción de impuesto de ley',
      };

      const xml = generatePerceptionXML(input);

      expect(xml).toContain('<cbc:Note>');
      expect(xml).toContain('Percepción de impuesto de ley');
    });

    it('should format amounts with 2 decimal places', () => {
      const input: XmlPercepcionInput = {
        tipoComprobante: '40',
        serie: 'P001',
        numero: 1,
        fechaEmision: '2024-01-15',
        tenant: {
          ruc: '20480000001',
          razonSocial: 'EMPRESA TEST S.A.C.',
          direccion: 'Av. Principal 123',
          ubigeo: '150101',
        },
        cliente: {
          tipoDocumento: '6',
          numeroDocumento: '20480000002',
          nombre: 'CLIENTE TEST S.A.',
          direccion: 'Calle Secundaria 456',
        },
        percepciones: [
          {
            numeroLinea: 1,
            tipoComprobante: '01',
            serieComprobante: 'F001',
            numeroComprobante: 1,
            fechaEmisionComprobante: '2024-01-10',
            montoComprobante: 1234.56,
            importePercibido: 24.69,
            importeBasePercibida: 1234.56,
            tasaPercepcion: 2.0,
            tipoDocIdentidadReceptor: '6',
            numeroDocIdentidadReceptor: '20480000002',
            denominacionReceptor: 'CLIENTE TEST S.A.',
            importeTotalComprobante: 1234.56,
            fechaOperacion: '2024-01-15',
          },
        ],
        totales: {
          totalImportePercibido: 24.69,
          totalImporteBasePercibida: 1234.56,
          totalImporteTotal: 1456.79,
        },
      };

      const xml = generatePerceptionXML(input);

      // Verify formatted amounts (2 decimal places)
      expect(xml).toContain('1234.56');
      expect(xml).toContain('24.69');
      expect(xml).toContain('1456.79');
    });

    it('should generate valid XML with all required components', () => {
      const input: XmlPercepcionInput = {
        tipoComprobante: '40',
        serie: 'P001',
        numero: 1,
        fechaEmision: '2024-01-15',
        tenant: {
          ruc: '20480000001',
          razonSocial: 'EMPRESA TEST S.A.C.',
          direccion: 'Av. Principal 123',
          ubigeo: '150101',
        },
        cliente: {
          tipoDocumento: '6',
          numeroDocumento: '20480000002',
          nombre: 'CLIENTE TEST S.A.',
          direccion: 'Calle Secundaria 456',
        },
        percepciones: [
          {
            numeroLinea: 1,
            tipoComprobante: '01',
            serieComprobante: 'F001',
            numeroComprobante: 1,
            fechaEmisionComprobante: '2024-01-10',
            montoComprobante: 1180.0,
            importePercibido: 20.0,
            importeBasePercibida: 1000.0,
            tasaPercepcion: 2.0,
            tipoDocIdentidadReceptor: '6',
            numeroDocIdentidadReceptor: '20480000002',
            denominacionReceptor: 'CLIENTE TEST S.A.',
            importeTotalComprobante: 1180.0,
            fechaOperacion: '2024-01-15',
          },
        ],
        totales: {
          totalImportePercibido: 20.0,
          totalImporteBasePercibida: 1000.0,
          totalImporteTotal: 1200.0,
        },
      };

      const xml = generatePerceptionXML(input);

      // Verify all main components are present
      expect(xml).toContain('<Perception');
      expect(xml).toContain('<cac:AccountingSupplierParty>');
      expect(xml).toContain('<cac:AccountingCustomerParty>');
      expect(xml).toContain('<sac:SUNATAggregatedMonetaryTotal>');
      expect(xml).toContain('<sac:SUNATPerceptionDocuments>');
      expect(xml).toContain('<cac:LegalMonetaryTotal>');
    });
  });
});
