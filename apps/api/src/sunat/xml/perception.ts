/**
 * UBL 2.1 Perception (Comprobante de Percepción) XML Generator
 *
 * Generates valid UBL 2.1 XML documents for:
 * - Comprobante de Percepción (DocumentType '40')
 */

import type { XmlPercepcionInput, XmlPercepcionDetalle } from '../types';
import {
  UBL_NAMESPACES,
  UBL_VERSION,
  UBL_CUSTOMIZATION,
  SUNAT_AGREGGATE_NAMESPACE,
} from '../constants';

// ============================================================================
// Constants
// ============================================================================

const PERCEPTION_NAMESPACE = 'urn:oasis:names:specification:ubl:schema:xsd:Perception-2';

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

function formatAmount(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(2);
}

// ============================================================================
// XML Builders
// ============================================================================

function buildUBLExtensions(): string {
  return `    <ext:UBLExtensions>
        <ext:UBLExtension>
            <ext:ExtensionContent/>
        </ext:UBLExtension>
    </ext:UBLExtensions>
`;
}

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

function buildSUNATPerceptionDocumentReference(detalle: XmlPercepcionDetalle): string {
  const {
    tipoComprobante,
    serieComprobante,
    numeroComprobante,
    fechaEmisionComprobante,
    importePercibido,
    importeBasePercibida,
    tasaPercepcion,
  } = detalle;

  const docId = `${serieComprobante}-${String(numeroComprobante).padStart(8, '0')}`;
  const issueDate = formatDate(fechaEmisionComprobante);
  const perceptionRate = formatAmount(tasaPercepcion);

  return `            <sac:SUNATPerceptionDocumentReference>
                <cbc:ID>${docId}</cbc:ID>
                <cbc:IssueDate>${issueDate}</cbc:IssueDate>
                <cbc:DocumentTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01">${tipoComprobante}</cbc:DocumentTypeCode>
                <sac:SUNATPerceptionInformation>
                    <cbc: SUNATPerceptionAmount currencyID="PEN">${formatAmount(importePercibido)}</cbc: SUNATPerceptionAmount>
                    <cbc: SUNATPerceptionBaseAmount currencyID="PEN">${formatAmount(importeBasePercibida)}</cbc: SUNATPerceptionBaseAmount>
                    <sac:SUNATPerceptionRate>${perceptionRate}</sac:SUNATPerceptionRate>
                    <sac:SUNATTotalCumulativePerceptionAmount currencyID="PEN">${formatAmount(importePercibido)}</sac:SUNATTotalCumulativePerceptionAmount>
                </sac:SUNATPerceptionInformation>
                <cac:BillingReferenceLine>
                    <cbc:ID>0</cbc:ID>
                    <cac:BillingReference>
                        <cac:InvoiceDocumentReference>
                            <cbc:ID>${docId}</cbc:ID>
                            <cbc:DocumentTypeCode>${tipoComprobante}</cbc:DocumentTypeCode>
                        </cac:InvoiceDocumentReference>
                    </cac:BillingReference>
                </cac:BillingReferenceLine>
            </sac:SUNATPerceptionDocumentReference>
`;
}

function buildSUNATAggregatedMonetaryTotal(input: XmlPercepcionInput): string {
  const { totales } = input;

  return `    <sac:SUNATAggregatedMonetaryTotal>
        <cbc: SUNATPerceptionAmount currencyID="PEN">${formatAmount(totales.totalImportePercibido)}</cbc: SUNATPerceptionAmount>
        <cbc: SUNATPerceptionBaseAmount currencyID="PEN">${formatAmount(totales.totalImporteBasePercibida)}</cbc: SUNATPerceptionBaseAmount>
        <sac:SUNATTotalCumulativePerceptionAmount currencyID="PEN">${formatAmount(totales.totalImportePercibido)}</sac:SUNATTotalCumulativePerceptionAmount>
        <cbc:PayableAmount currencyID="PEN">${formatAmount(totales.totalImporteTotal)}</cbc:PayableAmount>
    </sac:SUNATAggregatedMonetaryTotal>
`;
}

function buildBillingReference(input: XmlPercepcionInput): string {
  const { percepciones } = input;

  if (percepciones.length === 0) {
    return '';
  }

  // Reference the first perception document as billing reference
  const firstPerception = percepciones[0];
  const docId = `${firstPerception.serieComprobante}-${String(firstPerception.numeroComprobante).padStart(8, '0')}`;

  return `    <cac:BillingReference>
        <cac:InvoiceDocumentReference>
            <cbc:ID>${docId}</cbc:ID>
            <cbc:DocumentTypeCode>${firstPerception.tipoComprobante}</cbc:DocumentTypeCode>
        </cac:InvoiceDocumentReference>
    </cac:BillingReference>
`;
}

function buildSUNATPerceptionDetails(input: XmlPercepcionInput): string {
  const { percepciones } = input;

  const details = percepciones
    .map((detalle) => buildSUNATPerceptionDocumentReference(detalle))
    .join('\n');

  return `    <sac:SUNATPerceptionDocuments>
${details}    </sac:SUNATPerceptionDocuments>
`;
}

function buildLegalMonetaryTotal(input: XmlPercepcionInput): string {
  const { totales } = input;

  return `    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="PEN">${formatAmount(totales.totalImporteBasePercibida)}</cbc:LineExtensionAmount>
        <cbc:TaxInclusiveAmount currencyID="PEN">${formatAmount(totales.totalImporteTotal)}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="PEN">${formatAmount(totales.totalImporteTotal)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
`;
}

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate UBL 2.1 Perception XML (Comprobante de Percepción)
 *
 * @param input - XML generation input for Comprobante de Percepción
 * @returns Valid UBL 2.1 Perception XML string for SUNAT
 */
export function generatePerceptionXML(input: XmlPercepcionInput): string {
  const {
    serie,
    numero,
    fechaEmision,
    tenant,
    cliente,
    observaciones,
  } = input;

  const documentId = `${serie}-${numero}`;
  const issueDate = formatDate(fechaEmision);

  // Build all XML parts
  const ublExtensions = buildUBLExtensions();
  const signature = buildSignature(tenant.ruc, tenant.razonSocial);
  const billingReference = buildBillingReference(input);
  const sunatAggregatedMonetaryTotal = buildSUNATAggregatedMonetaryTotal(input);
  const sunatPerceptionDetails = buildSUNATPerceptionDetails(input);
  const legalMonetaryTotal = buildLegalMonetaryTotal(input);

  const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<Perception xmlns="${PERCEPTION_NAMESPACE}"
         xmlns:cac="${UBL_NAMESPACES.cac}"
         xmlns:cbc="${UBL_NAMESPACES.cbc}"
         xmlns:ccts="${UBL_NAMESPACES.ccts}"
         xmlns:ds="${UBL_NAMESPACES.ds}"
         xmlns:ext="${UBL_NAMESPACES.ext}"
         xmlns:qdt="${UBL_NAMESPACES.qdt}"
         xmlns:sac="${SUNAT_AGREGGATE_NAMESPACE}"
         xmlns:udt="${UBL_NAMESPACES.udt}"
         xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
>
${ublExtensions}    <cbc:UBLVersionID>${UBL_VERSION}</cbc:UBLVersionID>
    <cbc:CustomizationID>${UBL_CUSTOMIZATION}</cbc:CustomizationID>
    <cbc:ID>${documentId}</cbc:ID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:PerceptionCode>${input.tipoComprobante}</cbc:PerceptionCode>
    <cbc:DocumentCurrencyCode listID="ISO 4217 Alpha" listAgencyName="United Nations Economic Commission for Europe" listName="Currency">PEN</cbc:DocumentCurrencyCode>
    ${observaciones ? `<cbc:Note><![CDATA[${observaciones}]]></cbc:Note>` : ''}
${signature}    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="6" schemeAgencyName="PE:SUNAT" schemeName="Documento de Identidad">${tenant.ruc}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName><![CDATA[${tenant.razonSocial}]]></cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="${cliente.tipoDocumento}" schemeAgencyName="PE:SUNAT" schemeName="Documento de Identidad">${cliente.numeroDocumento}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName><![CDATA[${cliente.nombre}]]></cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>
${billingReference}${sunatAggregatedMonetaryTotal}${sunatPerceptionDetails}${legalMonetaryTotal}
</Perception>`;

  return xml;
}
