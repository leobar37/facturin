import type { AdminClient } from './admin-client.js';
import type { AdminStats } from './admin-client.js';

/**
 * Stats API for admin dashboard
 */
export class StatsAPI {
  constructor(private readonly client: AdminClient) {}

  /**
   * Get dashboard statistics
   * Returns live aggregate counts for tenants, comprobantes, and API keys
   */
  async getStats(): Promise<AdminStats> {
    return this.client.get<AdminStats>('/api/admin/stats');
  }
}

export type { AdminStats };
