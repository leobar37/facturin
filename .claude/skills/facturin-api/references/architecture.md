# Architecture Reference

## Layered Architecture

```
┌─────────────────────────────────────────┐
│              Routes (HTTP)               │
│  apps/api/src/routes/**/*.ts            │
└─────────────────┬───────────────────────┘
                  │ calls
                  ▼
┌─────────────────────────────────────────┐
│           Services (Business)            │
│  apps/api/src/services/**/*.ts         │
└─────────────────┬───────────────────────┘
                  │ calls
                  ▼
┌─────────────────────────────────────────┐
│         Repositories (Data)              │
│  apps/api/src/repositories/**/*.ts      │
└─────────────────┬───────────────────────┘
                  │ queries
                  ▼
┌─────────────────────────────────────────┐
│              Database                    │
│         PostgreSQL + Drizzle            │
└─────────────────────────────────────────┘
```

## Directory Structure

```
apps/api/src/
├── index.ts                    # Entry point, app config
├── routes/                     # HTTP handlers (thin)
│   ├── health.ts
│   ├── auth.ts
│   ├── admin/
│   │   ├── api-keys.ts
│   │   └── tenants.ts
│   └── v1/
│       └── series.ts
├── services/                   # Business logic
│   ├── index.ts              # Barrel export
│   ├── api-keys.service.ts
│   ├── tenants.service.ts
│   └── series.service.ts
├── repositories/              # Data access
│   ├── index.ts              # Barrel export
│   ├── api-keys.repository.ts
│   ├── tenants.repository.ts
│   └── series.repository.ts
├── middleware/
│   ├── auth.ts               # API Key auth
│   └── error-handler.ts      # Error processing
├── errors/                    # Custom error classes
│   └── index.ts
└── db/
    ├── index.ts              # Drizzle client
    └── schema.ts             # Database schema
```

## Pattern: Repository

Each repository handles data access for one entity:

```typescript
// apps/api/src/repositories/series.repository.ts
export interface SerieEntity {
  id: string;
  tenantId: string;
  tipoComprobante: string;
  serie: string;
  correlativoActual: number;
  isActive: boolean;
  createdAt: Date;
}

export class SeriesRepository {
  async findById(id: string): Promise<SerieEntity | null> { ... }
  async findByTenantAndId(tenantId: string, id: string): Promise<SerieEntity | null> { ... }
  async create(data: {...}): Promise<SerieEntity> { ... }
  async update(id: string, data: Partial<SerieEntity>): Promise<SerieEntity | null> { ... }
  async deactivate(id: string): Promise<SerieEntity | null> { ... }
}

export const seriesRepository = new SeriesRepository();
```

## Pattern: Service

Services contain business logic and orchestrate repositories:

```typescript
// apps/api/src/services/series.service.ts
const VALID_TIPO_COMPROBANTE = ['01', '03', '07', '08', '09', '20', '40'] as const;

export class SeriesService {
  isValidTipoComprobante(tipo: string): boolean {
    return VALID_TIPO_COMPROBANTE.includes(tipo as typeof VALID_TIPO_COMPROBANTE[number]);
  }

  async create(input: CreateSerieInput): Promise<...> {
    // Validate business rules
    if (!this.isValidTipoComprobante(input.tipoComprobante)) {
      throw new ValidationError('Invalid tipoComprobante', 'INVALID_TIPO_COMPROBANTE');
    }

    // Call repository
    return seriesRepository.create({ ... });
  }
}

export const seriesService = new SeriesService();
```

## Pattern: Route (Handler)

Routes are thin - they only handle HTTP and delegate to services:

```typescript
// apps/api/src/routes/v1/series.ts
export const v1SeriesRoutes = new Elysia({ prefix: '/api/v1' })
  .post('/series', async ({ body, set, store }) => {
    const ctx = store as RequestContext;
    const tenantId = ctx?.tenantId;

    if (!tenantId) {
      throw new ValidationError('X-Tenant-ID header required', 'TENANT_REQUIRED');
    }

    const result = await seriesService.create({
      tenantId,
      tipoComprobante: body.tipoComprobante,
      serie: body.serie,
    });

    if (!result.success) {
      set.status = result.code === 'DUPLICATE_SERIE' ? 409 : 400;
      return { success: false, error: { message: result.error, code: result.code } };
    }

    return { success: true, data: result.data };
  }, {
    body: t.Object({ ... })
  });
```

## Request Context (Multi-tenancy)

```typescript
// apps/api/src/middleware/auth.ts
export interface RequestContext {
  apiKeyId?: string;
  tenantId?: string;
  permissions?: string[];
  authType?: 'jwt' | 'api-key';
}

// Usage in route
const ctx = store as RequestContext;
const tenantId = ctx?.tenantId;
```

## Adding a New Entity

1. **Database Schema** (`apps/api/src/db/schema.ts`)
   - Add table definition with Drizzle

2. **Repository** (`apps/api/src/repositories/`)
   - Create `entity.repository.ts`
   - Define `Entity` interface
   - Implement data access methods
   - Export singleton instance

3. **Service** (`apps/api/src/services/`)
   - Create `entity.service.ts`
   - Implement business logic
   - Use validation and custom errors
   - Export singleton instance

4. **Route** (`apps/api/src/routes/`)
   - Create handler using service
   - Use TypeBox for validation
   - Handle errors appropriately

5. **Register** in `apps/api/src/index.ts`

## Best Practices

- **Routes**: Thin, only HTTP handling
- **Services**: Business logic, validation, orchestration
- **Repositories**: Data access, SQL queries
- **No cross-service calls**: Services don't call other services
- **Use custom errors**: Throw `ValidationError`, `NotFoundError`, etc.
- **Entity typing**: Define interfaces for all domain objects
