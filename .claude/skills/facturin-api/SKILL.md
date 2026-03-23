---
name: facturin-api
description: Reference skill for Facturin API. Use when working with API endpoints, routes, services, repositories, or backend architecture. Covers health, auth, admin/api-keys, admin/tenants, and v1/series endpoints.
---

# Facturin API Skill

API de facturación electrónica SUNAT para Perú, construida con Bun + Elysia + Drizzle.

## Quick Reference

### Base URL
```
http://localhost:3001
```

### Authentication
- **Super Admin**: JWT Bearer token (15min expiry)
- **API Keys**: `Authorization: Bearer sk_live_xxx` + `X-Tenant-ID: uuid`

### Endpoints Overview

| Prefix | Description | Auth |
|--------|-------------|------|
| `/api/health` | Health check | None |
| `/api/auth` | Login, refresh, me | JWT |
| `/api/admin/api-keys` | API key management | JWT |
| `/api/admin/tenants` | Tenant management | JWT |
| `/api/v1/series` | Series management | API Key + X-Tenant-ID |

### Response Format
```typescript
{
  success: boolean;
  data?: T;
  error?: { message: string; code: string };
  pagination?: { total: number; limit: number; offset: number };
}
```

## Architecture Pattern

```
Request → Middleware → Route → Service → Repository → Database
                ↓
           ErrorHandler
```

**Key Files:**
- Routes: `apps/api/src/routes/`
- Services: `apps/api/src/services/`
- Repositories: `apps/api/src/repositories/`
- Errors: `apps/api/src/errors/`

## Error Handling

Use custom error classes from `apps/api/src/errors/`:
- `ValidationError` (400)
- `UnauthorizedError` (401)
- `NotFoundError` (404)
- `ConflictError` (409)

## Detailed Documentation

For complete endpoint documentation, see:
- [references/endpoints.md](references/endpoints.md) - All endpoints with request/response
- [references/architecture.md](references/architecture.md) - Repository/Service patterns
- [references/errors.md](references/errors.md) - Error handling system

## Adding New Endpoints

1. Add route in `apps/api/src/routes/`
2. Add service logic in `apps/api/src/services/`
3. Add repository methods in `apps/api/src/repositories/`
4. Use validation with TypeBox (`t.Object`)
5. Throw appropriate errors from `apps/api/src/errors/`
6. Update references documentation
