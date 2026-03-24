import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  TenantNotReadyError,
  NetworkError,
  FacturinError,
} from './errors.js';
import type {
  ApiErrorResponse,
  ApiValidationErrorResponse,
  ApiSuccessResponse,
} from './types.js';
import { TenantsAPI } from './tenants.js';
import { SeriesAPI } from './series.js';
import { ComprobantesAPI } from './comprobantes.js';

export interface ClientConfig {
  baseUrl: string;
  apiKey: string;
  tenantId: string;
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class FacturinClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly tenantId: string;
  public readonly tenants: TenantsAPI;
  public readonly series: SeriesAPI;
  public readonly comprobantes: ComprobantesAPI;

  constructor(config: ClientConfig) {
    if (!config.baseUrl) {
      throw new Error('baseUrl is required');
    }
    if (!config.apiKey) {
      throw new Error('apiKey is required');
    }
    if (!config.tenantId) {
      throw new Error('tenantId is required');
    }

    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.tenantId = config.tenantId;
    this.tenants = new TenantsAPI(this);
    this.series = new SeriesAPI(this);
    this.comprobantes = new ComprobantesAPI(this);
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Tenant-ID': this.tenantId,
      'Content-Type': 'application/json',
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      let errorBody: ApiErrorResponse | ApiValidationErrorResponse | { error: string } | null = null;

      if (isJson) {
        try {
          errorBody = await response.json() as ApiErrorResponse | ApiValidationErrorResponse | { error: string };
        } catch {
          // ignore parse error
        }
      }

      switch (response.status) {
        case 401:
          throw new AuthenticationError(
            (errorBody as ApiErrorResponse)?.error || 'Authentication failed',
            (errorBody as ApiErrorResponse)?.details
          );

        case 403:
          // Check for TENANT_NOT_READY error
          if ((errorBody as ApiErrorResponse)?.code === 'TENANT_NOT_READY') {
            throw new TenantNotReadyError((errorBody as ApiErrorResponse)?.error);
          }
          throw new ForbiddenError(
            (errorBody as ApiErrorResponse)?.error || 'Access forbidden',
            (errorBody as ApiErrorResponse)?.details
          );

        case 404:
          throw new NotFoundError(
            (errorBody as ApiErrorResponse)?.error || 'Resource not found',
            (errorBody as ApiErrorResponse)?.details
          );

        case 422:
          throw new ValidationError(
            (errorBody as ApiValidationErrorResponse)?.error || 'Validation failed',
            (errorBody as ApiValidationErrorResponse)?.details
          );

        default:
          throw new FacturinError(
            (errorBody as ApiErrorResponse)?.error || `HTTP error ${response.status}`,
            (errorBody as ApiErrorResponse)?.code || 'HTTP_ERROR',
            response.status,
            (errorBody as ApiErrorResponse)?.details
          );
      }
    }

    if (response.status === 204) {
      return undefined as T;
    }

    if (isJson) {
      const json = await response.json() as ApiSuccessResponse<T> | T;
      if (json && typeof json === 'object' && 'data' in json) {
        return (json as ApiSuccessResponse<T>).data;
      }
      return json as T;
    }

    return undefined as T;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          ...this.getHeaders(),
          ...fetchOptions.headers,
        },
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      if (error instanceof FacturinError) {
        throw error;
      }

      // Network errors (no response, CORS issues, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NetworkError(`Network error: ${error.message}`);
      }

      throw error;
    }
  }

  // HTTP methods
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Getter for tenant ID (useful for debugging)
  getTenantId(): string {
    return this.tenantId;
  }

  // Getter for base URL (useful for debugging)
  getBaseUrl(): string {
    return this.baseUrl;
  }
}
