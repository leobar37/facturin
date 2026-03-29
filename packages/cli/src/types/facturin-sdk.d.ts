declare module '@facturin/sdk' {
  export class FacturinClient {
    constructor(config: ClientConfig);
    get baseUrl(): string;
    get tenantId(): string;
    tenants: TenantsAPI;
    series: SeriesAPI;
    comprobantes: ComprobantesAPI;
    get<T>(endpoint: string, options?: RequestOptions): Promise<T>;
    post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T>;
    put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T>;
    delete<T>(endpoint: string, options?: RequestOptions): Promise<T>;
    getTenantId(): string;
    getBaseUrl(): string;
  }

  // AdminClient for admin operations
  export class AdminClient {
    constructor(config: AdminClientConfig);
    readonly tenants: TenantsAPI;
    readonly stats: StatsAPI;
    login(credentials: AdminCredentials): Promise<AuthToken>;
    logout(): void;
    isAuthenticated(): boolean;
    getToken(): string | null;
    getBaseUrl(): string;
    get<T>(endpoint: string, options?: RequestOptions): Promise<T>;
    post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T>;
    put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T>;
    delete<T>(endpoint: string, options?: RequestOptions): Promise<T>;
  }

  export interface AdminClientConfig {
    baseUrl: string;
  }

  export interface AdminCredentials {
    email: string;
    password: string;
  }

  export interface AuthToken {
    token: string;
    type: 'Bearer';
    expiresIn: string;
    user: {
      email: string;
      role: string;
    };
  }

  export interface ClientConfig {
    baseUrl: string;
    apiKey: string;
    tenantId: string;
  }

  export interface RequestOptions extends RequestInit {
    params?: Record<string, string | number | boolean | undefined>;
  }

  export class FacturinError extends Error {
    constructor(message: string, code: string, statusCode: number, details?: unknown);
    readonly code: string;
    readonly statusCode: number;
    readonly details?: unknown;
  }

  export class AuthenticationError extends FacturinError {
    constructor(message?: string, details?: unknown);
  }

  export class ForbiddenError extends FacturinError {
    constructor(message?: string, details?: unknown);
  }

  export class NotFoundError extends FacturinError {
    constructor(message?: string, details?: unknown);
  }

  export class ValidationError extends FacturinError {
    constructor(message?: string, errors?: Array<{ field: string; message: string }>);
    readonly errors?: Array<{ field: string; message: string }>;
  }

  export class TenantNotReadyError extends FacturinError {
    constructor(message?: string);
  }

  export class NetworkError extends Error {
    constructor(message?: string);
  }

  // StatsAPI types
  export class StatsAPI {
    constructor(client: AdminClient);
    get(): Promise<AdminStats>;
  }

  export interface AdminStats {
    tenants: {
      total: number;
      active: number;
      inactive: number;
    };
    apiKeys: {
      total: number;
      active: number;
    };
    comprobantes: {
      total: number;
      byEstado: Record<string, number>;
    };
    series: {
      total: number;
    };
  }

  // TenantsAPI types
  export class TenantsAPI {
    constructor(client: FacturinClient | AdminClient, isAdmin?: boolean);
    list(options?: ListTenantsOptions): Promise<ListTenantsResult>;
    create(data: CreateTenantInput): Promise<Tenant>;
    get(id: string): Promise<Tenant>;
    update(id: string, data: Partial<CreateTenantInput> & { isActive?: boolean }): Promise<Tenant>;
    deactivate(id: string): Promise<{ id: string; isActive: boolean }>;
  }

  export interface ListTenantsOptions {
    search?: string;
    limit?: number;
    offset?: number;
  }

  export interface ListTenantsResult {
    tenants: Tenant[];
    total: number;
    limit: number;
    offset: number;
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

  export interface TenantAddress {
    direccion?: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;
    ubigeo?: string;
  }

  export interface CreateTenantInput {
    ruc: string;
    razonSocial: string;
    nombreComercial?: string;
    direccion?: TenantAddress;
    contactoEmail?: string;
    contactoPhone?: string;
  }

  // SeriesAPI types
  export class SeriesAPI {
    constructor(client: FacturinClient);
    list(options?: ListSeriesOptions): Promise<ListSeriesResult>;
    create(data: CreateSerieInput): Promise<Serie>;
  }

  export interface ListSeriesOptions {
    tipoComprobante?: TipoComprobante;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }

  export interface ListSeriesResult {
    series: Serie[];
    total: number;
    limit: number;
    offset: number;
  }

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

  export type TipoComprobante = '01' | '03' | '07' | '08' | '09' | '20' | '40';

  // ComprobantesAPI types
  export class ComprobantesAPI {
    constructor(client: FacturinClient);
    list(options?: ListComprobantesOptions): Promise<ListComprobantesResult>;
    get(id: string): Promise<Comprobante>;
    create(data: CreateComprobanteInput): Promise<Comprobante>;
    cancel(id: string): Promise<Comprobante>;
  }

  export interface ListComprobantesOptions {
    limit?: number;
    offset?: number;
    tipoComprobante?: TipoComprobante;
    serie?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    estado?: ComprobanteEstado;
  }

  export interface ListComprobantesResult {
    data: Comprobante[];
    total: number;
    limit: number;
    offset: number;
  }

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
    totalGravadas: number;
    totalIgv: number;
    totalImporte: number;
    detalles: ComprobanteDetalle[];
    leyendas: ComprobanteLeyenda[];
    formaPago?: ComprobanteFormaPago;
    sunatEstado: ComprobanteEstado;
    sunatTicket?: string;
    hash?: string;
    createdAt: Date;
  }

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

  export interface CreateComprobanteInput {
    tipoComprobante: TipoComprobante;
    serie: string;
    clienteTipoDocumento: string;
    clienteNumeroDocumento: string;
    clienteNombre: string;
    clienteDireccion?: string;
    detalles: Array<{
      codigo?: string;
      descripcion: string;
      cantidad: number;
      unidad?: string;
      valorUnitario: number;
      tipoAfectacionIgv?: string;
    }>;
    formaPago?: ComprobanteFormaPago;
    leyendas?: ComprobanteLeyenda[];
  }

  // Other types
  export interface TenantReadiness {
    ready: boolean;
    missing: string[];
    checks: {
      hasCertificate: boolean;
      hasSunatCredentials: boolean;
      hasSeries: boolean;
    };
  }

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

  // Helper functions
  export function validateRuc(ruc: string): { isValid: boolean; error?: string };
}
