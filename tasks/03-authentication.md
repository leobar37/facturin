# Task 3: Authentication System

## Objetivo
Implementar autenticación simple: Super Admin via ENV + API Keys.

## Entregables
- [ ] Login del Super Admin (contra ENV vars)
- [ ] Sistema de sesiones JWT
- [ ] Middleware de autenticación (API Keys)
- [ ] Gestión de API Keys (crear, listar, revocar)
- [ ] Protección de rutas

## Endpoints a Implementar

### Auth (Super Admin)
```
POST   /api/auth/login          # Login con email/password (vs ENV)
POST   /api/auth/logout         # Logout
GET    /api/auth/me             # Datos del admin logueado
POST   /api/auth/refresh        # Refresh JWT
```

### API Keys Management
```
GET    /api/admin/api-keys      # Listar todas las API keys
POST   /api/admin/api-keys      # Crear nueva API key
DELETE /api/admin/api-keys/:id  # Revocar API key
```

## Configuración (ENV)

```bash
# .env
SUPER_ADMIN_EMAIL=admin@tuempresa.com
SUPER_ADMIN_PASSWORD_HASH=$2b$10$...   # bcrypt
JWT_SECRET=tu-secreto-jwt
```

## Implementación

### API Key Format
```
sk_live_xxxxxxxxxxxxxxxx       # Producción
sk_test_xxxxxxxxxxxxxxxx       # Testing
```

### Login Flow
```typescript
POST /api/auth/login
Body: { email, password }

1. Validar email vs SUPER_ADMIN_EMAIL
2. Comparar password bcrypt vs SUPER_ADMIN_PASSWORD_HASH
3. Generar JWT temporal (15 min)
4. Con JWT se pueden crear API Keys persistentes
```

### Middleware (API Key Auth)
```typescript
const authMiddleware = async ({ headers, set }) => {
  const token = headers.authorization?.replace('Bearer ', '');
  
  // Validar si es API Key
  const apiKey = await db.query.adminApiKeys.findFirst({
    where: eq(adminApiKeys.keyHash, hashKey(token))
  });
  
  if (!apiKey || !apiKey.isActive) {
    set.status = 401;
    return { error: 'Unauthorized' };
  }
  
  // Actualizar lastUsedAt
  await db.update(adminApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(adminApiKeys.id, apiKey.id));
  
  // Inyectar contexto
  set.apiKeyId = apiKey.id;
  set.permissions = apiKey.permissions;
};
```

### Request Context
```typescript
interface RequestContext {
  apiKeyId: string;
  permissions: string[];  // ['*'] = full access
}
```

## Criterios de Aceptación
- [ ] Login funciona con credenciales de ENV
- [ ] JWT se genera correctamente
- [ ] API Keys se crean y validan
- [ ] Middleware rechaza accesos inválidos
- [ ] Solo el super admin puede crear API Keys

## Bloquea
Task 4 (comprobantes necesitan auth)

## Bloqueado Por
Task 1, Task 2

## Estimación
2-3 horas
