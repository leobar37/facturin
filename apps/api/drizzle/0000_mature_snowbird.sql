CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"key_prefix" varchar(20) NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comprobantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tipo_comprobante" varchar(2) NOT NULL,
	"serie" varchar(4) NOT NULL,
	"numero" integer NOT NULL,
	"fecha_emision" timestamp DEFAULT now() NOT NULL,
	"cliente_tipo_documento" varchar(2) NOT NULL,
	"cliente_numero_documento" varchar(20) NOT NULL,
	"cliente_nombre" varchar(255) NOT NULL,
	"cliente_direccion" jsonb,
	"total_gravadas" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_igv" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_importe" numeric(15, 2) DEFAULT '0' NOT NULL,
	"detalles" jsonb DEFAULT '[]'::jsonb,
	"leyendas" jsonb DEFAULT '[]'::jsonb,
	"forma_pago" jsonb,
	"xml_content" text,
	"cdr_content" text,
	"cdr_status" varchar(4),
	"sunat_ticket" varchar(50),
	"sunat_estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"sunat_fecha_envio" timestamp,
	"sunat_fecha_respuesta" timestamp,
	"hash" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "instance_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mode" varchar(20) DEFAULT 'single' NOT NULL,
	"is_ose_homologated" boolean DEFAULT false NOT NULL,
	"ose_resolution_number" varchar(50),
	"ose_homologation_date" timestamp,
	"ose_sunat_username" varchar(100),
	"ose_sunat_password" text,
	"instance_name" varchar(255) DEFAULT 'Facturin' NOT NULL,
	"instance_url" varchar(500),
	"sunat_beta_wsdl_url" varchar(500),
	"sunat_prod_wsdl_url" varchar(500),
	"sunat_beta_rest_url" varchar(500),
	"sunat_prod_rest_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tipo_comprobante" varchar(2) NOT NULL,
	"serie" varchar(4) NOT NULL,
	"correlativo_actual" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sunat_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"comprobante_id" uuid,
	"tipo_operacion" varchar(50) NOT NULL,
	"ticket" varchar(50),
	"request_xml" text,
	"response_xml" text,
	"error_code" varchar(10),
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ruc" varchar(11) NOT NULL,
	"razon_social" varchar(255) NOT NULL,
	"nombre_comercial" varchar(255),
	"direccion" jsonb,
	"certificado_digital" text,
	"certificado_password" text,
	"sunat_username" varchar(100),
	"sunat_password" text,
	"contacto_email" varchar(255),
	"contacto_phone" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"max_documents_per_month" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_ruc_unique" UNIQUE("ruc")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" uuid NOT NULL,
	"evento" varchar(50) NOT NULL,
	"payload" jsonb NOT NULL,
	"response_status" integer,
	"response_body" text,
	"error_message" text,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"url" varchar(500) NOT NULL,
	"secret" varchar(255) NOT NULL,
	"eventos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comprobantes" ADD CONSTRAINT "comprobantes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "series" ADD CONSTRAINT "series_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sunat_logs" ADD CONSTRAINT "sunat_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sunat_logs" ADD CONSTRAINT "sunat_logs_comprobante_id_comprobantes_id_fk" FOREIGN KEY ("comprobante_id") REFERENCES "public"."comprobantes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
