/**
 * UBL 2.1 XML Generator for SUNAT Electronic Invoicing
 *
 * Generates valid UBL 2.1 XML documents for:
 * - Invoice (Factura) - DocumentType '01'
 * - Credit Note (Nota de Crédito) - DocumentType '07'
 * - Debit Note (Nota de Débito) - DocumentType '08'
 * - Despatch Advice (Guía de Remisión) - DocumentType '09'
 * - Perception (Comprobante de Percepción) - DocumentType '40'
 */

import type {
  XmlGenerationInput,
  XmlDetalle,
  XmlTotales,
  DocumentType,
  XmlGuiaInput,
  XmlPercepcionInput,
} from '../types';

import {
  UBL_NAMESPACES,
  UBL_VERSION,
  UBL_CUSTOMIZATION,
  TAX_CODES,
} from '../constants';

import { generateDespatchAdviceXML } from './guide';
import { generatePerceptionXML } from './perception';

// ============================================================================
// XML Namespaces for UBL 2.1
// ============================================================================

const INVOICE_NAMESPACE = 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2';
const CREDIT_NOTE_NAMESPACE = 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2';
const DEBIT_NOTE_NAMESPACE = 'urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2';
const SUNAT_AGGREGATE_NAMESPACE = 'urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a date to YYYY-MM-DD string
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

/**
 * Format a number to 2 decimal places
 */
function formatAmount(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(2);
}

/**
/**
 * Build UBL extensions block with empty ExtensionContent for signature insertion
 */
function buildUBLExtensions(): string {
  return `    <ext:UBLExtensions>
        <ext:UBLExtension>
            <ext:ExtensionContent/>
        </ext:UBLExtension>
    </ext:UBLExtensions>
`;
}

/**
 * Build the Signature element for the document
 */
function buildSignature(ruc: string, razonSocial: string): string {
  return `    <cac:Signature>
        <cbc:ID>${ruc}</cbc:ID>
        <cac:SignatoryParty>
            <cac:PartyIdentification>
                <cbc:ID>${ruc}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name><![CDATA[${razonSocial}]]></cbc:Name>
            </cac:PartyName>
        </cac:SignatoryParty>
        <cac:DigitalSignatureAttachment>
            <cac:ExternalReference>
                <cbc:URI>#PROJECT-OPENUBL-SIGN</cbc:URI>
            </cac:ExternalReference>
        </cac:DigitalSignatureAttachment>
    </cac:Signature>
`;
}

/**
 * Build AccountingSupplierParty (Emisor/Seller)
 */
function buildAccountingSupplierParty(input: XmlGenerationInput): string {
  const { tenant } = input;
  return `    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="6" schemeAgencyName="PE:SUNAT" schemeName="Documento de Identidad" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${tenant.ruc}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName><![CDATA[${tenant.razonSocial}]]></cbc:RegistrationName>
                ${tenant.ubigeo ? `<cac:RegistrationAddress>
                    <cbc:AddressTypeCode>0000</cbc:AddressTypeCode>
                </cac:RegistrationAddress>` : ''}
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>
`;
}

/**
 * Build AccountingCustomerParty (Receptor/Buyer)
 */
function buildAccountingCustomerParty(input: XmlGenerationInput): string {
  const { cliente } = input;
  return `    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="${cliente.tipoDocumento}" schemeAgencyName="PE:SUNAT" schemeName="Documento de Identidad" schemeURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06">${cliente.numeroDocumento}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName><![CDATA[${cliente.nombre}]]></cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>
`;
}

/**
 * Build PaymentTerms for invoice
 */
function buildPaymentTerms(input: XmlGenerationInput): string {
  if (!input.formaPago) {
    return `    <cac:PaymentTerms>
        <cbc:ID>FormaPago</cbc:ID>
        <cbc:PaymentMeansID>Contado</cbc:PaymentMeansID>
    </cac:PaymentTerms>
`;
  }

  const { formaPago } = input;
  return `    <cac:PaymentTerms>
        <cbc:ID>FormaPago</cbc:ID>
        <cbc:PaymentMeansID>${formaPago.tipoPago === 'credito' ? 'Credito' : 'Contado'}</cbc:PaymentMeansID>
    </cac:PaymentTerms>
`;
}

/**
 * Build TaxTotal element with IGV tax
 */
function buildTaxTotal(totales: XmlTotales): string {
  const taxAmount = formatAmount(totales.totalIgv);
  const taxableAmount = formatAmount(totales.totalGravadas);

  return `    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="PEN">${taxAmount}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="PEN">${taxableAmount}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="PEN">${taxAmount}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID schemeAgencyName="United Nations Economic Commission for Europe" schemeID="UN/ECE 5305" schemeName="Tax Category Identifie">S</cbc:ID>
                <cac:TaxScheme>
                    <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="UN/ECE 5153" schemeName="Codigo de tributos">${TAX_CODES.IGV}</cbc:ID>
                    <cbc:Name>IGV</cbc:Name>
                    <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>
`;
}

/**
 * Build LegalMonetaryTotal for Invoice
 */
function buildLegalMonetaryTotal(totales: XmlTotales): string {
  const lineExtension = formatAmount(totales.totalGravadas);
  const taxInclusive = formatAmount(totales.totalImporte);
  const payable = formatAmount(totales.totalImporte);

  return `    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="PEN">${lineExtension}</cbc:LineExtensionAmount>
        <cbc:TaxInclusiveAmount currencyID="PEN">${taxInclusive}</cbc:TaxInclusiveAmount>
        <cbc:AllowanceTotalAmount currencyID="PEN">0</cbc:AllowanceTotalAmount>
        <cbc:PrepaidAmount currencyID="PEN">0</cbc:PrepaidAmount>
        <cbc:PayableAmount currencyID="PEN">${payable}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
`;
}

/**
 * Build RequestedMonetaryTotal for Debit Note (uses different element name)
 */
function buildRequestedMonetaryTotal(totales: XmlTotales): string {
  const lineExtension = formatAmount(totales.totalGravadas);
  const taxInclusive = formatAmount(totales.totalImporte);
  const payable = formatAmount(totales.totalImporte);

  return `    <cac:RequestedMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="PEN">${lineExtension}</cbc:LineExtensionAmount>
        <cbc:TaxInclusiveAmount currencyID="PEN">${taxInclusive}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="PEN">${payable}</cbc:PayableAmount>
    </cac:RequestedMonetaryTotal>
`;
}

/**
 * Build an InvoiceLine element
 */
function buildInvoiceLine(detalle: XmlDetalle): string {
  const {
    numeroLinea,
    descripcion,
    cantidad,
    unidad,
    precioUnitario,
    precioTipo,
    valorVenta,
    igv,
    igvAfectacion,
  } = detalle;

  const lineExtensionAmount = formatAmount(valorVenta);
  const taxAmount = formatAmount(igv);
  const taxableAmount = formatAmount(valorVenta);
  const priceAmount = formatAmount(precioUnitario);
  const unitCode = unidad || 'NIU';

  return `    <cac:InvoiceLine>
        <cbc:ID>${numeroLinea}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="${unitCode}" unitCodeListAgencyName="United Nations Economic Commission for Europe" unitCodeListID="UN/ECE rec 20">${cantidad}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="PEN">${lineExtensionAmount}</cbc:LineExtensionAmount>
        <cac:PricingReference>
            <cac:AlternativeConditionPrice>
                <cbc:PriceAmount currencyID="PEN">${priceAmount}</cbc:PriceAmount>
                <cbc:PriceTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Precio" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16">${precioTipo}</cbc:PriceTypeCode>
            </cac:AlternativeConditionPrice>
        </cac:PricingReference>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="PEN">${taxAmount}</cbc:TaxAmount>
            <cac:TaxSubtotal>
                <cbc:TaxableAmount currencyID="PEN">${taxableAmount}</cbc:TaxableAmount>
                <cbc:TaxAmount currencyID="PEN">${taxAmount}</cbc:TaxAmount>
                <cac:TaxCategory>
                    <cbc:ID schemeAgencyName="United Nations Economic Commission for Europe" schemeID="UN/ECE 5305" schemeName="Tax Category Identifier">S</cbc:ID>
                    <cbc:Percent>18.00</cbc:Percent>
                    <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07">${igvAfectacion}</cbc:TaxExemptionReasonCode>
                    <cac:TaxScheme>
                        <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="UN/ECE 5153" schemeName="Codigo de tributos">${TAX_CODES.IGV}</cbc:ID>
                        <cbc:Name>IGV</cbc:Name>
                        <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
                    </cac:TaxScheme>
                </cac:TaxCategory>
            </cac:TaxSubtotal>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Description><![CDATA[${descripcion}]]></cbc:Description>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="PEN">${priceAmount}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>
`;
}

/**
 * Build a CreditNoteLine element
 */
function buildCreditNoteLine(detalle: XmlDetalle): string {
  const {
    numeroLinea,
    descripcion,
    cantidad,
    unidad,
    precioUnitario,
    precioTipo,
    valorVenta,
    igv,
    igvAfectacion,
  } = detalle;

  const lineExtensionAmount = formatAmount(valorVenta);
  const taxAmount = formatAmount(igv);
  const taxableAmount = formatAmount(valorVenta);
  const priceAmount = formatAmount(precioUnitario);
  const unitCode = unidad || 'NIU';

  return `    <cac:CreditNoteLine>
        <cbc:ID>${numeroLinea}</cbc:ID>
        <cbc:CreditedQuantity unitCode="${unitCode}" unitCodeListAgencyName="United Nations Economic Commission for Europe" unitCodeListID="UN/ECE rec 20">${cantidad}</cbc:CreditedQuantity>
        <cbc:LineExtensionAmount currencyID="PEN">${lineExtensionAmount}</cbc:LineExtensionAmount>
        <cac:PricingReference>
            <cac:AlternativeConditionPrice>
                <cbc:PriceAmount currencyID="PEN">${priceAmount}</cbc:PriceAmount>
                <cbc:PriceTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Precio" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16">${precioTipo}</cbc:PriceTypeCode>
            </cac:AlternativeConditionPrice>
        </cac:PricingReference>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="PEN">${taxAmount}</cbc:TaxAmount>
            <cac:TaxSubtotal>
                <cbc:TaxableAmount currencyID="PEN">${taxableAmount}</cbc:TaxableAmount>
                <cbc:TaxAmount currencyID="PEN">${taxAmount}</cbc:TaxAmount>
                <cac:TaxCategory>
                    <cbc:ID schemeAgencyName="United Nations Economic Commission for Europe" schemeID="UN/ECE 5305" schemeName="Tax Category Identifier">S</cbc:ID>
                    <cbc:Percent>18.00</cbc:Percent>
                    <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07">${igvAfectacion}</cbc:TaxExemptionReasonCode>
                    <cac:TaxScheme>
                        <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="UN/ECE 5153" schemeName="Codigo de tributos">${TAX_CODES.IGV}</cbc:ID>
                        <cbc:Name>IGV</cbc:Name>
                        <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
                    </cac:TaxScheme>
                </cac:TaxCategory>
            </cac:TaxSubtotal>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Description><![CDATA[${descripcion}]]></cbc:Description>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="PEN">${priceAmount}</cbc:PriceAmount>
        </cac:Price>
    </cac:CreditNoteLine>
`;
}

/**
 * Build a DebitNoteLine element
 */
function buildDebitNoteLine(detalle: XmlDetalle): string {
  const {
    numeroLinea,
    descripcion,
    cantidad,
    unidad,
    precioUnitario,
    precioTipo,
    valorVenta,
    igv,
    igvAfectacion,
  } = detalle;

  const lineExtensionAmount = formatAmount(valorVenta);
  const taxAmount = formatAmount(igv);
  const taxableAmount = formatAmount(valorVenta);
  const priceAmount = formatAmount(precioUnitario);
  const unitCode = unidad || 'NIU';

  return `    <cac:DebitNoteLine>
        <cbc:ID>${numeroLinea}</cbc:ID>
        <cbc:DebitedQuantity unitCode="${unitCode}" unitCodeListAgencyName="United Nations Economic Commission for Europe" unitCodeListID="UN/ECE rec 20">${cantidad}</cbc:DebitedQuantity>
        <cbc:LineExtensionAmount currencyID="PEN">${lineExtensionAmount}</cbc:LineExtensionAmount>
        <cac:PricingReference>
            <cac:AlternativeConditionPrice>
                <cbc:PriceAmount currencyID="PEN">${priceAmount}</cbc:PriceAmount>
                <cbc:PriceTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Precio" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16">${precioTipo}</cbc:PriceTypeCode>
            </cac:AlternativeConditionPrice>
        </cac:PricingReference>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="PEN">${taxAmount}</cbc:TaxAmount>
            <cac:TaxSubtotal>
                <cbc:TaxableAmount currencyID="PEN">${taxableAmount}</cbc:TaxableAmount>
                <cbc:TaxAmount currencyID="PEN">${taxAmount}</cbc:TaxAmount>
                <cac:TaxCategory>
                    <cbc:ID schemeAgencyName="United Nations Economic Commission for Europe" schemeID="UN/ECE 5305" schemeName="Tax Category Identifier">S</cbc:ID>
                    <cbc:Percent>18.00</cbc:Percent>
                    <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07">${igvAfectacion}</cbc:TaxExemptionReasonCode>
                    <cac:TaxScheme>
                        <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="UN/ECE 5153" schemeName="Codigo de tributos">${TAX_CODES.IGV}</cbc:ID>
                        <cbc:Name>IGV</cbc:Name>
                        <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
                    </cac:TaxScheme>
                </cac:TaxCategory>
            </cac:TaxSubtotal>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Description><![CDATA[${descripcion}]]></cbc:Description>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="PEN">${priceAmount}</cbc:PriceAmount>
        </cac:Price>
    </cac:DebitNoteLine>
`;
}

/**
 * Build DiscrepancyResponse for Credit/Debit notes
 */
function buildDiscrepancyResponse(input: XmlGenerationInput): string {
  const { documentosRelacionados } = input;

  if (!documentosRelacionados || documentosRelacionados.length === 0) {
    return '';
  }

  const ref = documentosRelacionados[0];
  return `    <cac:DiscrepancyResponse>
        <cbc:ReferenceID>${ref.numeroDocumento}</cbc:ReferenceID>
        <cbc:ResponseCode>01</cbc:ResponseCode>
        <cbc:Description><![CDATA[Nota de ${input.tipoComprobante === '07' ? 'Crédito' : 'Débito'}]]></cbc:Description>
    </cac:DiscrepancyResponse>
`;
}

/**
 * Build BillingReference for Credit/Debit notes
 */
function buildBillingReference(input: XmlGenerationInput): string {
  const { documentosRelacionados } = input;

  if (!documentosRelacionados || documentosRelacionados.length === 0) {
    return '';
  }

  const ref = documentosRelacionados[0];
  return `    <cac:BillingReference>
        <cac:InvoiceDocumentReference>
            <cbc:ID>${ref.numeroDocumento}</cbc:ID>
            <cbc:DocumentTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01">${ref.tipoDocumento}</cbc:DocumentTypeCode>
        </cac:InvoiceDocumentReference>
    </cac:BillingReference>
`;
}

/**
 * Build legends (notas) if present
 */
function buildLegends(input: XmlGenerationInput): string {
  const { leyendas } = input;

  if (!leyendas || leyendas.length === 0) {
    return '';
  }

  return leyendas
    .map((leyenda) => `    <cbc:Note languageLocaleID="${leyenda.codigo}"><![CDATA[${leyenda.descripcion}]]></cbc:Note>`)
    .join('\n') + '\n';
}

/**
 * Build document lines based on document type
 */
function buildDocumentLines(input: XmlGenerationInput): string {
  const { tipoComprobante, detalles } = input;

  switch (tipoComprobante) {
    case '07':
      return detalles.map(buildCreditNoteLine).join('\n');
    case '08':
      return detalles.map(buildDebitNoteLine).join('\n');
    default:
      return detalles.map(buildInvoiceLine).join('\n');
  }
}

/**
 * Get the root element name based on document type
 */
function getRootElementName(tipoComprobante: DocumentType): string {
  switch (tipoComprobante) {
    case '07':
      return 'CreditNote';
    case '08':
      return 'DebitNote';
    default:
      return 'Invoice';
  }
}

/**
 * Get the namespace for the root element
 */
function getRootNamespace(tipoComprobante: DocumentType): string {
  switch (tipoComprobante) {
    case '07':
      return CREDIT_NOTE_NAMESPACE;
    case '08':
      return DEBIT_NOTE_NAMESPACE;
    default:
      return INVOICE_NAMESPACE;
  }
}

// ============================================================================
// Main Generator Functions
// ============================================================================

/**
 * Generate UBL 2.1 Invoice XML
 *
 * @param input - XML generation input with invoice data
 * @returns Valid UBL 2.1 XML string for SUNAT
 */
export function generateInvoiceXML(input: XmlGenerationInput): string {
  const {
    tipoComprobante,
    serie,
    numero,
    fechaEmision,
    tenant,
    totales,
  } = input;

  const rootElement = getRootElementName(tipoComprobante);
  const rootNamespace = getRootNamespace(tipoComprobante);
  const documentId = `${serie}-${numero}`;
  const issueDate = formatDate(fechaEmision);

  // Build all XML parts
  const ublExtensions = buildUBLExtensions();
  const signature = buildSignature(tenant.ruc, tenant.razonSocial);
  const supplierParty = buildAccountingSupplierParty(input);
  const customerParty = buildAccountingCustomerParty(input);
  const paymentTerms = buildPaymentTerms(input);
  const taxTotal = buildTaxTotal(totales);
  const monetaryTotal = buildLegalMonetaryTotal(totales);
  const lines = buildDocumentLines(input);
  const legends = buildLegends(input);

  // For invoice, use listID "0101" (Tipo de Documento)
  const invoiceTypeCode = tipoComprobante === '01' ? '0101' : tipoComprobante === '03' ? '0301' : '0101';

  const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<${rootElement} xmlns="${rootNamespace}"
         xmlns:cac="${UBL_NAMESPACES.cac}"
         xmlns:cbc="${UBL_NAMESPACES.cbc}"
         xmlns:ccts="${UBL_NAMESPACES.ccts}"
         xmlns:cec="${UBL_NAMESPACES.ext}"
         xmlns:ds="${UBL_NAMESPACES.ds}"
         xmlns:ext="${UBL_NAMESPACES.ext}"
         xmlns:qdt="${UBL_NAMESPACES.qdt}"
         xmlns:sac="${SUNAT_AGGREGATE_NAMESPACE}"
         xmlns:udt="${UBL_NAMESPACES.udt}"
         xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
>
${ublExtensions}    <cbc:UBLVersionID>${UBL_VERSION}</cbc:UBLVersionID>
    <cbc:CustomizationID>${UBL_CUSTOMIZATION}</cbc:CustomizationID>
    <cbc:ID>${documentId}</cbc:ID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:InvoiceTypeCode listID="${invoiceTypeCode}" listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01">${tipoComprobante}</cbc:InvoiceTypeCode>
${legends}    <cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listAgencyName="United Nations Economic Commission for Europe" listName="Currency">PEN</cbc:DocumentCurrencyCode>
${signature}${supplierParty}${customerParty}${paymentTerms}${taxTotal}${monetaryTotal}
${lines}
</${rootElement}>`;

  return xml;
}

/**
 * Generate UBL 2.1 Credit Note XML
 *
 * @param input - XML generation input with credit note data
 * @returns Valid UBL 2.1 Credit Note XML string for SUNAT
 */
export function generateCreditNoteXML(input: XmlGenerationInput): string {
  const {
    tipoComprobante,
    serie,
    numero,
    fechaEmision,
    tenant,
    totales,
  } = input;

  // Validate that this is a credit note
  if (tipoComprobante !== '07') {
    throw new Error('generateCreditNoteXML only supports document type 07 (Credit Note)');
  }

  const rootElement = 'CreditNote';
  const rootNamespace = CREDIT_NOTE_NAMESPACE;
  const documentId = `${serie}-${numero}`;
  const issueDate = formatDate(fechaEmision);

  // Build all XML parts
  const ublExtensions = buildUBLExtensions();
  const signature = buildSignature(tenant.ruc, tenant.razonSocial);
  const supplierParty = buildAccountingSupplierParty(input);
  const customerParty = buildAccountingCustomerParty(input);
  const discrepancyResponse = buildDiscrepancyResponse(input);
  const billingReference = buildBillingReference(input);
  const taxTotal = buildTaxTotal(totales);
  const monetaryTotal = buildLegalMonetaryTotal(totales);
  const lines = buildDocumentLines(input);
  const legends = buildLegends(input);

  const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<${rootElement} xmlns="${rootNamespace}"
         xmlns:cac="${UBL_NAMESPACES.cac}"
         xmlns:cbc="${UBL_NAMESPACES.cbc}"
         xmlns:ccts="${UBL_NAMESPACES.ccts}"
         xmlns:cec="${UBL_NAMESPACES.ext}"
         xmlns:ds="${UBL_NAMESPACES.ds}"
         xmlns:ext="${UBL_NAMESPACES.ext}"
         xmlns:qdt="${UBL_NAMESPACES.qdt}"
         xmlns:sac="${SUNAT_AGGREGATE_NAMESPACE}"
         xmlns:udt="${UBL_NAMESPACES.udt}"
         xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
>
${ublExtensions}    <cbc:UBLVersionID>${UBL_VERSION}</cbc:UBLVersionID>
    <cbc:CustomizationID>${UBL_CUSTOMIZATION}</cbc:CustomizationID>
    <cbc:ID>${documentId}</cbc:ID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
${legends}    <cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listAgencyName="United Nations Economic Commission for Europe" listName="Currency">PEN</cbc:DocumentCurrencyCode>
${discrepancyResponse}${billingReference}${signature}${supplierParty}${customerParty}${taxTotal}${monetaryTotal}
${lines}
</${rootElement}>`;

  return xml;
}

/**
 * Generate UBL 2.1 Debit Note XML
 *
 * @param input - XML generation input with debit note data
 * @returns Valid UBL 2.1 Debit Note XML string for SUNAT
 */
export function generateDebitNoteXML(input: XmlGenerationInput): string {
  const {
    tipoComprobante,
    serie,
    numero,
    fechaEmision,
    tenant,
    totales,
  } = input;

  // Validate that this is a debit note
  if (tipoComprobante !== '08') {
    throw new Error('generateDebitNoteXML only supports document type 08 (Debit Note)');
  }

  const rootElement = 'DebitNote';
  const rootNamespace = DEBIT_NOTE_NAMESPACE;
  const documentId = `${serie}-${numero}`;
  const issueDate = formatDate(fechaEmision);

  // Build all XML parts
  const ublExtensions = buildUBLExtensions();
  const signature = buildSignature(tenant.ruc, tenant.razonSocial);
  const supplierParty = buildAccountingSupplierParty(input);
  const customerParty = buildAccountingCustomerParty(input);
  const discrepancyResponse = buildDiscrepancyResponse(input);
  const billingReference = buildBillingReference(input);
  const taxTotal = buildTaxTotal(totales);
  const monetaryTotal = buildRequestedMonetaryTotal(totales);
  const lines = buildDocumentLines(input);
  const legends = buildLegends(input);

  const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<${rootElement} xmlns="${rootNamespace}"
         xmlns:cac="${UBL_NAMESPACES.cac}"
         xmlns:cbc="${UBL_NAMESPACES.cbc}"
         xmlns:ccts="${UBL_NAMESPACES.ccts}"
         xmlns:cec="${UBL_NAMESPACES.ext}"
         xmlns:ds="${UBL_NAMESPACES.ds}"
         xmlns:ext="${UBL_NAMESPACES.ext}"
         xmlns:qdt="${UBL_NAMESPACES.qdt}"
         xmlns:sac="${SUNAT_AGGREGATE_NAMESPACE}"
         xmlns:udt="${UBL_NAMESPACES.udt}"
         xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
>
${ublExtensions}    <cbc:UBLVersionID>${UBL_VERSION}</cbc:UBLVersionID>
    <cbc:CustomizationID>${UBL_CUSTOMIZATION}</cbc:CustomizationID>
    <cbc:ID>${documentId}</cbc:ID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
${legends}    <cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listAgencyName="United Nations Economic Commission for Europe" listName="Currency">PEN</cbc:DocumentCurrencyCode>
${discrepancyResponse}${billingReference}${signature}${supplierParty}${customerParty}${taxTotal}${monetaryTotal}
${lines}
</${rootElement}>`;

  return xml;
}

/**
 * Generate UBL 2.1 XML based on document type
 *
 * @param input - XML generation input with document data
 * @returns Valid UBL 2.1 XML string for SUNAT
 */
export function generateXML(input: XmlGenerationInput | XmlGuiaInput | XmlPercepcionInput): string {
  switch (input.tipoComprobante) {
    case '09':
      return generateDespatchAdviceXML(input as XmlGuiaInput);
    case '40':
      return generatePerceptionXML(input as XmlPercepcionInput);
    case '07':
      return generateCreditNoteXML(input as XmlGenerationInput);
    case '08':
      return generateDebitNoteXML(input as XmlGenerationInput);
    case '01':
    case '03':
    default:
      return generateInvoiceXML(input as XmlGenerationInput);
  }
}
