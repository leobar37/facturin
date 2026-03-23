# Task 2: Database Schema & Drizzle Setup

## Objetivo
Definir el esquema completo de base de datos usando Drizzle ORM.

## Entregables
- [ ] Schema Drizzle completo en `apps/api/src/db/schema.ts`
- [ ] Migraciones iniciales generadas
- [ ] Configuración de conexión a PostgreSQL
- [ ] Tipos TypeScript generados automáticamente

## Tablas Requeridas

### Core
- `organizations` - Datos del contribuyente (RUC, certificado, etc.)
- `api_keys` - API keys para autenticación
- `series` - Series de comprobantes (F001, B001, etc.)
- `comprobantes` - Facturas, boletas, notas
- `sunat_logs` - Auditoría de envíos a SUNAT

### Relations
- Organizations → ApiKeys (1:N)
- Organizations → Series (1:N)
- Organizations → Comprobantes (1:N)
- Comprobantes → SunatLogs (1:N)

## Schema Detallado

```typescript
// organizations
- id: uuid (pk)
- ruc: varchar(11) unique
- razonSocial: varchar(255)
- nombreComercial: varchar(255)
- direccion: jsonb
- certificadoDigital: text (encrypted base64)
- certificadoPassword: text (encrypted)
- sunatUsername: varchar(100)
- sunatPassword: text (encrypted)
- ambiente: enum('beta', 'produccion')
- webhookUrl: varchar(500)
- createdAt: timestamp
- updatedAt: timestamp

// api_keys
- id: uuid (pk)
- organizationId: uuid (fk)
- name: varchar(100)
- keyHash: varchar(255) unique
- permissions: jsonb
- isActive: boolean
- createdAt: timestamp

// series
- id: uuid (pk)
- organizationId: uuid (fk)
- tipoComprobante: varchar(2)
- serie: varchar(4)
- correlativoActual: integer
- isActive: boolean

// comprobantes
- id: uuid (pk)
- organizationId: uuid (fk)
- tipoComprobante: varchar(2)
- serie: varchar(4)
- numero: integer
- fechaEmision: date
- clienteTipoDocumento: varchar(2)
- clienteNumeroDocumento: varchar(20)
- clienteNombre: varchar(255)
- clienteDireccion: jsonb
- totalGravadas: decimal(15,2)
- totalIgv: decimal(15,2)
- totalImporte: decimal(15,2)
- detalles: jsonb
- leyendas: jsonb
- xmlContent: text
- cdrContent: text
- sunatEstado: enum
- sunatTicket: varchar(50)
- createdAt: timestamp
```

## Criterios de Aceptación
- [ ] Schema ejecuta sin errores
- [ ] Migraciones generadas correctamente (`drizzle-kit generate`)
- [ ] Tipos TypeScript exportados
- [ ] Índices creados para queries frecuentes

## Bloquea
Task 3, 4, 5 (dependen del schema)

## Bloqueado Por
Task 1

## Estimación
4-5 horas
