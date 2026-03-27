// Type definitions for the SDK

// ============================================================================
// Tenant Types
// ============================================================================

export interface TenantAddress {
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
}

export interface Tenant {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion?: TenantAddress;
  contactoEmail?: string;
  contactoPhone?: string;
  isActive: boolean;
  maxDocumentsPerMonth?: number;
  hasCertificate: boolean;
  hasSunatCredentials: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantInput {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion?: TenantAddress;
  contactoEmail?: string;
  contactoPhone?: string;
}

// ============================================================================
// Series Types
// ============================================================================

export type TipoComprobante =
  | '01' // Factura
  | '03' // Boleta
  | '07' // Nota de crédito
  | '08' // Nota de débito
  | '09' // Guía de remisión
  | '20' // Nota de crédito (otro)
  | '40' // Comprobante de percepción

export interface Serie {
  id: string;
  tenantId: string;
  tipoComprobante: TipoComprobante;
  serie: string;
  correlativoActual: number;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateSerieInput {
  tipoComprobante: TipoComprobante;
  serie: string;
}

// ============================================================================
// Comprobante Types
// ============================================================================

export interface ComprobanteDetalle {
  codigo?: string;
  descripcion: string;
  cantidad: number;
  unidad?: string;
  valorUnitario: number;
  subtotal: number;
  igv?: number;
  tipoAfectacionIgv?: string;
}

export interface ComprobanteLeyenda {
  codigo: string;
  descripcion: string;
}

export interface ComprobanteFormaPago {
  formaPago: string;
  montoPago?: number;
}

export type ComprobanteEstado = 'pendiente' | 'enviado' | 'aceptado' | 'rechazado' | 'anulado';

export interface Comprobante {
  id: string;
  tenantId: string;
  tipoComprobante: TipoComprobante;
  serie: string;
  numero: number;
  fechaEmision: Date;
  clienteTipoDocumento: string;
  clienteNumeroDocumento: string;
  clienteNombre: string;
  clienteDireccion?: string;
  totalGravadas: string;
  totalIgv: string;
  totalImporte: string;
  detalles: ComprobanteDetalle[];
  leyendas: ComprobanteLeyenda[];
  formaPago?: ComprobanteFormaPago;
  sunatEstado: ComprobanteEstado;
  sunatTicket?: string;
  hash?: string;
  createdAt: Date;
}

export interface CreateComprobanteInput {
  tipoComprobante: TipoComprobante;
  serie: string;
  clienteTipoDocumento: string;
  clienteNumeroDocumento: string;
  clienteNombre: string;
  clienteDireccion?: string;
  detalles: Omit<ComprobanteDetalle, 'subtotal' | 'igv'>[];
  formaPago?: ComprobanteFormaPago;
  leyendas?: ComprobanteLeyenda[];
}

// ============================================================================
// Tenant Readiness Types
// ============================================================================

export interface TenantReadiness {
  ready: boolean;
  missing: string[];
  checks: {
    hasCertificate: boolean;
    hasSunatCredentials: boolean;
    hasSeries: boolean;
  };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

export interface ApiValidationErrorResponse {
  error: string;
  code: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

export interface ApiSuccessResponse<T> {
  data: T;
  success: true;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
