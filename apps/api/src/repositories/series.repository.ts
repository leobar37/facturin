import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { series } from '../db/schema';

export interface SerieEntity {
  id: string;
  tenantId: string;
  tipoComprobante: string;
  serie: string;
  correlativoActual: number;
  isActive: boolean;
  createdAt: Date;
}

function mapToSerieEntity(row: typeof series.$inferSelect): SerieEntity {
  return {
    id: row.id,
    tenantId: row.tenantId,
    tipoComprobante: row.tipoComprobante,
    serie: row.serie,
    correlativoActual: row.correlativoActual,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

export class SeriesRepository {
  async findById(id: string): Promise<SerieEntity | null> {
    const [result] = await db
      .select()
      .from(series)
      .where(eq(series.id, id))
      .limit(1);
    return result ? mapToSerieEntity(result) : null;
  }

  async findByTenantAndTipoAndSerie(
    tenantId: string,
    tipoComprobante: string,
    serie: string
  ): Promise<SerieEntity | null> {
    const [result] = await db
      .select()
      .from(series)
      .where(
        and(
          eq(series.tenantId, tenantId),
          eq(series.tipoComprobante, tipoComprobante),
          eq(series.serie, serie)
        )
      )
      .limit(1);
    return result ? mapToSerieEntity(result) : null;
  }

  async findActiveByTenant(tenantId: string): Promise<SerieEntity[]> {
    const results = await db
      .select()
      .from(series)
      .where(and(eq(series.tenantId, tenantId), eq(series.isActive, true)))
      .orderBy(desc(series.createdAt));
    return results.map(mapToSerieEntity);
  }

  async findByTenantAndId(tenantId: string, id: string): Promise<SerieEntity | null> {
    const [result] = await db
      .select()
      .from(series)
      .where(and(eq(series.id, id), eq(series.tenantId, tenantId)))
      .limit(1);
    return result ? mapToSerieEntity(result) : null;
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
  }): Promise<SerieEntity[]> {
    const results = await (async () => {
      if (options?.limit && options?.offset) {
        return db.select().from(series).orderBy(desc(series.createdAt)).limit(options.limit).offset(options.offset);
      } else if (options?.limit) {
        return db.select().from(series).orderBy(desc(series.createdAt)).limit(options.limit);
      } else if (options?.offset) {
        return db.select().from(series).orderBy(desc(series.createdAt)).offset(options.offset);
      }
      return db.select().from(series).orderBy(desc(series.createdAt));
    })();
    return results.map(mapToSerieEntity);
  }

  async create(data: {
    tenantId: string;
    tipoComprobante: string;
    serie: string;
    correlativoActual: number;
    isActive: boolean;
  }): Promise<SerieEntity> {
    const [result] = await db.insert(series).values(data).returning();
    return mapToSerieEntity(result);
  }

  async update(id: string, data: Partial<SerieEntity>): Promise<SerieEntity | null> {
    const [result] = await db
      .update(series)
      .set(data)
      .where(eq(series.id, id))
      .returning();
    return result ? mapToSerieEntity(result) : null;
  }

  async incrementCorrelativo(id: string): Promise<SerieEntity | null> {
    const [current] = await db
      .select()
      .from(series)
      .where(eq(series.id, id))
      .limit(1);

    if (!current) return null;

    const [result] = await db
      .update(series)
      .set({ correlativoActual: current.correlativoActual + 1 })
      .where(eq(series.id, id))
      .returning();
    return result ? mapToSerieEntity(result) : null;
  }

  async deactivate(id: string): Promise<SerieEntity | null> {
    const [result] = await db
      .update(series)
      .set({ isActive: false })
      .where(eq(series.id, id))
      .returning();
    return result ? mapToSerieEntity(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    const [result] = await db
      .delete(series)
      .where(eq(series.id, id))
      .returning({ id: series.id });
    return !!result;
  }
}

// Singleton instance
export const seriesRepository = new SeriesRepository();
