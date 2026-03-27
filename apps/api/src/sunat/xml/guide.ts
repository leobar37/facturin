/**
 * UBL 2.1 DespatchAdvice (Guía de Remisión) XML Generator
 *
 * Generates valid UBL 2.1 XML documents for:
 * - Guía de Remisión (DocumentType '09')
 * - Guía de Remisión Transportista (DocumentType '31')
 */

import type { XmlGuiaInput, XmlGuiaDetalle } from '../types';
import {
  UBL_NAMESPACES,
  UBL_VERSION,
  UBL_CUSTOMIZATION,
  DESPATCH_ADVICE_NAMESPACE,
  SUNAT_AGREGGATE_NAMESPACE,
} from '../constants';

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

function buildDespatchSupplierParty(input: XmlGuiaInput): string {
  const { tenant } = input;
  return `    <cac:DespatchSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="6" schemeAgencyName="PE:SUNAT" schemeName="Documento de Identidad">${tenant.ruc}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName><![CDATA[${tenant.razonSocial}]]></cbc:RegistrationName>
                <cac:RegistrationAddress>
                    <cbc:AddressTypeCode>0000</cbc:AddressTypeCode>
                </cac:RegistrationAddress>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:DespatchSupplierParty>
`;
}

function buildDeliveryCustomerParty(input: XmlGuiaInput): string {
  const { destinatario } = input;
  return `    <cac:DeliveryCustomerParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="${destinatario.tipoDocumento}" schemeAgencyName="PE:SUNAT" schemeName="Documento de Identidad">${destinatario.numeroDocumento}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName><![CDATA[${destinatario.nombre}]]></cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:DeliveryCustomerParty>
`;
}

function buildShipment(input: XmlGuiaInput): string {
  const {
    pesoTotal,
    numeroBultos,
    ubigeoPuntoLlegada,
    direccionPuntoLlegada,
    ubigeoPuntoPartida,
    direccionPuntoPartida,
    motivoTraslado,
    indicadorTraslado,
    descripcionTraslado,
  } = input;

  const weight = pesoTotal ? formatAmount(pesoTotal) : '0.00';
  const packages = numeroBultos || 1;

  let shipmentInfo = `    <cac:Shipment>
        <cbc:ID>NOSHIP</cbc:ID>
        <cbc:GrossWeightMeasure unitCode="KGM">${weight}</cbc:GrossWeightMeasure>
        <cbc:TotalGrossWeightMeasure unitCode="KGM">${weight}</cbc:TotalGrossWeightMeasure>
        <cbc:TotalTransportHandlingUnitQuantity>${packages}</cbc:TotalTransportHandlingUnitQuantity>`;

  if (indicadorTraslado || motivoTraslado) {
    shipmentInfo += `
        <cac:ShipmentStage>
            <cbc:TransportModeCode>${indicadorTraslado || '01'}</cbc:TransportModeCode>
        </cac:ShipmentStage>`;
  }

  shipmentInfo += `
        <cac:Delivery>
            <cac:DeliveryAddress>
                <cbc:ID>${ubigeoPuntoLlegada}</cbc:ID>
                <cbc:StreetName><![CDATA[${direccionPuntoLlegada}]]></cbc:StreetName>
            </cac:DeliveryAddress>
        </cac:Delivery>
        <cac:OriginAddress>
            <cbc:ID>${ubigeoPuntoPartida}</cbc:ID>
            <cbc:StreetName><![CDATA[${direccionPuntoPartida}]]></cbc:StreetName>
        </cac:OriginAddress>`;

  if (motivoTraslado || descripcionTraslado) {
    shipmentInfo += `
        <cac:TransportHandlingUnit>
            <cbc:ID>1</cbc:ID>
        </cac:TransportHandlingUnit>`;
  }

  shipmentInfo += `
    </cac:Shipment>
`;

  return shipmentInfo;
}

function buildDespatchLines(input: XmlGuiaInput): string {
  const { detalles } = input;

  return detalles
    .map((detalle) => buildDespatchLine(detalle))
    .join('\n');
}

function buildDespatchLine(detalle: XmlGuiaDetalle): string {
  const {
    numeroLinea,
    cantidad,
    unidad,
    descripcion,
  } = detalle;

  const unitCode = unidad || 'NIU';

  return `    <cac:DespatchLine>
        <cbc:ID>${numeroLinea}</cbc:ID>
        <cbc:DeliveredQuantity unitCode="${unitCode}" unitCodeListAgencyName="United Nations Economic Commission for Europe" unitCodeListID="UN/ECE rec 20">${cantidad}</cbc:DeliveredQuantity>
        <cac:Item>
            <cbc:Description><![CDATA[${descripcion}]]></cbc:Description>
        </cac:Item>
    </cac:DespatchLine>
`;
}

function buildSUNATAgrement(input: XmlGuiaInput): string {
  const {
    motivoTraslado,
    indicadorTraslado,
    descripcionTraslado,
  } = input;

  if (!motivoTraslado && !descripcionTraslado) {
    return '';
  }

  return `    <sac:SUNATAgrement>
        <cbc:ID>1</cbc:ID>
        <sac:SUNATTransportModeCode>${indicadorTraslado || '01'}</sac:SUNATTransportModeCode>
        ${motivoTraslado ? `<sac:SUNATCarrierStatementCode>${motivoTraslado}</sac:SUNATCarrierStatementCode>` : ''}
        ${descripcionTraslado ? `<cbc:Description><![CDATA[${descripcionTraslado}]]></cbc:Description>` : ''}
    </sac:SUNATAgrement>
`;
}

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate UBL 2.1 DespatchAdvice XML (Guía de Remisión)
 *
 * @param input - XML generation input for Guía de Remisión
 * @returns Valid UBL 2.1 DespatchAdvice XML string for SUNAT
 */
export function generateDespatchAdviceXML(input: XmlGuiaInput): string {
  const {
    serie,
    numero,
    fechaEmision,
    tenant,
  } = input;

  const documentId = `${serie}-${numero}`;
  const issueDate = formatDate(fechaEmision);

  // TypeCode: 09 for Guía de Remisión, 31 for Transportista
  const typeCode = input.tipoComprobante === '09' ? '09' : '31';

  // Build all XML parts
  const ublExtensions = buildUBLExtensions();
  const signature = buildSignature(tenant.ruc, tenant.razonSocial);
  const despatchSupplierParty = buildDespatchSupplierParty(input);
  const deliveryCustomerParty = buildDeliveryCustomerParty(input);
  const shipment = buildShipment(input);
  const despatchLines = buildDespatchLines(input);
  const sunatAgrement = buildSUNATAgrement(input);

  const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<DespatchAdvice xmlns="${DESPATCH_ADVICE_NAMESPACE}"
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
    <cbc:DespatchAdviceTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Documento" listURI="urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01">${typeCode}</cbc:DespatchAdviceTypeCode>
    <cbc:GuaranteeCode>01</cbc:GuaranteeCode>
${signature}${despatchSupplierParty}${deliveryCustomerParty}${shipment}${sunatAgrement}${despatchLines}
</DespatchAdvice>`;

  return xml;
}
