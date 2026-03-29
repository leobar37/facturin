import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { apiKeys } from '../db/schema';

export interface ApiKeyEntity {
  id: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

function mapToApiKeyEntity(row: typeof apiKeys.$inferSelect): ApiKeyEntity {
  return {
    id: row.id,
    name: row.name,
    keyHash: row.keyHash,
    keyPrefix: row.keyPrefix,
    permissions: (row.permissions as string[]) || [],
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

export class ApiKeysRepository {
  async findById(id: string): Promise<ApiKeyEntity | null> {
    const [result] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);
    return result ? mapToApiKeyEntity(result) : null;
  }

  async findByHash(keyHash: string): Promise<ApiKeyEntity | null> {
    const [result] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)))
      .limit(1);
    return result ? mapToApiKeyEntity(result) : null;
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
  }): Promise<ApiKeyEntity[]> {
    // Admin listing: return ALL keys (active and revoked) for full visibility
    const results = await (async () => {
      if (options?.limit && options?.offset) {
        return db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt)).limit(options.limit).offset(options.offset);
      } else if (options?.limit) {
        return db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt)).limit(options.limit);
      } else if (options?.offset) {
        return db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt)).offset(options.offset);
      }
      return db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
    })();
    return results.map(mapToApiKeyEntity);
  }

  async create(data: {
    name: string;
    keyHash: string;
    keyPrefix: string;
    permissions: string[];
    expiresAt: Date | null;
    isActive: boolean;
  }): Promise<ApiKeyEntity> {
    const [result] = await db.insert(apiKeys).values(data).returning();
    return mapToApiKeyEntity(result);
  }

  async update(id: string, data: Partial<ApiKeyEntity>): Promise<ApiKeyEntity | null> {
    const [result] = await db
      .update(apiKeys)
      .set(data)
      .where(eq(apiKeys.id, id))
      .returning();
    return result ? mapToApiKeyEntity(result) : null;
  }

  async updateLastUsed(id: string): Promise<void> {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id));
  }

  async deactivate(id: string): Promise<ApiKeyEntity | null> {
    const [result] = await db
      .update(apiKeys)
      .set({ isActive: false })
      .where(eq(apiKeys.id, id))
      .returning();
    return result ? mapToApiKeyEntity(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    const [result] = await db
      .delete(apiKeys)
      .where(eq(apiKeys.id, id))
      .returning({ id: apiKeys.id });
    return !!result;
  }
}

// Singleton instance
export const apiKeysRepository = new ApiKeysRepository();
