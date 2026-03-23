# Facturin

Sistema de **facturación electrónica SUNAT** open source para Perú. Self-hosted SaaS multi-tenant donde el host se homologa como OSE (Operador de Servicios Electrónicos) y ofrece facturación a múltiples empresas.

## Quick Start

```bash
# 1. Clonar y entrar al directorio
git clone https://github.com/tu-user/facturin.git
cd facturin

# 2. Configurar variables de entorno
cp apps/api/.env.example apps/api/.env
# Editar .env con tus credenciales

# 3. Iniciar con Docker
docker-compose up -d

# 4. Crear tabla de super admin
docker-compose exec api bun run scripts/create-super-admin.ts
```

Accede a `http://localhost:3001` para la API.

## Requisitos

- **Bun** 1.1+ o **Node.js** 20+
- **PostgreSQL** 16 (o Docker)
- **Docker** (opcional, para producción)

## Instalación Local (Development)

```bash
# Instalar dependencias
bun install

# Configurar base de datos
cp apps/api/.env.example apps/api/.env
# Editar DATABASE_URL y JWT_SECRET

# Generar migrations
bun run db:generate
bun run db:migrate

# Iniciar API
bun run dev:api
```

## Configuración

### Variables de Entorno (apps/api/.env)

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `DATABASE_URL` | Connection string PostgreSQL | Sí |
| `JWT_SECRET` | Secret para firmar tokens JWT | Sí |
| `SUPER_ADMIN_EMAIL` | Email del admin principal | Sí |
| `SUPER_ADMIN_PASSWORD_HASH` | Hash bcrypt de la contraseña | Sí |
| `OSE_SUNAT_USERNAME` | Usuario SUNAT para OSE | No (para producción) |
| `OSE_SUNAT_PASSWORD` | Password SUNAT para OSE | No (para producción) |

### Generar Super Admin

```bash
# Crear hash de contraseña
docker-compose exec api bun run scripts/create-super-admin.ts
```

## Arquitectura

```
facturin/
├── apps/
│   ├── api/           # Backend Elysia.js
│   └── web/           # Frontend (próximamente)
├── packages/
│   ├── sdk/           # SDK npm (próximamente)
│   └── cli/           # CLI npx (próximamente)
├── docs/              # Documentación
└── docker-compose.yml
```

### Stack Tecnológico

- **Runtime:** Bun 1.1+
- **Backend:** Elysia.js (TypeScript)
- **Base de datos:** PostgreSQL 16 + Drizzle ORM
- **Jobs:** Inngest (procesamiento async)
- **Auth:** JWT (super admin) + API Keys (tenants)

### Modelo de Autenticación

**Super Admin** (panel web):
- Login con email + password
- Gestiona tenants, API keys, configuración

**API Keys** (para integración):
- Keys globales creadas por super admin
- Header `X-Tenant-ID` para operar sobre un tenant específico

```bash
curl -H "Authorization: Bearer sk_live_xxx" \
     -H "X-Tenant-ID: uuid-del-tenant" \
     https://api.example.com/v1/series
```

## Estructura de la Base de Datos

| Tabla | Propósito |
|-------|-----------|
| `instance_config` | Configuración OSE/SUNAT |
| `api_keys` | API keys globales |
| `tenants` | Empresas que emiten comprobantes |
| `series` | Series de documentos (F001, B001) |
| `comprobantes` | Facturas, boletas, notas (próximamente) |
| `sunat_logs` | Logs de comunicación SUNAT |

## Estado del Proyecto

### Implementado

- [x] Schema de base de datos (6 tablas)
- [x] Autenticación JWT + API Keys
- [x] CRUD de tenants
- [x] CRUD de API keys
- [x] CRUD de series
- [x] Validación de RUC
- [x] Docker Compose con PostgreSQL + Inngest

### En desarrollo

- [ ] Módulo de comprobantes (facturas/boletas)
- [ ] Integración con SUNAT
- [ ] Frontend web
- [ ] SDK npm
- [ ] CLI

## Scripts Disponibles

```bash
bun run dev:api       # Iniciar API en desarrollo
bun run db:generate   # Generar migraciones Drizzle
bun run db:migrate    # Aplicar migraciones
bun run db:studio     # Abrir Drizzle Studio
bun run typecheck     # Verificar TypeScript
bun run lint          # Linting
bun test              # Tests
```

## Documentación

- [Tutorial de Facturación Electrónica](./docs/tutorial-negocio-facturacion.md) — Conceptos del modelo de negocio peruano
- [Schema de Base de Datos](./docs/database-schema.md) — Detalle de tablas y relaciones

## Recursos SUNAT

- [Portal CPE](https://cpe.sunat.gob.pe)
- WSDL Beta: `https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl`
- WSDL Producción: `https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService?wsdl`

## Licencia

MIT
