import { pgTable, uuid, varchar, text, boolean, integer, decimal, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// instance_config - Configuración de la instancia OSE
// ============================================================================
export const instanceConfig = pgTable('instance_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  mode: varchar('mode', { length: 20 }).notNull().default('single'),
  isOseHomologated: boolean('is_ose_homologated').notNull().default(false),
  oseResolutionNumber: varchar('ose_resolution_number', { length: 50 }),
  oseHomologationDate: timestamp('ose_homologation_date'),
  oseSunatUsername: varchar('ose_sunat_username', { length: 100 }),
  oseSunatPassword: text('ose_sunat_password'),
  instanceName: varchar('instance_name', { length: 255 }).notNull().default('Facturin'),
  instanceUrl: varchar('instance_url', { length: 500 }),
  // SUNAT Endpoints (configurables, usan valores por defecto si no se configuran)
  sunatBetaWsdlUrl: varchar('sunat_beta_wsdl_url', { length: 500 }),
  sunatProdWsdlUrl: varchar('sunat_prod_wsdl_url', { length: 500 }),
  sunatBetaRestUrl: varchar('sunat_beta_rest_url', { length: 500 }),
  sunatProdRestUrl: varchar('sunat_prod_rest_url', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================================
// api_keys - API Keys globales (creadas por super admin)
// ============================================================================
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull().unique(),
  keyPrefix: varchar('key_prefix', { length: 20 }).notNull(),
  permissions: jsonb('permissions').notNull().default([]),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================================
// tenants - Empresas/gimnasios que emiten comprobantes
// ============================================================================
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruc: varchar('ruc', { length: 11 }).notNull().unique(),
  razonSocial: varchar('razon_social', { length: 255 }).notNull(),
  nombreComercial: varchar('nombre_comercial', { length: 255 }),
  direccion: jsonb('direccion').$type<{
    direccion?: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;
    ubigeo?: string;
  }>(),
  certificadoDigital: text('certificado_digital'),
  certificadoPassword: text('certificado_password'),
  sunatUsername: varchar('sunat_username', { length: 100 }),
  sunatPassword: text('sunat_password'),
  contactoEmail: varchar('contacto_email', { length: 255 }),
  contactoPhone: varchar('contacto_phone', { length: 50 }),
  isActive: boolean('is_active').notNull().default(true),
  maxDocumentsPerMonth: integer('max_documents_per_month'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================================
// series - Series de comprobantes por tenant
// ============================================================================
export const series = pgTable('series', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  tipoComprobante: varchar('tipo_comprobante', { length: 2 }).notNull(),
  serie: varchar('serie', { length: 4 }).notNull(),
  correlativoActual: integer('correlativo_actual').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================================
// comprobantes - Facturas, boletas, notas, guías
// ============================================================================
export const comprobantes = pgTable('comprobantes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

  // Identificación
  tipoComprobante: varchar('tipo_comprobante', { length: 2 }).notNull(),
  serie: varchar('serie', { length: 4 }).notNull(),
  numero: integer('numero').notNull(),
  fechaEmision: timestamp('fecha_emision').notNull().defaultNow(),

  // Cliente
  clienteTipoDocumento: varchar('cliente_tipo_documento', { length: 2 }).notNull(),
  clienteNumeroDocumento: varchar('cliente_numero_documento', { length: 20 }).notNull(),
  clienteNombre: varchar('cliente_nombre', { length: 255 }).notNull(),
  clienteDireccion: jsonb('cliente_direccion').$type<Record<string, unknown>>(),

  // Totales
  totalGravadas: decimal('total_gravadas', { precision: 15, scale: 2 }).notNull().default('0'),
  totalIgv: decimal('total_igv', { precision: 15, scale: 2 }).notNull().default('0'),
  totalImporte: decimal('total_importe', { precision: 15, scale: 2 }).notNull().default('0'),

  // Contenido
  detalles: jsonb('detalles').$type<Record<string, unknown>[]>().default([]),
  leyendas: jsonb('leyendas').$type<Record<string, unknown>[]>().default([]),
  formaPago: jsonb('forma_pago').$type<Record<string, unknown>>(),

  // Archivos
  xmlContent: text('xml_content'),
  cdrContent: text('cdr_content'),
  cdrStatus: varchar('cdr_status', { length: 4 }),

  // Estado SUNAT
  sunatTicket: varchar('sunat_ticket', { length: 50 }),
  sunatEstado: varchar('sunat_estado', { length: 20 }).notNull().default('pendiente'),
  sunatFechaEnvio: timestamp('sunat_fecha_envio'),
  sunatFechaRespuesta: timestamp('sunat_fecha_respuesta'),

  // Hash para integridad
  hash: varchar('hash', { length: 64 }),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================================
// sunat_logs - Logs de comunicación con SUNAT
// ============================================================================
export const sunatLogs = pgTable('sunat_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  comprobanteId: uuid('comprobante_id').references(() => comprobantes.id, { onDelete: 'set null' }),

  // Operación
  tipoOperacion: varchar('tipo_operacion', { length: 50 }).notNull(),
  ticket: varchar('ticket', { length: 50 }),

  // Request/Response
  requestXml: text('request_xml'),
  responseXml: text('response_xml'),

  // Error handling
  errorCode: varchar('error_code', { length: 10 }),
  errorMessage: text('error_message'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================================
// webhooks - Webhooks para notificaciones de estado
// ============================================================================
export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  secret: varchar('secret', { length: 255 }).notNull(),
  eventos: jsonb('eventos').$type<string[]>().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================================
// webhook_deliveries - Registro de envíos de webhooks
// ============================================================================
export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  webhookId: uuid('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  evento: varchar('evento', { length: 50 }).notNull(),
  payload: jsonb('payload').notNull(),
  responseStatus: integer('response_status'),
  responseBody: text('response_body'),
  errorMessage: text('error_message'),
  attemptCount: integer('attempt_count').notNull().default(1),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ============================================================================
// Relations
// ============================================================================
export const instanceConfigRelations = relations(instanceConfig, ({}) => ({}));

export const apiKeysRelations = relations(apiKeys, ({}) => ({}));

export const tenantsRelations = relations(tenants, ({ many }) => ({
  series: many(series),
  comprobantes: many(comprobantes),
  sunatLogs: many(sunatLogs),
  webhooks: many(webhooks),
}));

export const seriesRelations = relations(series, ({ one }) => ({
  tenant: one(tenants, {
    fields: [series.tenantId],
    references: [tenants.id],
  }),
}));

export const comprobantesRelations = relations(comprobantes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [comprobantes.tenantId],
    references: [tenants.id],
  }),
  sunatLogs: many(sunatLogs),
}));

export const sunatLogsRelations = relations(sunatLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [sunatLogs.tenantId],
    references: [tenants.id],
  }),
  comprobante: one(comprobantes, {
    fields: [sunatLogs.comprobanteId],
    references: [comprobantes.id],
  }),
}));

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [webhooks.tenantId],
    references: [tenants.id],
  }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookDeliveries.webhookId],
    references: [webhooks.id],
  }),
}));

// ============================================================================
// Types
// ============================================================================
export type InstanceConfig = typeof instanceConfig.$inferSelect;
export type NewInstanceConfig = typeof instanceConfig.$inferInsert;

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

export type Serie = typeof series.$inferSelect;
export type NewSerie = typeof series.$inferInsert;

export type Comprobante = typeof comprobantes.$inferSelect;
export type NewComprobante = typeof comprobantes.$inferInsert;

export type SunatLog = typeof sunatLogs.$inferSelect;
export type NewSunatLog = typeof sunatLogs.$inferInsert;

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;
