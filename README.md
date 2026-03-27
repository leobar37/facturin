# Facturin

Sistema de **facturación electrónica SUNAT** open source para Perú. Self-hosted SaaS multi-tenant donde el host se homologa como OSE (Operador de Servicios Electrónicos) y ofrece facturación a múltiples empresas.

---

## Uso Rápido (CLI)

Si ya tienes acceso a una instancia de Facturin, puedes usar el CLI directamente:

```bash
# Instalar y usar sin instalar globalmente
npx @facturin/cli login \
  --base-url https://api.tu-instancia.com \
  --api-key sk_live_xxx \
  --tenant-id uuid-de-tu-empresa

# Emitir una factura
npx @facturin/cli emit --file factura.json

# O en modo interactivo
npx @facturin/cli emit --interactive
```

### Comandos Principales

| Comando | Descripción |
|---------|-------------|
| `facturin login` | Autenticar con la API |
| `facturin config show` | Ver configuración actual |
| `facturin tenants list` | Listar empresas |
| `facturin series list` | Listar series de documentos |
| `facturin emit` | Emitir factura/boleta |

### Ejemplo: Emitir una Factura

1. Crear archivo `factura.json`:
```json
{
  "serie": "F001",
  "clienteTipoDocumento": "6",
  "clienteNumeroDocumento": "20100178959",
  "clienteNombre": "Empresa ABC SAC",
  "clienteDireccion": "Av. Lima 123, Lima",
  "detalles": [
    {
      "descripcion": "Servicio de consultoría",
      "cantidad": 1,
      "valorUnitario": 1000.00
    }
  ]
}
```

2. Emitir:
```bash
npx @facturin/cli emit --file factura.json
```

---

## SDK (TypeScript/JavaScript)

Para integrar Facturin en tu aplicación:

```bash
npm install @facturin/sdk
# o
bun add @facturin/sdk
```

```typescript
import { FacturinClient } from '@facturin/sdk';

const client = new FacturinClient({
  baseUrl: 'https://api.tu-instancia.com',
  apiKey: 'sk_live_xxx',
  tenantId: 'uuid-de-tu-empresa',
});

// Emitir factura
const factura = await client.comprobantes.create({
  serie: 'F001',
  clienteTipoDocumento: '6',
  clienteNumeroDocumento: '20100178959',
  clienteNombre: 'Empresa ABC SAC',
  detalles: [
    { descripcion: 'Producto A', cantidad: 2, valorUnitario: 100 }
  ]
});

console.log(factura.numero); // F001-00000001
```

---

## Desarrollo Local

Para contribuir al proyecto o ejecutar tu propia instancia:

```bash
# 1. Clonar y entrar al directorio
git clone https://github.com/tu-user/facturin.git
cd facturin

# 2. Configurar variables de entorno
cp apps/api/.env.example apps/api/.env
# Editar .env con tus credenciales

# 3. Iniciar con Docker
docker-compose up -d

# 4. Crear super admin
docker-compose exec api bun run scripts/create-super-admin.ts
```

Accede a:
- API: `http://localhost:3100`
- Web: `http://localhost:5173`

### Requisitos de Desarrollo

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
│   └── web/           # Frontend React Router v7
├── packages/
│   ├── sdk/           # SDK npm (@facturin/sdk)
│   └── cli/           # CLI npx (@facturin/cli)
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
| `comprobantes` | Facturas, boletas, notas de crédito/débito |
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
- [x] SDK npm (`@facturin/sdk`)
- [x] CLI (`@facturin/cli`)
- [x] Módulo de comprobantes (facturas/boletas)
- [x] Generación de XML UBL 2.1
- [x] Firma digital con certificados

### En desarrollo

- [ ] Integración con SUNAT (envío a OSE/CPE)
- [ ] Frontend web (panel de administración)
- [ ] Webhooks y notificaciones

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

- `sunat.html` — Documentación completa de integración SUNAT (arquitectura, flujos, códigos de error, catálogos)

## Recursos SUNAT

- [Portal CPE](https://cpe.sunat.gob.pe)
- WSDL Beta: `https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl`
- WSDL Producción: `https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService?wsdl`

## Licencia

MIT
