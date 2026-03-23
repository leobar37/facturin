import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { jwt } from '@elysiajs/jwt';

import { authRoutes } from './routes/auth';
import { adminApiKeysRoutes } from './routes/admin/api-keys';
import { adminTenantsRoutes } from './routes/admin/tenants';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const app: any = new Elysia()
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
  // Protected v1 routes (require API Key)
  .use(authMiddleware)
  .use(v1SeriesRoutes)
  .use(v1TenantReadinessRoutes)
  .use(v1ComprobantesRoutes)
  // Start server
  .listen(3001, ({ hostname, port }) => {
    console.log(`🚀 Facturin API running at http://${hostname}:${port}`);
    console.log(`📚 Swagger docs at http://${hostname}:${port}/swagger`);
  });

export type App = typeof app;
