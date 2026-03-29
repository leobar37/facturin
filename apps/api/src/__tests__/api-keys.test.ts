/**
 * Unit tests for API Keys Service
 */

import { describe, it, expect } from 'bun:test';
import { ApiKeysService } from '../services/api-keys.service';
import type { ApiKeyEntity } from '../repositories/api-keys.repository';

describe('ApiKeysService', () => {
  const service = new ApiKeysService();

  describe('generateApiKey', () => {
    it('should generate a key with sk_live_ prefix', () => {
      // Access private method via prototype
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { key } = (service as any).generateApiKey();
      expect(key.startsWith('sk_live_')).toBe(true);
    });

    it('should generate a key with 32 hex characters after prefix', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { key } = (service as any).generateApiKey();
      const suffix = key.replace('sk_live_', '');
      expect(suffix.length).toBe(64); // 32 bytes = 64 hex chars
      expect(/^[a-f0-9]+$/.test(suffix)).toBe(true);
    });

    it('should generate unique keys each time', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { key: key1 } = (service as any).generateApiKey();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { key: key2 } = (service as any).generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('hashApiKey', () => {
    it('should produce a SHA256 hash (64 hex characters)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hash = (service as any).hashApiKey('sk_live_' + 'x'.repeat(64));
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('should produce consistent hash for same input', () => {
      const input = 'sk_live_' + 'x'.repeat(64);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hash1 = (service as any).hashApiKey(input);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hash2 = (service as any).hashApiKey(input);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different inputs', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hash1 = (service as any).hashApiKey('sk_live_' + 'x'.repeat(64));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hash2 = (service as any).hashApiKey('sk_live_' + 'y'.repeat(64));
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('isValidFormat', () => {
    it('should accept sk_live_ format with 64 char suffix', () => {
      expect(service.isValidFormat('sk_live_' + 'a'.repeat(64))).toBe(true);
    });

    it('should accept sk_test_ format with 64 char suffix', () => {
      expect(service.isValidFormat('sk_test_' + 'a'.repeat(64))).toBe(true);
    });

    it('should reject keys without sk_ prefix', () => {
      expect(service.isValidFormat('pk_live_' + 'a'.repeat(64))).toBe(false);
    });

    it('should reject keys with invalid prefix', () => {
      expect(service.isValidFormat('sk_lives_' + 'a'.repeat(64))).toBe(false);
      expect(service.isValidFormat('sk_demo_' + 'a'.repeat(64))).toBe(false);
    });

    it('should reject keys shorter than required', () => {
      expect(service.isValidFormat('sk_live_' + 'a'.repeat(10))).toBe(false);
    });

    it('should reject empty string', () => {
      expect(service.isValidFormat('')).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('should return false for key without expiration', () => {
      const key = { expiresAt: null } as ApiKeyEntity;
      expect(service.isExpired(key)).toBe(false);
    });

    it('should return false for key with future expiration', () => {
      const futureDate = new Date(Date.now() + 86400000); // 1 day from now
      const key = { expiresAt: futureDate } as ApiKeyEntity;
      expect(service.isExpired(key)).toBe(false);
    });

    it('should return true for key with past expiration', () => {
      const pastDate = new Date(Date.now() - 86400000); // 1 day ago
      const key = { expiresAt: pastDate } as ApiKeyEntity;
      expect(service.isExpired(key)).toBe(true);
    });
  });

  describe('create response shape', () => {
    it('should return object with required fields when creating', async () => {
      // Mock the repository
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockRepo: any = {
        create: async (data: {
          name: string;
          keyHash: string;
          keyPrefix: string;
          permissions: string[];
          expiresAt: Date | null;
          isActive: boolean;
        }) => ({
          id: 'test-uuid',
          name: data.name,
          keyHash: data.keyHash,
          keyPrefix: data.keyPrefix,
          permissions: data.permissions,
          expiresAt: data.expiresAt,
          isActive: true,
          lastUsedAt: null,
          createdAt: new Date(),
        }),
      };

      const serviceWithMock = Object.create(service);
      serviceWithMock.repository = mockRepo;

      const result = await serviceWithMock.create({
        name: 'Test Key',
        permissions: ['read', 'write'],
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', 'Test Key');
      expect(result).toHaveProperty('key'); // Raw key - returned only once!
      expect(result).toHaveProperty('keyPrefix', 'sk_live_');
      expect(result).toHaveProperty('permissions');
      expect(result).toHaveProperty('isActive', true);
      expect(result).toHaveProperty('createdAt');
      expect(result.key.startsWith('sk_live_')).toBe(true);
    });
  });
});

describe('ApiKeyEntity interface', () => {
  it('should have all required fields', () => {
    const entity: ApiKeyEntity = {
      id: 'uuid',
      name: 'Test Key',
      keyHash: 'hash',
      keyPrefix: 'sk_live_',
      permissions: ['*'],
      lastUsedAt: null,
      expiresAt: null,
      isActive: true,
      createdAt: new Date(),
    };

    expect(entity.id).toBeDefined();
    expect(entity.name).toBeDefined();
    expect(entity.keyHash).toBeDefined();
    expect(entity.keyPrefix).toBeDefined();
    expect(entity.permissions).toBeDefined();
    expect(entity.isActive).toBeDefined();
    expect(entity.createdAt).toBeDefined();
  });
});
