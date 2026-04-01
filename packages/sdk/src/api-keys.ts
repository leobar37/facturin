import type { AdminClient } from './admin-client.js';

/**
 * Represents an API Key
 */
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  isActive: boolean;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a new API key
 */
export interface CreateApiKeyInput {
  name: string;
  permissions?: string[];
  expiresAt?: string;
}

/**
 * Response when creating a new API key (includes the full key)
 */
export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  permissions: string[];
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * Response when revoking an API key
 */
export interface RevokeApiKeyResponse {
  id: string;
  isActive: boolean;
  revokedAt: Date;
}

/**
 * API Keys management
 * 
 * Note: API keys can only be managed by admin users (JWT auth)
 */
export class ApiKeysAPI {
  constructor(private readonly client: AdminClient) {}

  /**
   * List all API keys
   * 
   * Returns all API keys with their metadata (but not the full key value)
   */
  async list(): Promise<ApiKey[]> {
    return this.client.get<ApiKey[]>('/api/admin/api-keys');
  }

  /**
   * Create a new API key
   * 
   * IMPORTANT: The full API key is only returned once during creation.
   * Make sure to save it securely - it cannot be retrieved later!
   * 
   * @param input - API key configuration
   * @returns The created API key including the full key value
   */
  async create(input: CreateApiKeyInput): Promise<CreateApiKeyResponse> {
    return this.client.post<CreateApiKeyResponse>('/api/admin/api-keys', input);
  }

  /**
   * Revoke (deactivate) an API key
   * 
   * Revoked keys cannot be used for authentication.
   * 
   * @param id - The API key ID to revoke
   * @returns The revoked API key info
   */
  async revoke(id: string): Promise<RevokeApiKeyResponse> {
    return this.client.delete<RevokeApiKeyResponse>(`/api/admin/api-keys/${id}`);
  }
}
