import { Elysia } from 'elysia';

export const healthRoutes = new Elysia({ prefix: '/api' })
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'facturin-api',
    version: '1.0.0',
  }));
