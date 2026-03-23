# Task 14: Multi-Tenant Architecture for OSE Mode

## Objetivo
Implementar arquitectura multi-tenant para modo OSE (Operador de Servicios Electrónicos).

## Contexto
Facturin puede operar en DOS modos:

### Modo 1: Single-Tenant (PSE)
- Un solo tenant (la misma organización que hostea)
- El tenant debe homologarse individualmente ante SUNAT
- Uso: Empresas que quieren facturar para sí mismas

### Modo 2: Multi-Tenant (OSE) ⭐ ESTE TASK
- Múltiples tenants registrados en una instancia
- El HOST se homologa como OSE ante SUNAT
- Los tenants NO necesitan homologación
- Uso: Proveedores de software, agencias, consultoras

## Cambios en Database Schema

```typescript
// NUEVA TABLA: Configuración OSE del host
export const oseConfig = pgTable('ose_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Modo de operación
  mode: pgEnum('mode', ['single', 'multi']).notNull().default('single'),
  
  // Si es multi-tenant, debe estar homologado como OSE
  isOseHomologated: boolean('is_ose_homologated').default(false),
  oseResolutionNumber: varchar('ose_resolution_number', { length: 50 }),
  oseHomologationDate: timestamp('ose_homologation_date'),
  
  // Credenciales OSE del HOST (para emitir por todos los tenants)
  oseSunatUsername: varchar('ose_sunat_username', { length: 100 }),
  oseSunatPassword: text('ose_sunat_password'),
  
  // Configuración de la instancia
  instanceName: varchar('instance_name', { length: 100 }),
  instanceUrl: varchar('instance_url', { length: 255 }),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// MODIFICAR: organizations → tenants
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Datos del tenant (ej: Gimnasio Fitness SAC)
  ruc: varchar('ruc', { length: 11 }).notNull().unique(),
  razonSocial: varchar('razon_social', { length: 255 }).notNull(),
  nombreComercial: varchar('nombre_comercial', { length: 255 }),
  
  // En modo OSE, estos datos son para emisión, NO para homologación
  direccion: jsonb('direccion').notNull(),
  certificadoDigital: text('certificado_digital'), // Para firma XML
  certificadoPassword: text('certificado_password'),
  
  // Contacto administrativo del tenant
  adminEmail: varchar('admin_email', { length: 255 }).notNull(),
  adminPhone: varchar('admin_phone', { length: 20 }),
  
  // Estado del tenant
  isActive: boolean('is_active').default(true),
  plan: pgEnum('plan', ['free', 'basic', 'pro']).default('free'),
  maxDocumentsPerMonth: integer('max_documents_month').default(500),
  
  // No necesita credenciales SUNAT en modo OSE!
  // Usamos las del host (oseConfig)
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


## Lógica de Emisión (Modo OSE)

```typescript
// Cuando un tenant emite un comprobante:

async function emitirComprobante(tenantId: string, data: ComprobanteData) {
  // 1. Obtener configuración OSE del HOST
  const oseConfig = await db.query.oseConfig.findFirst();
  
  if (!oseConfig?.isOseHomologated) {
    throw new Error('Este servidor no está homologado como OSE');
  }
  
  // 2. Obtener datos del tenant
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId)
  });
  
  // 3. Generar XML con datos del TENANT
  const xml = await xmlBuilder.generarInvoiceXML({
    emisor: {
      ruc: tenant.ruc,                    // ← RUC del tenant
      razonSocial: tenant.razonSocial,    // ← Razón social del tenant
      // ... resto de datos del tenant
    },
    // ... datos del comprobante
  });
  
  // 4. Firmar con certificado del TENANT
  const xmlFirmado = await xmlSigner.firmarXML(
    xml,
    tenant.certificadoDigital,
    tenant.certificadoPassword
  );
  
  // 5. Enviar a SUNAT usando credenciales OSE del HOST
  const sunatClient = new SunatClient({
    username: oseConfig.oseSunatUsername,  // ← Usuario OSE del HOST
    password: oseConfig.oseSunatPassword,  // ← Password OSE del HOST
    ambiente: 'produccion'
  });
  
  const result = await sunatClient.sendBill(fileName, xmlFirmado);
  
  // 6. El CDR vuelve al tenant
  return result;
}
```

## Configuración Inicial (Setup)

```typescript
// Al iniciar Facturin por primera vez:

export async function initialSetup() {
  console.log('🔧 Configuración inicial de Facturin');
  
  const mode = await select({
    message: '¿Modo de operación?',
    options: [
      { 
        value: 'single', 
        label: 'Single-Tenant (Facturo para mi propia empresa)' 
      },
      { 
        value: 'multi', 
        label: 'Multi-Tenant (OSE - Ofrezco facturación a múltiples clientes)' 
      },
    ],
  });
  
  await db.insert(oseConfig).values({
    mode,
    instanceName: await text({ message: 'Nombre de la instancia:' }),
    instanceUrl: await text({ message: 'URL pública:' }),
  });
  
  if (mode === 'multi') {
    console.log(chalk.yellow('\n⚠️  IMPORTANTE:'));
    console.log('Para modo Multi-Tenant (OSE), debes:'));
    console.log('1. Constituir empresa SAC');
    console.log('2. Obtener garantía bancaria (S/ 50k-100k)');
    console.log('3. Solicitar homologación OSE ante SUNAT');
    console.log('4. Completar proceso de homologación (3-6 meses)');
    console.log('\nMientras tanto, puedes usar modo Single-Tenant.\n');
  }
}
```

## Onboarding de Tenants (Modo OSE)

```typescript
// POST /api/v1/tenants/register

export async function registerTenant(data: RegisterTenantInput) {
  // 1. Validar RUC
  const rucValido = await validarRUC(data.ruc);
  if (!rucValido) throw new Error('RUC inválido');
  
  // 2. Verificar que no exista
  const existing = await db.query.tenants.findFirst({
    where: eq(tenants.ruc, data.ruc)
  });
  if (existing) throw new Error('RUC ya registrado');
  
  // 3. Crear tenant
  const tenant = await db.insert(tenants).values({
    ruc: data.ruc,
    razonSocial: data.razonSocial,
    nombreComercial: data.nombreComercial,
    direccion: data.direccion,
    adminEmail: data.adminEmail,
    plan: 'free',
  }).returning();
  
  // 4. Crear usuario admin del tenant
  const hashedPassword = await bcrypt.hash(data.password, 10);
  await sendWelcomeEmail(data.adminEmail, {
    tenantName: data.razonSocial,
    dashboardUrl: `${config.instanceUrl}/login`,
    nextSteps: [
      'Subir certificado digital',
      'Configurar series de comprobantes',
      'Personalizar logo y colores',
      '¡Empezar a facturar!',
    ]
  });
  
  return { 
    success: true, 
    message: 'Tenant registrado exitosamente',
    tenantId: tenant[0].id
  };
}
```

## Flujo de Emisión para Tenant

```typescript
// POST /api/v1/facturas
// Header: X-Tenant-ID: <tenant-id>
// Header: Authorization: Bearer <tenant-api-key>

export async function createFactura(req: Request) {
  // 1. Extraer tenant ID del header
  const tenantId = req.headers['x-tenant-id'];
  
  // 2. Validar API key pertenece al tenant
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  await validateTenantApiKey(tenantId, apiKey);
  
  // 3. Verificar límites del plan
  const documentCount = await getMonthlyDocumentCount(tenantId);
  const tenant = await getTenant(tenantId);
  
  if (documentCount >= tenant.maxDocumentsPerMonth) {
    throw new Error('Límite de documentos alcanzado. Actualiza tu plan.');
  }
  
  // 4. Crear comprobante
  const comprobante = await comprobanteService.create({
    tenantId,
    ...req.body,
  });
  
  // 5. Enviar a SUNAT (usa OSE del host)
  await inngest.send({
    name: 'comprobante/creado',
    data: {
      comprobanteId: comprobante.id,
      tenantId,
    },
  });
  
  return comprobante;
}
```

## Criterios de Aceptación
- [ ] Schema soporta modo single y multi-tenant
- [ ] Configuración inicial permite elegir modo
- [ ] En modo multi, valida que OSE esté homologado antes de permitir emisión
- [ ] Tenants se registran sin necesidad de homologación
- [ ] Cada tenant tiene su propio certificado digital
- [ ] Emisión usa credenciales OSE del HOST
- [ ] Límites por plan funcionan correctamente
- [ ] Dashboard admin muestra todos los tenants

## Bloquea
Ninguno - puede desarrollarse en paralelo

## Bloqueado Por
Task 1, Task 2

## Estimación
6-8 horas
