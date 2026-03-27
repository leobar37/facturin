import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import { comprobantes } from '../db/schema';
import type { ComprobanteSunatEstado } from '../sunat/types';

export interface ComprobanteEntity {
  id: string;
  tenantId: string;
  tipoComprobante: string;
  serie: string;
  numero: number;
  fechaEmision: Date;
  clienteTipoDocumento: string;
  clienteNumeroDocumento: string;
  clienteNombre: string;
  clienteDireccion: Record<string, unknown> | null;
  totalGravadas: string;
  totalIgv: string;
  totalImporte: string;
  detalles: Record<string, unknown>[];
  leyendas: Record<string, unknown>[];
  formaPago: Record<string, unknown> | null;
  xmlContent: string | null;
  cdrContent: string | null;
  cdrStatus: string | null;
  sunatTicket: string | null;
  sunatEstado: string;
  sunatFechaEnvio: Date | null;
  sunatFechaRespuesta: Date | null;
  hash: string | null;
  createdAt: Date;
}

export type ComprobanteEstado = 'pendiente' | 'enviado' | 'aceptado' | 'rechazado' | 'anulado';

function mapToComprobanteEntity(row: typeof comprobantes.$inferSelect): ComprobanteEntity {
  return {
    id: row.id,
    tenantId: row.tenantId,
    tipoComprobante: row.tipoComprobante,
    serie: row.serie,
    numero: row.numero,
    fechaEmision: row.fechaEmision,
    clienteTipoDocumento: row.clienteTipoDocumento,
    clienteNumeroDocumento: row.clienteNumeroDocumento,
    clienteNombre: row.clienteNombre,
    clienteDireccion: row.clienteDireccion as Record<string, unknown> | null,
    totalGravadas: row.totalGravadas,
    totalIgv: row.totalIgv,
    totalImporte: row.totalImporte,
    detalles: (row.detalles || []) as Record<string, unknown>[],
    leyendas: (row.leyendas || []) as Record<string, unknown>[],
    formaPago: row.formaPago as Record<string, unknown> | null,
    xmlContent: row.xmlContent,
    cdrContent: row.cdrContent,
    cdrStatus: row.cdrStatus,
    sunatTicket: row.sunatTicket,
    sunatEstado: row.sunatEstado,
    sunatFechaEnvio: row.sunatFechaEnvio,
    sunatFechaRespuesta: row.sunatFechaRespuesta,
    hash: row.hash,
    createdAt: row.createdAt,
  };
}

export interface CreateComprobanteInput {
  tenantId: string;
  tipoComprobante: string;
  serie: string;
  numero: number;
  clienteTipoDocumento: string;
  clienteNumeroDocumento: string;
  clienteNombre: string;
  clienteDireccion?: Record<string, unknown>;
  totalGravadas: string;
  totalIgv: string;
  totalImporte: string;
  detalles: Record<string, unknown>[];
  leyendas?: Record<string, unknown>[];
  formaPago?: Record<string, unknown>;
}

export interface ComprobanteFilters {
  tipoComprobante?: string;
  serie?: string;
  estado?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

export class ComprobantesRepository {
  async findById(id: string): Promise<ComprobanteEntity | null> {
    const [result] = await db
      .select()
      .from(comprobantes)
      .where(eq(comprobantes.id, id))
      .limit(1);
    return result ? mapToComprobanteEntity(result) : null;
  }

  async findByTenantAndId(tenantId: string, id: string): Promise<ComprobanteEntity | null> {
    const [result] = await db
      .select()
      .from(comprobantes)
      .where(and(eq(comprobantes.id, id), eq(comprobantes.tenantId, tenantId)))
      .limit(1);
    return result ? mapToComprobanteEntity(result) : null;
  }

  async findByTenant(
    tenantId: string,
    filters?: ComprobanteFilters,
    options?: { limit?: number; offset?: number }
  ): Promise<{ data: ComprobanteEntity[]; total: number }> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const conditions = [eq(comprobantes.tenantId, tenantId)];

    if (filters?.tipoComprobante) {
      conditions.push(eq(comprobantes.tipoComprobante, filters.tipoComprobante));
    }

    if (filters?.serie) {
      conditions.push(eq(comprobantes.serie, filters.serie));
    }

    if (filters?.estado) {
      conditions.push(eq(comprobantes.sunatEstado, filters.estado));
    }

    if (filters?.fechaDesde) {
      conditions.push(gte(comprobantes.fechaEmision, filters.fechaDesde));
    }

    if (filters?.fechaHasta) {
      conditions.push(lte(comprobantes.fechaEmision, filters.fechaHasta));
    }

    const whereClause = and(...conditions);

    const data = await db
      .select()
      .from(comprobantes)
      .where(whereClause)
      .orderBy(desc(comprobantes.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(comprobantes)
      .where(whereClause);

    return {
      data: data.map(mapToComprobanteEntity),
      total: Number(count),
    };
  }

  async create(data: CreateComprobanteInput): Promise<ComprobanteEntity> {
    const [result] = await db
      .insert(comprobantes)
      .values({
        tenantId: data.tenantId,
        tipoComprobante: data.tipoComprobante,
        serie: data.serie,
        numero: data.numero,
        clienteTipoDocumento: data.clienteTipoDocumento,
        clienteNumeroDocumento: data.clienteNumeroDocumento,
        clienteNombre: data.clienteNombre,
        clienteDireccion: data.clienteDireccion || null,
        totalGravadas: data.totalGravadas,
        totalIgv: data.totalIgv,
        totalImporte: data.totalImporte,
        detalles: data.detalles || [],
        leyendas: data.leyendas || [],
        formaPago: data.formaPago || null,
        sunatEstado: 'pendiente',
      })
      .returning();

    return mapToComprobanteEntity(result);
  }

  async updateEstado(id: string, estado: ComprobanteEstado): Promise<ComprobanteEntity | null> {
    const [result] = await db
      .update(comprobantes)
      .set({ sunatEstado: estado })
      .where(eq(comprobantes.id, id))
      .returning();
    return result ? mapToComprobanteEntity(result) : null;
  }

  async getLastNumeroBySerie(tenantId: string, tipoComprobante: string, serie: string): Promise<number> {
    const [result] = await db
      .select({ maxNumero: sql<number>`COALESCE(MAX(${comprobantes.numero}), 0)` })
      .from(comprobantes)
      .where(
        and(
          eq(comprobantes.tenantId, tenantId),
          eq(comprobantes.tipoComprobante, tipoComprobante),
          eq(comprobantes.serie, serie)
        )
      );
    return Number(result?.maxNumero) || 0;
  }

  async updateXmlContent(id: string, xmlContent: string): Promise<void> {
    await db
      .update(comprobantes)
      .set({ xmlContent })
      .where(eq(comprobantes.id, id));
  }

  async updateSunatTicket(id: string, ticket: string): Promise<void> {
    await db
      .update(comprobantes)
      .set({
        sunatTicket: ticket,
        sunatEstado: 'enviado' as ComprobanteSunatEstado,
      })
      .where(eq(comprobantes.id, id));
  }

  async updateCdr(
    id: string,
    estado: ComprobanteSunatEstado,
    cdrContent: string,
    cdrStatus: string
  ): Promise<void> {
    await db
      .update(comprobantes)
      .set({
        cdrContent,
        cdrStatus,
        sunatEstado: estado,
        sunatFechaRespuesta: new Date(),
      })
      .where(eq(comprobantes.id, id));
  }

  async updateHash(id: string, hash: string): Promise<void> {
    await db
      .update(comprobantes)
      .set({ hash })
      .where(eq(comprobantes.id, id));
  }

  async updateSunatEstado(id: string, estado: ComprobanteSunatEstado): Promise<void> {
    await db
      .update(comprobantes)
      .set({ sunatEstado: estado })
      .where(eq(comprobantes.id, id));
  }

  async findBySunatTicket(ticket: string): Promise<ComprobanteEntity | null> {
    const [result] = await db
      .select()
      .from(comprobantes)
      .where(eq(comprobantes.sunatTicket, ticket))
      .limit(1);
    return result ? mapToComprobanteEntity(result) : null;
  }

  async findPendientesByTenant(tenantId: string): Promise<ComprobanteEntity[]> {
    const results = await db
      .select()
      .from(comprobantes)
      .where(
        and(
          eq(comprobantes.tenantId, tenantId),
          eq(comprobantes.sunatEstado, 'pendiente')
        )
      );
    return results.map(mapToComprobanteEntity);
  }
}

// Singleton instance
export const comprobantesRepository = new ComprobantesRepository();
