// SUNAT-specific types for electronic invoicing

export type SunatEnvironment = 'beta' | 'production';

export type DocumentType =
  | '01' // Factura
  | '03' // Boleta
  | '07' // Nota de crédito
  | '08' // Nota de débito
  | '09' // Guía de remisión
  | '20' // Nota de crédito (otro)
  | '40'; // Comprobante de percepción

export type SunatStatusCode = 0 | 98 | 99 | number;

export type ComprobanteSunatEstado =
  | 'pendiente'
  | 'enviado'
  | 'aceptado'
  | 'rechazado'
  | 'anulado'
  | 'excepcion'
  | 'en_proceso';

export interface SunatCredentials {
  username: string;
  password: string;
}

export interface SunatEnvioResult {
  success: boolean;
  ticket?: string;
  xmlContent?: string;
  statusCode?: SunatStatusCode;
  errorCode?: string;
  errorMessage?: string;
}

export interface SunatStatusResult {
  success: boolean;
  statusCode: SunatStatusCode;
  status: SunatStatus;
  xmlContent?: string;
  errorCode?: string;
  errorMessage?: string;
}

export type SunatStatus =
  | 'ACEPTADO'
  | 'RECHAZADO'
  | 'BAJA'
  | 'EXCEPCION'
  | 'EN_PROCESO'
  | 'UNKNOWN';

export interface CdrResponse {
  id: string;
  version?: string;
  statusCode: SunatStatusCode;
  status: SunatStatus;
  description: string;
  notes?: string[];
  cdrContent?: string; // Base64 encoded ZIP
}

export interface CdrContent {
  applicationResponse?: string; // Base64 encoded CDR ZIP
  statusCode: number;
  statusMessage: string;
}

export interface SunatDocumentResult {
  success: boolean;
  comprobanteId: string;
  estado: ComprobanteSunatEstado;
  ticket?: string;
  xmlContent?: string;
  cdrContent?: string;
  cdrStatus?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface XmlGenerationInput {
  tipoComprobante: DocumentType;
  serie: string;
  numero: number;
  fechaEmision: string; // ISO date
  fechaVencimiento?: string;
  tenant: {
    ruc: string;
    razonSocial: string;
    nombreComercial?: string;
    direccion?: string;
    ubigeo?: string;
  };
  cliente: {
    tipoDocumento: string;
    numeroDocumento: string;
    nombre: string;
    direccion?: string;
  };
  detalles: XmlDetalle[];
  totales: XmlTotales;
  formaPago?: XmlFormaPago;
  leyendas?: XmlLeyenda[];
  documentosRelacionados?: XmlDocRelacionado[];
}

export interface XmlDetalle {
  numeroLinea: number;
  codigoProducto?: string;
  descripcion: string;
  cantidad: number;
  unidad?: string;
  precioUnitario: number;
  precioTipo: XmlPrecioTipo;
  valorVenta: number;
  igv: number;
  igvAfectacion: string;
  subTotal: number;
}

export type XmlPrecioTipo = '01' | '02' | '03' | '04';

export interface XmlTotales {
  totalGravadas: number;
  totalExoneradas: number;
  totalInafectas: number;
  totalGratuitas: number;
  totalIgv: number;
  totalIsc: number;
  totalIcbp: number;
  totalOtrosCargos: number;
  totalImporte: number;
}

export interface XmlFormaPago {
  tipoPago: string;
  montoPago?: number;
  plazoCredito?: string;
}

export interface XmlLeyenda {
  codigo: string;
  descripcion: string;
}

export interface XmlDocRelacionado {
  tipoDocumento: string;
  numeroDocumento: string;
}

export interface XmlSignerInput {
  xmlContent: string;
  certificateBase64: string;
  certificatePassword: string;
  signeriId: string;
}

export interface XmlSignerOutput {
  signedXml: string;
  digestValue: string;
}

export interface SunatLogEntry {
  tenantId: string;
  comprobanteId?: string;
  tipoOperacion: string;
  ticket?: string;
  requestXml?: string;
  responseXml?: string;
  errorCode?: string;
  errorMessage?: string;
}

// ============================================================================
// Guía de Remisión (Despatch Advice) Types
// ============================================================================

export type GuideTypeCode = '09' | '31'; // 09=RGuide, 31=Transport guide

export interface XmlGuiaInput {
  tipoComprobante: '09' | '31';
  serie: string;
  numero: number;
  fechaEmision: string; // ISO date
  fechaTraslado?: string; // ISO date
  tenant: {
    ruc: string;
    razonSocial: string;
    nombreComercial?: string;
    direccion: string;
    ubigeo: string;
  };
  destinatario: {
    tipoDocumento: string;
    numeroDocumento: string;
    nombre: string;
    direccion: string;
  };
  terceros?: {
    tipoDocumento: string;
    numeroDocumento: string;
    nombre: string;
  }[];
  detalles: XmlGuiaDetalle[];
  transportista?: XmlGuiaTransportista;
  vehiculo?: XmlGuiaVehiculo[];
  ubigeoPuntoLlegada: string;
  direccionPuntoLlegada: string;
  ubigeoPuntoPartida: string;
  direccionPuntoPartida: string;
  motivoTraslado?: string;
  indicadorTraslado?: string;
  descripcionTraslado?: string;
  pesoTotal?: number;
  numeroBultos?: number;
}

export interface XmlGuiaDetalle {
  numeroLinea: number;
  cantidad: number;
  unidad?: string;
  descripcion: string;
  codigoProducto?: string;
}

export interface XmlGuiaTransportista {
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  numeroMtc?: string;
}

export interface XmlGuiaVehiculo {
  vehiculoId: string;
  placa: string;
  constanciaInscripcion?: string;
  certificadoInscripcion?: string;
}

// ============================================================================
// Comprobante de Percepción Types
// ============================================================================

export interface XmlPercepcionInput {
  tipoComprobante: '40';
  serie: string;
  numero: number;
  fechaEmision: string; // ISO date
  tenant: {
    ruc: string;
    razonSocial: string;
    nombreComercial?: string;
    direccion?: string;
    ubigeo?: string;
  };
  cliente: {
    tipoDocumento: string;
    numeroDocumento: string;
    nombre: string;
    direccion?: string;
  };
  percepciones: XmlPercepcionDetalle[];
  totales: XmlPercepcionTotales;
  formaPago?: XmlFormaPago;
  observaciones?: string;
}

export interface XmlPercepcionDetalle {
  numeroLinea: number;
  tipoComprobante: string; // 01, 03, etc.
  serieComprobante: string;
  numeroComprobante: number;
  fechaEmisionComprobante: string;
  montoComprobante: number;
  tipoDocIdentidadReceptor: string;
  numeroDocIdentidadReceptor: string;
  denominacionReceptor: string;
  importeTotalComprobante: number;
  importePercibido: number;
  importeBasePercibida: number;
  tasaPercepcion: number; // e.g., 2.00 for 2%
  fechaOperacion: string;
}

export interface XmlPercepcionTotales {
  totalImportePercibido: number;
  totalImporteBasePercibida: number;
  totalImporteTotal: number;
}
