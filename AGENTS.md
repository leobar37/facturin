# Facturin - Instrucciones para Agentes de IA

## 🎯 Propósito del Proyecto

Facturin es un sistema de **facturación electrónica SUNAT** open source para Perú.

**Soporta dos modos de operación:**
- **Modo Personal (Emisor Directo):** Un negocio despliega Facturin para emitir sus propias facturas directamente a SUNAT. Solo requiere RUC + certificado digital.
- **Modo OSE (Multi-tenant):** Una empresa se homologa como OSE (Operador de Servicios Electrónicos) y ofrece facturación electrónica como servicio a múltiples empresas/negocios.

Ambos modos usan la misma base de código, mismo XML (UBL 2.1), misma firma digital y mismos endpoints SUNAT. La diferencia es administrativa: 1 tenant vs N tenants.

Ver: [`docs/modos-de-uso.md`](docs/modos-de-uso.md) para detalles completos.

## 🏗️ Arquitectura

### Stack Tecnológico
- **Runtime:** Bun 1.1+
- **Backend:** Elysia.js (TypeScript)
- **Frontend:** React Router v7
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL 16
- **Jobs:** BullMQ (Redis)
- **Auth:** JWT + API Keys

### Estructura (Monorepo)
```
facturin/
├── apps/
│   ├── api/           # Backend Elysia
│   └── web/           # Frontend React Router
├── packages/
│   ├── sdk/           # SDK npm (@facturin/sdk)
│   └── cli/           # CLI npx facturin
├── docker-compose.yml
└── AGENTS.md          # Este archivo
```

## 🔐 Modelo de Autenticación

### Niveles de Acceso

1. **Super Admin** (Variables de entorno)
   - Login vía web panel
   - Gestiona tenants, API keys, configuración
   - NO tiene API keys propias

2. **API Keys** (Tabla `api_keys`)
   - Globales, creadas por super admin
   - Usadas vía SDK o API directa
   - Requieren header `X-Tenant-ID` para operar sobre un tenant específico

### Headers Requeridos
```
Authorization: Bearer sk_live_xxxxxxxx
X-Tenant-ID: uuid-del-tenant
```

## 🗄️ Database Schema (6 tablas)

1. **instance_config** - Configuración OSE/instancia
2. **api_keys** - API keys globales
3. **tenants** - Empresas/gimnasios (datos para emitir)
4. **series** - Series F001, B001 por tenant
5. **comprobantes** - Facturas, boletas, notas
6. **sunat_logs** - Logs de comunicación SUNAT

**NO hay:**
- ❌ Tabla de usuarios
- ❌ Login por tenant
- ❌ API keys por tenant (solo globales)

## 📝 Convenciones de Código

### Bun Runtime
- **Usar Bun en lugar de npm**: Todos los comandos de package manager deben usar `bun`:
  ```bash
  # Correcto ✅
  bun install
  bun add <package>
  bun run <script>
  bun test
  
  # Incorrecto ❌
  npm install
  npm run <script>
  yarn add <package>
  ```
- Bun es el runtime oficial del proyecto - verificar que package.json usa Bun
- Las dependencias deben instalarse con `bun add` (no npm install)
- Los scripts se ejecutan con `bun run` (no npm run)

### TypeScript
- Usar `type` en lugar de `interface` para tipos simples
- Evitar `any`, usar `unknown` cuando sea necesario
- Funciones: async/await preferido sobre promesas
- Nombres: camelCase para variables, PascalCase para tipos/clases

### Drizzle ORM
- Definir schemas en `apps/api/src/db/schema.ts`
- Usar `relations()` para definir relaciones
- Índices: usar `index()` para queries frecuentes
- Migraciones: `bun run db:generate` → `bun run db:migrate`

### API Endpoints (Elysia)
```typescript
// Estructura estándar
export const routes = new Elysia({ prefix: '/v1/facturas' })
  .use(authMiddleware)  // Siempre primero
  .get('/', handler, {  // Luego endpoints
    query: t.Object({   // Validación con TypeBox
      limit: t.Number()
    })
  });
```

### Commits
```
tipo(scope): descripción breve

tipo = feat|fix|docs|style|refactor|test|chore
scope = api|web|sdk|cli|db

Ejemplos:
- feat(api): add invoice creation endpoint
- fix(db): correct IGV calculation precision
- docs(readme): update installation instructions
```

## 🧪 Testing

### Comandos
```bash
# Unit tests
bun test

# Integration tests
bun test:integration

# E2E tests (Playwright)
cd apps/web && bun playwright test

# Type checking
bun run typecheck

# Linting
bun run lint
```

### Antes de commitear
Siempre ejecutar:
1. `bun run typecheck` - TypeScript sin errores
2. `bun run lint` - Código linteado
3. `bun test` - Tests pasan

## 🐳 Docker

### Comandos útiles
```bash
# Desarrollo
bun run dev          # Inicia api + web + db

# Con Docker
docker-compose up -d
docker-compose logs -f api

# Migraciones
docker-compose exec api bun run migrate

# Backup
docker-compose exec db pg_dump -U facturin facturin > backup.sql
```

## 🔑 Patrones Importantes

### Multi-tenancy
Toda query debe filtrar por `tenantId`:
```typescript
// Correcto ✅
await db.query.comprobantes.findMany({
  where: and(
    eq(comprobantes.tenantId, tenantId),
    eq(comprobantes.sunatEstado, 'pendiente')
  )
});

// Incorrecto ❌ (no filtra por tenant)
await db.query.comprobantes.findMany();
```

### Request Context
El middleware de autenticación inyecta en `store`:
```typescript
interface RequestContext {
  apiKeyId: string;
  permissions: string[];
  tenantId?: string;  // Del header X-Tenant-ID
}
```

### Envío a SUNAT
Nunca bloquear el request HTTP. Siempre usar jobs:
```typescript
// Correcto ✅
await comprobanteQueue.add('enviar', {
  comprobanteId,
  tenantId
});
return { status: 'pendiente' };

// Incorrecto ❌
const result = await sunatClient.sendBill(...); // Bloquea
```

## 🚨 Reglas Críticas

1. **Nunca** hardcodear credenciales SUNAT en el código
2. **Siempre** encriptar certificados y passwords antes de guardar
3. **Validar** RUC usando algoritmo de SUNAT (11 dígitos, dígito verificador)
4. **Nunca** loggear datos sensibles (passwords, certificados, XML firmados)
5. **Siempre** usar transacciones para operaciones que modifican múltiples tablas
6. **Nunca** modificar un comprobante ya enviado a SUNAT (usar notas de crédito/débito)

## 📦 Agregando Features

### Nuevo endpoint API
1. Crear schema de validación con TypeBox
2. Implementar handler en `apps/api/src/routes/`
3. Agregar middleware de auth
4. Tests en `apps/api/src/routes/__tests__/`

### Nueva tabla
1. Definir en `apps/api/src/db/schema.ts`
2. Generar migración: `bun run db:generate`
3. Actualizar tipos si es necesario
4. Crear repository en `apps/api/src/repositories/`

### Nuevo job BullMQ
1. Crear processor en `apps/api/src/jobs/processes/`
2. Registrar en `apps/api/src/jobs/worker.ts`
3. Agregar a la cola en `apps/api/src/jobs/queue.ts`
4. Manejar errores con retries apropiados

## 🔍 Debugging

### Logs útiles
```bash
# Ver logs de SUNAT
docker-compose logs -f api | grep "SUNAT"

# Ver jobs BullMQ (Redis)
docker-compose logs -f redis

# Database queries
docker-compose exec db psql -U facturin -c "SELECT * FROM comprobantes LIMIT 10;"
```

### Herramientas
- **BullMQ:** Requiere Redis (incluido en docker-compose)
- **API Docs:** http://localhost:3000/docs (cuando implementemos Swagger)
- **Drizzle Studio:** `bun run db:studio`

## 📚 Recursos SUNAT

- Portal CPE: https://cpe.sunat.gob.pe
- Manual Programador: En `docs/references/`
- WSDL Beta: https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl
- WSDL Prod: https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService?wsdl

## 🤝 Contribuyendo

1. Crear branch: `git checkout -b feature/nombre-descriptivo`
2. Commits con conventional commits
3. PR con descripción clara
4. Asegurar que CI pase (typecheck, lint, tests)

## ❓ Preguntas Frecuentes

**Q: ¿Cómo se diferencia Facturin de Nubefact?**
A: Facturin es open source y self-hosted. Puedes usarlo para tu propio negocio (emisor directo) o como OSE para servir a múltiples empresas. Nubefact es SaaS centralizado.

**Q: ¿Por qué no hay tabla de usuarios?**
A: El diseño es intencionalmente simple: super admin vía ENV, y los tenants se conectan vía API Keys + SDK. No hay login por tenant.

**Q: ¿Cómo se maneja la autenticación del SDK?**
A: El SDK recibe `baseUrl` + `apiKey` + `tenantId`. Cada request envía Bearer token y X-Tenant-ID header.

---

**Última actualización:** 2026-03-21
**Versión:** 1.0.0
