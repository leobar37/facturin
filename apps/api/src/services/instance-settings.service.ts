import { eq } from 'drizzle-orm';
import { db } from '../db';
import { instanceConfig } from '../db/schema';

export interface InstanceSettings {
  id: string;
  mode: string;
  isOseHomologated: boolean;
  oseResolutionNumber: string | null;
  oseHomologationDate: Date | null;
  instanceName: string;
  instanceUrl: string | null;
  sunatBetaWsdlUrl: string | null;
  sunatProdWsdlUrl: string | null;
  sunatBetaRestUrl: string | null;
  sunatProdRestUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateInstanceSettingsInput {
  mode?: string;
  isOseHomologated?: boolean;
  oseResolutionNumber?: string;
  oseHomologationDate?: Date;
  instanceName?: string;
  instanceUrl?: string;
  sunatBetaWsdlUrl?: string;
  sunatProdWsdlUrl?: string;
  sunatBetaRestUrl?: string;
  sunatProdRestUrl?: string;
}

function mapToInstanceSettings(row: typeof instanceConfig.$inferSelect): InstanceSettings {
  return {
    id: row.id,
    mode: row.mode,
    isOseHomologated: row.isOseHomologated,
    oseResolutionNumber: row.oseResolutionNumber,
    oseHomologationDate: row.oseHomologationDate,
    instanceName: row.instanceName,
    instanceUrl: row.instanceUrl,
    sunatBetaWsdlUrl: row.sunatBetaWsdlUrl,
    sunatProdWsdlUrl: row.sunatProdWsdlUrl,
    sunatBetaRestUrl: row.sunatBetaRestUrl,
    sunatProdRestUrl: row.sunatProdRestUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class InstanceSettingsService {
  /**
   * Get the instance settings.
   * Returns the first record or creates a default one if none exists.
   */
  async getSettings(): Promise<InstanceSettings | null> {
    const results = await db
      .select()
      .from(instanceConfig)
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return mapToInstanceSettings(results[0]);
  }

  /**
   * Get settings or create default if none exists
   */
  async getOrCreateSettings(): Promise<InstanceSettings> {
    let settings = await this.getSettings();

    if (!settings) {
      // Create default settings
      const [result] = await db
        .insert(instanceConfig)
        .values({
          mode: 'single',
          isOseHomologated: false,
          instanceName: 'Facturin',
        })
        .returning();

      settings = mapToInstanceSettings(result);
    }

    return settings;
  }

  /**
   * Update instance settings
   */
  async updateSettings(input: UpdateInstanceSettingsInput): Promise<InstanceSettings | null> {
    // Ensure settings exist
    const existing = await this.getOrCreateSettings();

    const [result] = await db
      .update(instanceConfig)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(instanceConfig.id, existing.id))
      .returning();

    if (!result) {
      return null;
    }

    return mapToInstanceSettings(result);
  }
}

// Singleton instance
export const instanceSettingsService = new InstanceSettingsService();
