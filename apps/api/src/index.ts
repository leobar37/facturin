import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

const envPath = join(import.meta.dir, '..', '.env.local');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) {
        process.env[key.trim()] = value;
      }
    }
  });
}

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { jwt } from '@elysiajs/jwt';

import { authRoutes } from './routes/auth';
import { adminApiKeysRoutes } from './routes/admin/api-keys';
import { adminTenantsRoutes } from './routes/admin/tenants';
import { adminStatsRoutes } from './routes/admin/stats';
import { adminSettingsRoutes } from './routes/admin/settings';
import { v1SeriesRoutes } from './routes/v1/series';
import { v1TenantReadinessRoutes } from './routes/v1/tenant-readiness';
import { v1ComprobantesRoutes } from './routes/v1/comprobantes';
import { healthRoutes } from './routes/health';

import { authMiddleware } from './middleware/auth';
import { adminAuthMiddleware } from './middleware/admin-auth';
import { errorHandler } from './middleware/error-handler';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

// Configure JWT plugin
const jwtPlugin = jwt({
  secret: JWT_SECRET,
  exp: '15m',
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
const _app: any = new Elysia()
  // Global middleware
  .use(errorHandler)
  .use(cors())
  .use(swagger({
    documentation: {
      info: {
        title: 'Facturin API',
        version: '1.0.0',
        description: 'API de Facturación Electrónica SUNAT',
      },
      tags: [
        { name: 'Auth', description: 'Autenticación Super Admin' },
        { name: 'Admin', description: 'Gestión de API Keys y Tenants' },
        { name: 'V1', description: 'API v1 - Comprobantes' },
      ],
    },
  }))
  // JWT plugin for auth routes
  .use(jwtPlugin)
  // Public routes (no auth required)
  .use(healthRoutes)
  .use(authRoutes)
  // Admin routes (require JWT only - not API Keys)
  .use(adminAuthMiddleware)
  .use(adminApiKeysRoutes)
  .use(adminTenantsRoutes)
  .use(adminStatsRoutes)
  .use(adminSettingsRoutes)
  // Protected v1 routes (require API Key)
  .use(authMiddleware)
  .use(v1SeriesRoutes)
  .use(v1TenantReadinessRoutes)
  .use(v1ComprobantesRoutes)
  // Start server
  .listen(Number(process.env.PORT) || 3102, async ({ hostname, port }) => {
    console.log(`🚀 Facturin API running at http://${hostname}:${port}`);
    console.log(`📚 Swagger docs at http://${hostname}:${port}/swagger`);

    // Initialize BullMQ workers for background SUNAT job processing
    try {
      const { initializeWorkers } = await import('./jobs/index');
      await initializeWorkers();
      console.log('👷 BullMQ workers initialized');
    } catch (error) {
      console.warn('⚠️  BullMQ workers not available (Redis may not be running):', error instanceof Error ? error.message : error);
    }

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutting down...');
      try {
        const { shutdownWorkers } = await import('./jobs/index');
        await shutdownWorkers();
      } catch {
        // Workers may not have been initialized
      }
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });

export type App = typeof _app;
