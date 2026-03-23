# Error Handling Reference

## Custom Error Classes

Located in `apps/api/src/errors/index.ts`:

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

## Available Errors

| Class | Status Code | Code | Use Case |
|-------|-------------|------|----------|
| `ValidationError` | 400 | `VALIDATION_ERROR` | Invalid input data |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` | Missing or invalid auth |
| `ForbiddenError` | 403 | `FORBIDDEN` | Insufficient permissions |
| `NotFoundError` | 404 | `NOT_FOUND` | Resource not found |
| `ConflictError` | 409 | `CONFLICT` | Duplicate resource |
| `AppError` | custom | custom | Base error class |

## Usage in Services

```typescript
import { ValidationError, NotFoundError, ConflictError } from '../errors';

// Throw validation error
if (!this.validateRuc(input.ruc)) {
  throw new ValidationError('Invalid RUC format', 'INVALID_RUC');
}

// Throw not found error
const tenant = await tenantsRepository.findById(id);
if (!tenant) {
  throw new NotFoundError('Tenant not found', 'NOT_FOUND');
}

// Throw conflict error
const existing = await tenantsRepository.findByRuc(input.ruc);
if (existing) {
  throw new ConflictError('RUC already registered', 'RUC_EXISTS');
}
```

## Error Handler Middleware

Located in `apps/api/src/middleware/error-handler.ts`:

```typescript
export const errorHandler = (app: Elysia) =>
  app.onError(({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
        },
      };
    }

    // Default error response
    set.status = 500;
    return {
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    };
  });
```

## API Error Response Format

```json
{
  "success": false,
  "error": {
    "message": "Invalid RUC format",
    "code": "INVALID_RUC"
  }
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Auth required |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate resource |
| 500 | Internal Server Error |

## Error Codes by Domain

### Authentication
- `INVALID_CREDENTIALS` - Wrong email/password
- `INVALID_API_KEY` - Invalid API key format
- `EXPIRED_API_KEY` - API key has expired
- `AUTH_REQUIRED` - No auth header provided
- `INVALID_AUTH` - Invalid auth scheme
- `INVALID_TENANT` - Invalid or inactive tenant

### Tenants
- `INVALID_RUC` - Invalid RUC format
- `RUC_EXISTS` - RUC already registered

### Series
- `INVALID_TIPO_COMPROBANTE` - Invalid document type
- `INVALID_SERIE` - Invalid serie format
- `DUPLICATE_SERIE` - Series already exists
- `TENANT_REQUIRED` - X-Tenant-ID header missing

### General
- `VALIDATION_ERROR` - Generic validation failure
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Generic conflict
- `INTERNAL_ERROR` - Unexpected server error
