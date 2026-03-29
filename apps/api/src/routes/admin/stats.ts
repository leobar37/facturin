import { Elysia } from 'elysia';
import { statsService } from '../../services/stats.service';

export const adminStatsRoutes = new Elysia({ prefix: '/api/admin/stats' })
  // Get admin dashboard stats
  .get('/', async () => {
    const stats = await statsService.getStats();
    return stats;
  });
