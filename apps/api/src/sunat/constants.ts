// SUNAT constants: endpoints, namespaces, catalogs, document types

// ============================================================================
// Environment URLs
// ============================================================================

export const SUNAT_ENDPOINTS = {
  beta: {
    soap: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl',
    rest: 'https://e-beta.sunat.gob.pe:443/ol-ti-itcpfegem-beta/',
  },
  production: {
    soap: 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService?wsdl',
    rest: 'https://e-factura.sunat.gob.pe:443/ol-ti-itcpfegem/',
  },
} as const;

// ============================================================================
// SOAP Namespaces
// ============================================================================

export const SOAP_NAMESPACES = {
  soapenv: 'http://schemas.xmlsoap.org/soap/envelope/',
  ser: 'http://service.sunat.gob.pe',
  wsse: 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd',
} as const;

export const UBL_NAMESPACES = {
  cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  ccts: 'urn:un:unece:uncefact:documentation:2',
  ds: 'http://www.w3.org/2000/09/xmldsig#',
  ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  qdt: 'urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2',
  udt: 'urn:un:unece:uncefact:data:specification:QualifiedDatatypes-2',
} as const;

// ============================================================================
// Document-specific Namespaces
// ============================================================================

export const SUNAT_AGREGGATE_NAMESPACE = 'urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1';

export const DESPATCH_ADVICE_NAMESPACE = 'urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2';

export const CREDIT_NOTE_NAMESPACE = 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2';

export const DEBIT_NOTE_NAMESPACE = 'urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2';

export const INVOICE_NAMESPACE = 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2';

// ============================================================================
// UBL Version
// ============================================================================

export const UBL_VERSION = '2.1';
export const UBL_CUSTOMIZATION = '2.0';

// ============================================================================
// Document Types (Catalog 01)
// ============================================================================

export const DOCUMENT_TYPES: Record<string, string> = {
  '01': 'Factura',
  '03': 'Boleta',
  '07': 'Nota de Crédito',
  '08': 'Nota de Débito',
  '09': 'Guía de Remisión',
  '20': 'Nota de Crédito',
  '40': 'Comprobante de Percepción',
} as const;

// ============================================================================
// Customer Document Types (Catalog 06)
// ============================================================================

export const CUSTOMER_DOCUMENT_TYPES: Record<string, string> = {
  '0': 'Documento identidad',
  '1': 'Documento Oficial de Identidad',
  '4': 'Carnet de Extranjería',
  '6': 'Registro Único de Contribuyentes',
  '7': 'Pasaporte',
  'A': 'Cédula de Identidad',
} as const;

// ============================================================================
// IGV Affectation Types (Catalog 07)
// ============================================================================

export const IGV_AFECTATION_TYPES: Record<string, string> = {
  '10': 'Gravado - Operación Onerosa',
  '11': 'Gravado - Retiro por premio',
  '12': 'Gravado - Retiro por donación',
  '13': 'Gravado - Retiro',
  '14': 'Gravado - Retiro por spedición a título oneroso',
  '15': 'Gravado - Bonificaciones',
  '16': 'Gravado - Retiro por determinación de fexistente',
  '17': 'Gravado - IVAP',
  '20': 'Exonerado - Operación Onerosa',
  '21': 'Exonerado - Retiro por premio',
  '22': 'Exonerado - Retiro por donación',
  '23': 'Exonerado - Retiro',
  '24': 'Exonerado - Retiro por spedición a título oneroso',
  '25': 'Exonerado - Bonificaciones',
  '26': 'Exonerado - IVAP',
  '30': 'Inafecto - Operación Onerosa',
  '31': 'Inafecto - Retiro por premio',
  '32': 'Inafecto - Retiro por donación',
  '33': 'Inafecto - Retiro',
  '34': 'Inafecto - Retiro por spedición a título oneroso',
  '35': 'Inafecto - Bonificaciones',
  '36': 'Inafecto - Retiro por determinación de fexistente',
  '37': 'Inafecto - IVAP',
  '40': 'Exportación',
} as const;

// ============================================================================
// Unit Code Types (Catalog 03)
// ============================================================================

export const UNIT_CODE_TYPES: Record<string, string> = {
  NIU: 'Unidad (NIU)',
  PZA: 'Pieza (PZA)',
  KG: 'Kilogramo (KG)',
  LTR: 'Litro (LTR)',
  MTK: 'Metro Cuadrado (MTK)',
  MTQ: 'Metro Cúbico (MTQ)',
  UNID: 'Unidad (UNID)',
  BOT: 'Botella (BOT)',
  BOL: 'Bolsa (BOL)',
  CAJ: 'Caja (CAJ)',
  DOC: 'Docena (DOC)',
  GAL: 'Galón (GAL)',
  HAR: 'Kilogramo (HAR)',
  KW: 'Kilovatio (KW)',
  'KWH': 'Kilovatio Hora (KWH)',
  LB: 'Libra (LB)',
  MTR: 'Metro (MTR)',
  UM: 'Millar (UM)',
} as const;

// ============================================================================
// Price Type Codes (Catalog 16)
// ============================================================================

export const PRICE_TYPE_CODES: Record<string, string> = {
  '01': 'Precio unitario (incluye IGV)',
  '02': 'Valor referencial unitario en operaciones no onerosas',
} as const;

// ============================================================================
// Payment Terms
// ============================================================================

export const PAYMENT_TERMS: Record<string, string> = {
  'contado': 'Pago al contado',
  'credito': 'Pago a crédito',
} as const;

// ============================================================================
// Legend Codes (Catalog 59)
// ============================================================================

export const LEGEND_CODES: Record<string, string> = {
  '1000': 'Monto en letras',
  '1002': 'TRANSFERENCIA - DETRACCIÓN',
  '1003': 'BIENES TRANSFERIDOS EN LA AMAZONÍA REGIÓN SELVA',
  '1004': 'BIENES TRANSFERIDOS EN LA AMAZONÍA REGIÓN SELVA - II',
  '2000': 'MESA DE PARTES Virtual',
  '2001': 'PROVEEDOR DEL ESTADO',
  '3000': 'Monto de detracción',
  '3001': 'CÓDIGO DE BAJA',
} as const;

// ============================================================================
// SUNAT Status Codes
// ============================================================================

export const SUNAT_STATUS_CODES: Record<number, { status: string; description: string }> = {
  0: { status: 'ACEPTADO', description: 'Aceptado' },
  98: { status: 'EN_PROCESO', description: 'En proceso' },
  99: { status: 'EXCEPCION', description: 'Excepción' },
  // Codes 100-1999: Excepciones
  // Codes 2000-3999: Rechazados
  // Codes 4000+: Aceptados
} as const;

// ============================================================================
// Tax Codes
// ============================================================================

export const TAX_CODES = {
  IGV: '1000',
  ISC: '2000',
  ICBP: '7152',
  OTROS: '9999',
} as const;

// ============================================================================
// Signature Constants
// ============================================================================

export const SIGNATURE_METHOD = 'RSA-SHA1';
export const CANONICALIZATION_METHOD = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
export const DIGEST_METHOD = 'http://www.w3.org/2000/09/xmldsig#sha1';
