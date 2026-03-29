import type {
  ApiErrorResponse,
  ApiValidationErrorResponse,
} from './types.js';
import { TenantsAPI } from './tenants.js';
import { StatsAPI } from './stats.js';
import {
  FacturinError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  NetworkError,
} from './errors.js';

// Type definitions for Admin operations

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

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
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

export interface ListTenantsResponse {
  tenants: Tenant[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export class AdminClient {
  private readonly baseUrl: string;
  private _token: string | null = null;
  public readonly tenants: TenantsAPI;
  public readonly stats: StatsAPI;

  constructor(config: AdminClientConfig) {
    if (!config.baseUrl) {
      throw new Error('baseUrl is required');
    }

    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.tenants = new TenantsAPI(this, true); // true = admin mode
    this.stats = new StatsAPI(this);
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this._token) {
      headers['Authorization'] = `Bearer ${this._token}`;
    }

    return headers;
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
      const json = await response.json();
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

  // Admin authentication

  /**
   * Login with admin credentials
   * Returns auth token for subsequent admin API calls
   */
  async login(credentials: AdminCredentials): Promise<AuthToken> {
    if (!credentials.email) {
      throw new ValidationError('Email is required', [
        { field: 'email', message: 'Email is required' },
      ]);
    }

    if (!credentials.password) {
      throw new ValidationError('Password is required', [
        { field: 'password', message: 'Password is required' },
      ]);
    }

    const response = await this.post<AuthToken>('/api/auth/login', credentials);
    this._token = response.token;
    return response;
  }

  /**
   * Logout and clear the token
   */
  logout(): void {
    this._token = null;
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return this._token !== null;
  }

  /**
   * Get current token (for debugging/display)
   */
  getToken(): string | null {
    return this._token;
  }

  /**
   * Get base URL (for debugging)
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}
