import { sql } from 'drizzle-orm';
import { db } from '../db';
import { tenants, apiKeys, comprobantes, series } from '../db/schema';

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

export class StatsService {
  /**
   * Get live aggregate stats from the database
   */
  async getStats(): Promise<AdminStats> {
    // Tenant stats
    const [tenantStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) FILTER (WHERE is_active = true)::int`,
        inactive: sql<number>`count(*) FILTER (WHERE is_active = false)::int`,
      })
      .from(tenants);

    // API key stats
    const [apiKeyStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) FILTER (WHERE is_active = true)::int`,
      })
      .from(apiKeys);

    // Comprobante stats
    const comprobanteStats = await db
      .select({
        estado: sql<string>`sunat_estado`,
        count: sql<number>`count(*)::int`,
      })
      .from(comprobantes)
      .groupBy(sql`sunat_estado`);

    const byEstado: Record<string, number> = {};
    for (const stat of comprobanteStats) {
      byEstado[stat.estado] = Number(stat.count);
    }

    const [comprobanteTotalResult] = await db
      .select({
        total: sql<number>`count(*)::int`,
      })
      .from(comprobantes);

    // Series stats
    const [seriesStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
      })
      .from(series);

    return {
      tenants: {
        total: Number(tenantStats?.total ?? 0),
        active: Number(tenantStats?.active ?? 0),
        inactive: Number(tenantStats?.inactive ?? 0),
      },
      apiKeys: {
        total: Number(apiKeyStats?.total ?? 0),
        active: Number(apiKeyStats?.active ?? 0),
      },
      comprobantes: {
        total: Number(comprobanteTotalResult?.total ?? 0),
        byEstado,
      },
      series: {
        total: Number(seriesStats?.total ?? 0),
      },
    };
  }
}

// Singleton instance
export const statsService = new StatsService();
