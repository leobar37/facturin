import { Elysia } from 'elysia';
import { sql } from 'drizzle-orm';
import { db } from '../db';

export const healthRoutes = new Elysia({ prefix: '/api' })
  .get('/health', async () => {
    let databaseStatus: 'connected' | 'disconnected';
    
    try {
      // Test database connection with a simple query
      await db.execute(sql`SELECT 1`);
      databaseStatus = 'connected';
    } catch {
      databaseStatus = 'disconnected';
    }
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'facturin-api',
      version: '1.0.0',
      database: databaseStatus,
    };
  });
