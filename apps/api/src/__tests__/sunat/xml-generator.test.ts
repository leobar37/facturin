import { describe, it, expect } from 'bun:test';
import {
  generateInvoiceXML,
  generateCreditNoteXML,
  generateDebitNoteXML,
  generateXML,
} from '../../sunat/xml/generator';
import type { XmlGenerationInput } from '../../sunat/types';

/**
 * Test data factories
 */

function createTestInvoiceInput(): XmlGenerationInput {
  return {
    tipoComprobante: '01',
    serie: 'F001',
    numero: 1,
    fechaEmision: '2024-01-15',
    tenant: {
      ruc: '20123456789',
      razonSocial: 'Empresa de Prueba S.A.C.',
      nombreComercial: 'Prueba',
      direccion: 'Av. Lima 123',
      ubigeo: '150101',
    },
    cliente: {
      tipoDocumento: '6',
      numeroDocumento: '10456789012',
      nombre: 'Cliente de Prueba',
      direccion: 'Av. Arequipa 456',
    },
    detalles: [
      {
        numeroLinea: 1,
        codigoProducto: 'PROD001',
        descripcion: 'Producto de prueba 1',
        cantidad: 10,
        unidad: 'NIU',
        precioUnitario: 118.0,
        precioTipo: '01',
        valorVenta: 1000.0,
        igv: 180.0,
        igvAfectacion: '10',
        subTotal: 1180.0,
      },
      {
        numeroLinea: 2,
        codigoProducto: 'PROD002',
        descripcion: 'Producto de prueba 2',
        cantidad: 5,
        unidad: 'NIU',
        precioUnitario: 59.0,
        precioTipo: '01',
        valorVenta: 250.0,
        igv: 45.0,
        igvAfectacion: '10',
        subTotal: 295.0,
      },
    ],
    totales: {
      totalGravadas: 1250.0,
      totalExoneradas: 0.0,
      totalInafectas: 0.0,
      totalGratuitas: 0.0,
      totalIgv: 225.0,
      totalIsc: 0.0,
      totalIcbp: 0.0,
      totalOtrosCargos: 0.0,
      totalImporte: 1475.0,
    },
    formaPago: {
      tipoPago: 'contado',
      montoPago: 1475.0,
    },
    leyendas: [
      {
        codigo: '1000',
        descripcion: 'MIL CUATROCIENTOS SETENTA Y CINCO CON 00/100 SOLES',
      },
    ],
  };
}

function createTestCreditNoteInput(): XmlGenerationInput {
  return {
    tipoComprobante: '07',
    serie: 'FC01',
    numero: 1,
    fechaEmision: '2024-01-15',
    tenant: {
      ruc: '20123456789',
      razonSocial: 'Empresa de Prueba S.A.C.',
      nombreComercial: 'Prueba',
      direccion: 'Av. Lima 123',
      ubigeo: '150101',
    },
    cliente: {
      tipoDocumento: '6',
      numeroDocumento: '10456789012',
      nombre: 'Cliente de Prueba',
      direccion: 'Av. Arequipa 456',
    },
    detalles: [
      {
        numeroLinea: 1,
        codigoProducto: 'PROD001',
        descripcion: 'Producto de prueba 1 - Devuelto',
        cantidad: 2,
        unidad: 'NIU',
        precioUnitario: 118.0,
        precioTipo: '01',
        valorVenta: 200.0,
        igv: 36.0,
        igvAfectacion: '10',
        subTotal: 236.0,
      },
    ],
    totales: {
      totalGravadas: 200.0,
      totalExoneradas: 0.0,
      totalInafectas: 0.0,
      totalGratuitas: 0.0,
      totalIgv: 36.0,
      totalIsc: 0.0,
      totalIcbp: 0.0,
      totalOtrosCargos: 0.0,
      totalImporte: 236.0,
    },
    documentosRelacionados: [
      {
        tipoDocumento: '01',
        numeroDocumento: 'F001-100',
      },
    ],
  };
}

function createTestDebitNoteInput(): XmlGenerationInput {
  return {
    tipoComprobante: '08',
    serie: 'FD01',
    numero: 1,
    fechaEmision: '2024-01-15',
    tenant: {
      ruc: '20123456789',
      razonSocial: 'Empresa de Prueba S.A.C.',
      nombreComercial: 'Prueba',
      direccion: 'Av. Lima 123',
      ubigeo: '150101',
    },
    cliente: {
      tipoDocumento: '6',
      numeroDocumento: '10456789012',
      nombre: 'Cliente de Prueba',
      direccion: 'Av. Arequipa 456',
    },
    detalles: [
      {
        numeroLinea: 1,
        codigoProducto: 'PROD001',
        descripcion: 'Producto de prueba 1 - Cargo adicional',
        cantidad: 1,
        unidad: 'NIU',
        precioUnitario: 118.0,
        precioTipo: '01',
        valorVenta: 100.0,
        igv: 18.0,
        igvAfectacion: '10',
        subTotal: 118.0,
      },
    ],
    totales: {
      totalGravadas: 100.0,
      totalExoneradas: 0.0,
      totalInafectas: 0.0,
      totalGratuitas: 0.0,
      totalIgv: 18.0,
      totalIsc: 0.0,
      totalIcbp: 0.0,
      totalOtrosCargos: 0.0,
      totalImporte: 118.0,
    },
    documentosRelacionados: [
      {
        tipoDocumento: '01',
        numeroDocumento: 'F001-100',
      },
    ],
  };
}

// ============================================================================
// Invoice XML Generation Tests
// ============================================================================

describe('Invoice XML Generation', () => {
  it('should generate valid UBL 2.1 Invoice XML', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    // Check basic structure
    expect(xml).toContain('<?xml version="1.0" encoding="ISO-8859-1"?>');
    expect(xml).toContain('<Invoice');
    expect(xml).toContain('</Invoice>');
  });

  it('should include UBL 2.1 version', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
    expect(xml).toContain('<cbc:CustomizationID>2.0</cbc:CustomizationID>');
  });

  it('should include correct document ID (serie-numero)', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('<cbc:ID>F001-1</cbc:ID>');
  });

  it('should include correct issue date', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('<cbc:IssueDate>2024-01-15</cbc:IssueDate>');
  });

  it('should include InvoiceTypeCode for Factura (01)', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('<cbc:InvoiceTypeCode');
    expect(xml).toContain('>01</cbc:InvoiceTypeCode>');
  });

  it('should include document currency (PEN)', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('<cbc:DocumentCurrencyCode listID="ISO 4217 Alpha"');
    expect(xml).toContain('>PEN</cbc:DocumentCurrencyCode>');
  });

  it('should include Signature element with RUC and razon social', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('<cac:Signature>');
    expect(xml).toContain('<cbc:ID>20123456789</cbc:ID>');
    expect(xml).toContain('<cbc:Name><![CDATA[Empresa de Prueba S.A.C.]]></cbc:Name>');
  });

  it('should include AccountingSupplierParty with tenant data', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('<cac:AccountingSupplierParty>');
    expect(xml).toContain('<cbc:ID schemeID="6"');
    expect(xml).toContain('>20123456789</cbc:ID>');
    expect(xml).toContain('<cbc:RegistrationName><![CDATA[Empresa de Prueba S.A.C.]]></cbc:RegistrationName>');
  });

  it('should include AccountingCustomerParty with client data', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('<cac:AccountingCustomerParty>');
    expect(xml).toContain('<cbc:ID schemeID="6"');
    expect(xml).toContain('>10456789012</cbc:ID>');
    expect(xml).toContain('<cbc:RegistrationName><![CDATA[Cliente de Prueba]]></cbc:RegistrationName>');
  });

  it('should include PaymentTerms with payment method', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('<cac:PaymentTerms>');
    expect(xml).toContain('<cbc:ID>FormaPago</cbc:ID>');
    expect(xml).toContain('<cbc:PaymentMeansID>Contado</cbc:PaymentMeansID>');
  });

  it('should include TaxTotal with IGV (1000)', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('<cac:TaxTotal>');
    expect(xml).toContain('<cbc:TaxAmount currencyID="PEN">225.00</cbc:TaxAmount>');
    expect(xml).toContain('<cbc:ID schemeAgencyName="PE:SUNAT" schemeID="UN/ECE 5153" schemeName="Codigo de tributos">1000</cbc:ID>');
  });

  it('should include LegalMonetaryTotal with correct amounts', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('<cac:LegalMonetaryTotal>');
    expect(xml).toContain('<cbc:LineExtensionAmount currencyID="PEN">1250.00</cbc:LineExtensionAmount>');
    expect(xml).toContain('<cbc:TaxInclusiveAmount currencyID="PEN">1475.00</cbc:TaxInclusiveAmount>');
    expect(xml).toContain('<cbc:PayableAmount currencyID="PEN">1475.00</cbc:PayableAmount>');
  });

  it('should include InvoiceLine elements for each detail', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('<cac:InvoiceLine>');
    expect(xml).toContain('<cbc:ID>1</cbc:ID>');
    expect(xml).toContain('<cbc:ID>2</cbc:ID>');
    expect(xml).toContain('<cbc:InvoicedQuantity');
  });

  it('should include line item details correctly', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    // First line
    expect(xml).toContain('<cbc:InvoicedQuantity unitCode="NIU"');
    expect(xml).toContain('>10</cbc:InvoicedQuantity>');
    expect(xml).toContain('<cbc:Description><![CDATA[Producto de prueba 1]]></cbc:Description>');
    expect(xml).toContain('<cbc:PriceAmount currencyID="PEN">118.00</cbc:PriceAmount>');
  });

  it('should include PricingReference with price type', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('<cac:PricingReference>');
    expect(xml).toContain('<cac:AlternativeConditionPrice>');
    expect(xml).toContain('<cbc:PriceTypeCode listAgencyName="PE:SUNAT"');
    expect(xml).toContain('>01</cbc:PriceTypeCode>');
  });

  it('should include legends (notas)', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('<cbc:Note languageLocaleID="1000">');
    expect(xml).toContain('MIL CUATROCIENTOS SETENTA Y CINCO CON 00/100 SOLES');
  });

  it('should include UBLExtensions for signature insertion', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('<ext:UBLExtensions>');
    expect(xml).toContain('<ext:UBLExtension>');
    expect(xml).toContain('<ext:ExtensionContent/>');
  });

  it('should include all required namespaces', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"');
    expect(xml).toContain('xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"');
    expect(xml).toContain('xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"');
    expect(xml).toContain('xmlns:ds="http://www.w3.org/2000/09/xmldsig#"');
  });
});

// ============================================================================
// Credit Note XML Generation Tests
// ============================================================================

describe('Credit Note XML Generation', () => {
  it('should generate valid UBL 2.1 Credit Note XML', () => {
    const input = createTestCreditNoteInput();
    const xml = generateCreditNoteXML(input);

    expect(xml).toContain('<?xml version="1.0" encoding="ISO-8859-1"?>');
    expect(xml).toContain('<CreditNote');
    expect(xml).toContain('</CreditNote>');
  });

  it('should use CreditNoteLine elements instead of InvoiceLine', () => {
    const input = createTestCreditNoteInput();
    const xml = generateCreditNoteXML(input);

    expect(xml).toContain('<cac:CreditNoteLine>');
    expect(xml).toContain('<cbc:CreditedQuantity');
    expect(xml).not.toContain('<cac:InvoiceLine>');
  });

  it('should include DiscrepancyResponse for reference', () => {
    const input = createTestCreditNoteInput();
    const xml = generateCreditNoteXML(input);

    expect(xml).toContain('<cac:DiscrepancyResponse>');
    expect(xml).toContain('<cbc:ReferenceID>F001-100</cbc:ReferenceID>');
    expect(xml).toContain('<cbc:ResponseCode>01</cbc:ResponseCode>');
  });

  it('should include BillingReference to original invoice', () => {
    const input = createTestCreditNoteInput();
    const xml = generateCreditNoteXML(input);

    expect(xml).toContain('<cac:BillingReference>');
    expect(xml).toContain('<cac:InvoiceDocumentReference>');
    expect(xml).toContain('<cbc:DocumentTypeCode listAgencyName="PE:SUNAT"');
    expect(xml).toContain('>01</cbc:DocumentTypeCode>');
  });

  it('should throw error if used with non-credit-note document type', () => {
    const input = createTestCreditNoteInput();
    input.tipoComprobante = '01'; // Change to invoice type

    expect(() => generateCreditNoteXML(input)).toThrow(
      'generateCreditNoteXML only supports document type 07 (Credit Note)'
    );
  });
});

// ============================================================================
// Debit Note XML Generation Tests
// ============================================================================

describe('Debit Note XML Generation', () => {
  it('should generate valid UBL 2.1 Debit Note XML', () => {
    const input = createTestDebitNoteInput();
    const xml = generateDebitNoteXML(input);

    expect(xml).toContain('<?xml version="1.0" encoding="ISO-8859-1"?>');
    expect(xml).toContain('<DebitNote');
    expect(xml).toContain('</DebitNote>');
  });

  it('should use DebitNoteLine elements instead of InvoiceLine', () => {
    const input = createTestDebitNoteInput();
    const xml = generateDebitNoteXML(input);

    expect(xml).toContain('<cac:DebitNoteLine>');
    expect(xml).toContain('<cbc:DebitedQuantity');
    expect(xml).not.toContain('<cac:InvoiceLine>');
  });

  it('should use RequestedMonetaryTotal instead of LegalMonetaryTotal', () => {
    const input = createTestDebitNoteInput();
    const xml = generateDebitNoteXML(input);

    expect(xml).toContain('<cac:RequestedMonetaryTotal>');
    expect(xml).not.toContain('<cac:LegalMonetaryTotal>');
  });

  it('should throw error if used with non-debit-note document type', () => {
    const input = createTestDebitNoteInput();
    input.tipoComprobante = '01'; // Change to invoice type

    expect(() => generateDebitNoteXML(input)).toThrow(
      'generateDebitNoteXML only supports document type 08 (Debit Note)'
    );
  });
});

// ============================================================================
// Generic XML Generation Tests
// ============================================================================

describe('generateXML (Generic)', () => {
  it('should generate Invoice XML for tipoComprobante 01', () => {
    const input = createTestInvoiceInput();
    input.tipoComprobante = '01';
    const xml = generateXML(input);

    expect(xml).toContain('<Invoice');
  });

  it('should generate Invoice XML for tipoComprobante 03 (Boleta)', () => {
    const input = createTestInvoiceInput();
    input.tipoComprobante = '03';
    const xml = generateXML(input);

    expect(xml).toContain('<Invoice');
  });

  it('should generate Credit Note XML for tipoComprobante 07', () => {
    const input = createTestCreditNoteInput();
    const xml = generateXML(input);

    expect(xml).toContain('<CreditNote');
  });

  it('should generate Debit Note XML for tipoComprobante 08', () => {
    const input = createTestDebitNoteInput();
    const xml = generateXML(input);

    expect(xml).toContain('<DebitNote');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('XML Generation Edge Cases', () => {
  it('should handle input without optional formaPago', () => {
    const input = createTestInvoiceInput();
    input.formaPago = undefined;
    const xml = generateInvoiceXML(input);

    // Should still include default payment terms
    expect(xml).toContain('<cac:PaymentTerms>');
    expect(xml).toContain('<cbc:PaymentMeansID>Contado</cbc:PaymentMeansID>');
  });

  it('should handle input without optional leyendas', () => {
    const input = createTestInvoiceInput();
    input.leyendas = undefined;
    const xml = generateInvoiceXML(input);

    // Should still generate without Note elements
    expect(xml).not.toContain('<cbc:Note languageLocaleID="1000">');
  });

  it('should handle input without optional documentosRelacionados for credit note', () => {
    const input = createTestCreditNoteInput();
    input.documentosRelacionados = undefined;
    const xml = generateCreditNoteXML(input);

    // Should still generate without DiscrepancyResponse
    expect(xml).not.toContain('<cac:DiscrepancyResponse>');
  });

  it('should handle cliente without direccion', () => {
    const input = createTestInvoiceInput();
    input.cliente.direccion = undefined;
    const xml = generateInvoiceXML(input);

    // Should still generate AccountingCustomerParty
    expect(xml).toContain('<cac:AccountingCustomerParty>');
  });

  it('should use default NIU unit code when unidad not specified', () => {
    const input = createTestInvoiceInput();
    input.detalles[0].unidad = undefined;
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('unitCode="NIU"');
  });
});

// ============================================================================
// Format Verification Tests
// ============================================================================

describe('Amount Format Verification', () => {
  it('should format amounts with 2 decimal places', () => {
    const input = createTestInvoiceInput();
    const xml = generateInvoiceXML(input);

    // Check that amounts have proper format
    expect(xml).toMatch(/<cbc:TaxAmount currencyID="PEN">\d+\.\d{2}<\/cbc:TaxAmount>/);
    expect(xml).toMatch(/<cbc:LineExtensionAmount currencyID="PEN">\d+\.\d{2}<\/cbc:LineExtensionAmount>/);
  });

  it('should handle zero values correctly', () => {
    const input = createTestInvoiceInput();
    input.totales.totalIgv = 0;
    const xml = generateInvoiceXML(input);

    expect(xml).toContain('<cbc:TaxAmount currencyID="PEN">0.00</cbc:TaxAmount>');
  });
});
