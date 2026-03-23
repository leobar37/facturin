import { eq, like, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { tenants } from '../db/schema';

export interface TenantEntity {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  direccion: {
    direccion?: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;
    ubigeo?: string;
  } | null;
  certificadoDigital: string | null;
  certificadoPassword: string | null;
  sunatUsername: string | null;
  sunatPassword: string | null;
  contactoEmail: string | null;
  contactoPhone: string | null;
  isActive: boolean;
  maxDocumentsPerMonth: number | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapToTenantEntity(row: typeof tenants.$inferSelect): TenantEntity {
  return {
    id: row.id,
    ruc: row.ruc,
    razonSocial: row.razonSocial,
    nombreComercial: row.nombreComercial,
    direccion: row.direccion as TenantEntity['direccion'],
    certificadoDigital: row.certificadoDigital,
    certificadoPassword: row.certificadoPassword,
    sunatUsername: row.sunatUsername,
    sunatPassword: row.sunatPassword,
    contactoEmail: row.contactoEmail,
    contactoPhone: row.contactoPhone,
    isActive: row.isActive,
    maxDocumentsPerMonth: row.maxDocumentsPerMonth,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class TenantsRepository {
  async findById(id: string): Promise<TenantEntity | null> {
    const [result] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);
    return result ? mapToTenantEntity(result) : null;
  }

  async findByRuc(ruc: string): Promise<TenantEntity | null> {
    const [result] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.ruc, ruc))
      .limit(1);
    return result ? mapToTenantEntity(result) : null;
  }

  async findActiveById(id: string): Promise<TenantEntity | null> {
    const [result] = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, id), eq(tenants.isActive, true)))
      .limit(1);
    return result ? mapToTenantEntity(result) : null;
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ data: TenantEntity[]; total: number }> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const data = await db
      .select()
      .from(tenants)
      .orderBy(desc(tenants.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: tenants.id })
      .from(tenants);

    return { data: data.map(mapToTenantEntity), total: Number(count) };
  }

  async search(query: string, limit = 50, offset = 0): Promise<{ data: TenantEntity[]; total: number }> {
    const data = await db
      .select()
      .from(tenants)
      .where(like(tenants.razonSocial, `%${query}%`))
      .orderBy(desc(tenants.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: tenants.id })
      .from(tenants)
      .where(like(tenants.razonSocial, `%${query}%`));

    return { data: data.map(mapToTenantEntity), total: Number(count) };
  }

  async create(data: {
    ruc: string;
    razonSocial: string;
    nombreComercial?: string;
    direccion?: TenantEntity['direccion'];
    contactoEmail?: string;
    contactoPhone?: string;
    maxDocumentsPerMonth?: number;
    isActive: boolean;
  }): Promise<TenantEntity> {
    const [result] = await db.insert(tenants).values(data).returning();
    return mapToTenantEntity(result);
  }

  async update(id: string, data: Partial<TenantEntity>): Promise<TenantEntity | null> {
    const [result] = await db
      .update(tenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return result ? mapToTenantEntity(result) : null;
  }

  async deactivate(id: string): Promise<TenantEntity | null> {
    const [result] = await db
      .update(tenants)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return result ? mapToTenantEntity(result) : null;
  }

  async delete(id: string): Promise<boolean> {
    const [result] = await db
      .delete(tenants)
      .where(eq(tenants.id, id))
      .returning({ id: tenants.id });
    return !!result;
  }
}

// Singleton instance
export const tenantsRepository = new TenantsRepository();
