import crypto from 'crypto';
import { apiKeysRepository, type ApiKeyEntity } from '../repositories/api-keys.repository';

export interface CreateApiKeyInput {
  name: string;
  permissions?: string[];
  expiresAt?: string;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  permissions: string[];
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export class ApiKeysService {
  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
    const prefix = 'sk_live_';
    const randomPart = crypto.randomBytes(32).toString('hex');
    const key = prefix + randomPart;
    const keyHash = this.hashApiKey(key);
    return { key, keyHash, keyPrefix: prefix };
  }

  async findAll(): Promise<Omit<ApiKeyEntity, 'keyHash'>[]> {
    const keys = await apiKeysRepository.findAll();
    return keys.map(({ keyHash: _unused, ...rest }) => rest);
  }

  async findById(id: string): Promise<ApiKeyEntity | null> {
    return apiKeysRepository.findById(id);
  }

  async findByKey(key: string): Promise<ApiKeyEntity | null> {
    const keyHash = this.hashApiKey(key);
    return apiKeysRepository.findByHash(keyHash);
  }

  async create(input: CreateApiKeyInput): Promise<ApiKeyResponse> {
    const { key, keyHash, keyPrefix } = this.generateApiKey();

    const newKey = await apiKeysRepository.create({
      name: input.name,
      keyHash,
      keyPrefix,
      permissions: input.permissions || ['*'],
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isActive: true,
    });

    return {
      id: newKey.id,
      name: newKey.name,
      key,
      keyPrefix: newKey.keyPrefix,
      permissions: newKey.permissions,
      expiresAt: newKey.expiresAt,
      isActive: newKey.isActive,
      createdAt: newKey.createdAt,
    };
  }

  async revoke(id: string): Promise<{ id: string; isActive: boolean } | null> {
    const deactivated = await apiKeysRepository.deactivate(id);
    if (!deactivated) return null;
    return { id: deactivated.id, isActive: false };
  }

  async updateLastUsed(id: string): Promise<void> {
    await apiKeysRepository.updateLastUsed(id);
  }

  isValidFormat(key: string): boolean {
    return /^sk_(live|test)_[a-zA-Z0-9]{32,}$/.test(key);
  }

  isExpired(key: ApiKeyEntity): boolean {
    if (!key.expiresAt) return false;
    return new Date(key.expiresAt) < new Date();
  }
}

// Singleton instance
export const apiKeysService = new ApiKeysService();
