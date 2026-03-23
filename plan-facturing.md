# Plan de Implementación: Servicio de Facturación Electrónica SUNAT

## Resumen Ejecutivo

Este documento presenta un plan completo para implementar un servicio de facturación electrónica SUNAT multi-tenant usando el stack tecnológico **Leon** (Bun + Elysia + React Router + Drizzle ORM). El servicio permitirá a usuarios crear cuentas, generar API Keys, y emitir facturas/boletas electrónicas válidas ante SUNAT.

La investigación se basa en el análisis de **xhandler-java** de Project OpenUBL, la documentación oficial de SUNAT, y estándares UBL 2.1.

---

## 1. Arquitectura General

### 1.1 Stack Tecnológico

| Componente | Tecnología | Uso |
|------------|-----------|-----|
| Runtime | Bun | Runtime JavaScript de alto rendimiento |
| Backend Framework | Elysia | API REST y WebSocket |
| Frontend | React Router v7 | Interfaz de administración |
| ORM | Drizzle ORM | Acceso a base de datos PostgreSQL |
| Background Jobs | Inngest | Procesamiento asíncrono de envíos SUNAT |
| Autenticación | Better Auth | JWT sessions, Bearer tokens, API Keys |
| Firma XML | xml-crypto o node-xml-sig | Firma digital de documentos XML |
| SOAP Client | soap o axios | Comunicación con servicios SUNAT |
| ZIP Compression | adm-zip | Compresión de XML + CDR |

### 1.2 Flujo de Datos

```
Usuario (Frontend)
    ↓
API REST (Elysia)
    ↓
Validación + Transformación
    ↓
Generación XML UBL 2.1
    ↓
Firma Digital (Certificado .pfx)
    ↓
Compresión ZIP
    ↓
Envío SOAP SUNAT (Inngest Job)
    ↓
Almacenamiento CDR + Estado
```

---

## 2. Estructura del XML UBL 2.1 (Basado en xhandler-java)

### 2.1 Tipos de Comprobantes Soportados

| Tipo | Código | Descripción |
|------|--------|-------------|
| Factura | 01 | Comprobante de pago para crédito fiscal |
| Boleta | 03 | Comprobante de pago simple |
| Nota de Crédito | 07 | Rectificación de factura/boleta |
| Nota de Débito | 08 | Incremento de valor |
| Guía de Remisión | 09 | Traslado de bienes |
| Retención | 20 | Comprobante de retención |
| Percepción | 40 | Comprobante de percepción |

### 2.2 Estructura del Invoice (Factura/Boleta)

```java
// Modelo basado en xhandler-java

Invoice {
  // Serie y número
  serie: String          // Ej: "F001" (Factura), "B001" (Boleta)
  numero: Integer        // Ej: 1, 2, 3...
  
  // Fechas
  fechaEmision: Date
  fechaVencimiento: Date // Opcional
  
  // Tipo de comprobante (Catálogo 01)
  tipoComprobante: String // "01" = Factura, "03" = Boleta
  
  // Tipo de operación (Catálogo 51)
  tipoOperacion: String   // "0101" = Venta interna
  
  // Forma de pago
  formaDePago: {
    tipo: String          // "Contado" o "Credito"
    cuotas: [{
      monto: Decimal
      fechaVencimiento: Date
    }]
  }
  
  // Proveedor (Emisor)
  proveedor: {
    ruc: String
    razonSocial: String
    nombreComercial: String
    direccion: Direccion
  }
  
  // Cliente (Adquirente)
  cliente: {
    tipoDocumento: String  // "6" = RUC, "1" = DNI
    numeroDocumento: String
    nombre: String
    direccion: Direccion   // Opcional
  }
  
  // Detalle de items
  detalles: [{
    codigoProducto: String
    descripcion: String
    cantidad: Decimal
    unidadMedida: String   // "NIU", "KGM", etc.
    precioUnitario: Decimal
    tipoPrecio: String     // "01" = Precio unitario (incluye IGV)
    tipoIGV: String        // "10" = Gravado, "20" = Exonerado
    igv: Decimal
    valorVenta: Decimal    // Valor sin IGV
    precioVenta: Decimal   // Valor con IGV
  }]
  
  // Totales
  totalImporte: {
    gravadas: Decimal
    inafectas: Decimal
    exoneradas: Decimal
    gratuitas: Decimal
    igv: Decimal
    isc: Decimal           // Opcional
    importeTotal: Decimal
  }
  
  // Leyendas (requerido para SUNAT)
  leyendas: [{
    codigo: String         // "1000" = Monto en letras
    valor: String
  }]
  
  // Campos opcionales
  observaciones: String
  ordenDeCompra: String
  guiasRemision: [{
    tipo: String
    serieNumero: String
  }]
  detraccion: Detraccion   // Si aplica
  percepcion: Percepcion   // Si aplica
}
```

### 2.3 Namespaces XML UBL 2.1

```xml
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
```

---

## 3. Servicios SUNAT

### 3.1 Endpoints SOAP

#### Ambiente BETA (Pruebas)

| Servicio | URL WSDL |
|----------|----------|
| Factura | `https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl` |
| Retenciones/Percepciones | `https://e-beta.sunat.gob.pe/ol-ti-itemision-otroscpe-gem-beta/billService?wsdl` |

#### Ambiente Producción

| Servicio | URL WSDL |
|----------|----------|
| Factura | `https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService?wsdl` |
| Retenciones/Percepciones | `https://e-factura.sunat.gob.pe/ol-ti-itemision-otroscpe-gem/billService?wsdl` |

### 3.2 Servicios de Consulta

| Servicio | URL WSDL | Descripción |
|----------|----------|-------------|
| Validación | `https://e-factura.sunat.gob.pe/ol-it-wsconsvalidcpe/billValidService?wsdl` | Validar XML |
| Consulta CDR | `https://e-factura.sunat.gob.pe/ol-it-wsconscpegem/billConsultService?wsdl` | Consultar estado |

### 3.3 Operaciones SOAP

```java
// Basado en BillServiceDestination.java

enum SoapOperation {
    SEND_BILL("sendBill"),      // Enviar factura/boleta individual
    SEND_SUMMARY("sendSummary"), // Enviar resumen diario de boletas
    SEND_PACK("sendPack"),       // Enviar paquete de boletas
    GET_STATUS("getStatus");     // Consultar estado con ticket
}

// Métodos:
sendBill(fileName: String, contentFile: byte[]): String  // Retorna ticket
sendSummary(fileName: String, contentFile: byte[]): String
sendPack(fileName: String, contentFile: byte[]): String
getStatus(ticket: String): StatusResponse
```

### 3.4 Formato de Envío

1. **Generar XML UBL 2.1** según especificación
2. **Firmar digitalmente** el XML con certificado .pfx
3. **Comprimir en ZIP** el XML firmado
4. **Enviar vía SOAP** usando sendBill/sendSummary
5. **Recibir Ticket** como acuse de recepción
6. **Consultar CDR** con getStatus usando el ticket

---

## 4. Modelo de Datos (Drizzle ORM)

### 4.1 Entidades Principales

```typescript
// Organizations (Multi-tenant)
organizations {
  id: uuid
  ruc: string(11) unique          // RUC del contribuyente
  razonSocial: string
  nombreComercial: string
  direccion: jsonb
  certificadoDigital: bytea       // .pfx encriptado
  certificadoPassword: string     // Encriptado
  sunatUsername: string           // Usuario SOL
  sunatPassword: string           // Encriptado
  ambiente: enum('beta', 'produccion')
  estado: enum('activo', 'suspendido')
  createdAt: timestamp
  updatedAt: timestamp
}

// API Keys
apiKeys {
  id: uuid
  organizationId: uuid -> organizations
  name: string
  key: string unique              // Bearer token
  permissions: jsonb              // ["invoices:write", "invoices:read"]
  lastUsedAt: timestamp
  expiresAt: timestamp
  isActive: boolean
  createdAt: timestamp
}

// Comprobantes (CPE)
comprobantes {
  id: uuid
  organizationId: uuid -> organizations
  tipoComprobante: string(2)      // "01", "03", "07", "08"
  serie: string(4)                // "F001", "B001"
  numero: integer
  fechaEmision: date
  fechaVencimiento: date?
  
  // Cliente
  clienteTipoDocumento: string
  clienteNumeroDocumento: string
  clienteNombre: string
  clienteDireccion: jsonb?
  
  // Totales
  moneda: string(3)               // "PEN", "USD"
  totalGravadas: decimal
  totalInafectas: decimal
  totalExoneradas: decimal
  totalIgv: decimal
  totalImporte: decimal
  
  // XML y CDR
  xmlContent: text                // XML firmado
  cdrContent: bytea?              // CDR ZIP recibido de SUNAT
  cdrStatus: string?              // "0" = Aceptado, otros = Rechazado
  cdrObservaciones: text?
  
  // SUNAT
  sunatTicket: string?
  sunatEstado: enum('pendiente', 'enviado', 'aceptado', 'rechazado', 'observado')
  sunatFechaEnvio: timestamp?
  sunatFechaRespuesta: timestamp?
  
  // Metadatos
  leyendas: jsonb
  formaPago: jsonb?
  detalles: jsonb                  // Array de items
  createdAt: timestamp
  updatedAt: timestamp
  
  indexes: [
    unique(organizationId, tipoComprobante, serie, numero)
  ]
}

// Detalle de Items (denormalizado en comprobantes.detalles)
detalleItem {
  codigoProducto: string
  descripcion: string
  unidadMedida: string
  cantidad: decimal
  precioUnitario: decimal
  tipoPrecio: string
  tipoIGV: string
  igv: decimal
  valorVenta: decimal
  precioVenta: decimal
}

// Log de Envíos SUNAT
sunatLogs {
  id: uuid
  comprobanteId: uuid -> comprobantes
  tipoOperacion: string           // "sendBill", "getStatus"
  requestXml: text?               // SOAP Request
  responseXml: text?              // SOAP Response
  ticket: string?
  errorCode: string?
  errorMessage: string?
  createdAt: timestamp
}

// Series y Correlativos
series {
  id: uuid
  organizationId: uuid -> organizations
  tipoComprobante: string
  serie: string(4)
  correlativoActual: integer      // Último número usado
  correlativoInicial: integer     // Desde dónde empezar
  isActive: boolean
  createdAt: timestamp
  
  indexes: [
    unique(organizationId, tipoComprobante, serie)
  ]
}
```

---

## 5. API REST (Elysia)

### 5.1 Endpoints

```typescript
// Autenticación (Better Auth)
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/register
GET    /api/auth/session

// API Keys (protegido)
GET    /api/api-keys
POST   /api/api-keys              // Crear nueva API Key
DELETE /api/api-keys/:id

// Comprobantes (protegido por Bearer Token)
POST   /api/v1/invoices           // Crear factura
POST   /api/v1/boletas            // Crear boleta
POST   /api/v1/notas-credito      // Crear nota de crédito
POST   /api/v1/notas-debito       // Crear nota de débito

GET    /api/v1/comprobantes       // Listar comprobantes
GET    /api/v1/comprobantes/:id   // Obtener detalle
GET    /api/v1/comprobantes/:id/xml    // Descargar XML
GET    /api/v1/comprobantes/:id/cdr    // Descargar CDR
GET    /api/v1/comprobantes/:id/pdf    // Generar PDF (opcional)

// Series
GET    /api/v1/series
POST   /api/v1/series             // Crear nueva serie
PUT    /api/v1/series/:id

// Consultas SUNAT
POST   /api/v1/consultas/estado   // Consultar estado con ticket
POST   /api/v1/consultas/validar  // Validar XML

// Webhooks
POST   /api/v1/webhooks           // Configurar webhook para notificaciones
```

### 5.2 Request/Response Examples

#### Crear Factura

```http
POST /api/v1/invoices
Authorization: Bearer sk_live_xxxxxxxx
Content-Type: application/json

{
  "serie": "F001",
  "numero": null,              // Auto-generado si es null
  "fechaEmision": "2024-01-15",
  "fechaVencimiento": "2024-02-15",
  "tipoOperacion": "0101",
  
  "cliente": {
    "tipoDocumento": "6",      // RUC
    "numeroDocumento": "20100454523",
    "nombre": "CLIENTE SAC",
    "direccion": {
      "direccion": "Av. Principal 123",
      "departamento": "LIMA",
      "provincia": "LIMA",
      "distrito": "MIRAFLORES",
      "ubigeo": "150101"
    }
  },
  
  "formaPago": {
    "tipo": "Credito",
    "cuotas": [
      {
        "monto": 3500.00,
        "fechaVencimiento": "2024-02-15"
      }
    ]
  },
  
  "detalles": [
    {
      "codigoProducto": "PROD001",
      "descripcion": "Producto de ejemplo",
      "unidadMedida": "NIU",
      "cantidad": 2,
      "precioUnitario": 100.00,
      "tipoPrecio": "01",
      "tipoIGV": "10"
    }
  ],
  
  "observaciones": "Orden de compra: OC-001"
}
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tipoComprobante": "01",
  "serie": "F001",
  "numero": 125,
  "fechaEmision": "2024-01-15",
  "cliente": {
    "nombre": "CLIENTE SAC",
    "numeroDocumento": "20100454523"
  },
  "totalImporte": 236.00,
  "moneda": "PEN",
  "sunatEstado": "pendiente",
  "xmlUrl": "/api/v1/comprobantes/550e8400/xml",
  "pdfUrl": "/api/v1/comprobantes/550e8400/pdf",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## 6. Firma Digital XML

### 6.1 Requisitos

- Certificado digital en formato **.pfx** o **.p12**
- Estándar **X.509 v3**
- Algoritmo de firma: **RSA-SHA256**
- Canonicalización: **Exclusive XML Canonicalization (C14N)**
- Transformación: **Enveloped Signature**

### 6.2 Implementación en Node.js/Bun

```typescript
// Opción 1: xml-crypto
import { SignedXml } from 'xml-crypto';

function firmarXML(xml: string, certificado: Buffer, password: string): string {
  const sig = new SignedXml({
    privateKey: certificado,  // Desencriptado con password
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
  });
  
  sig.addReference({
    xpath: "//*[local-name(.)='Invoice']",
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#'
    ]
  });
  
  sig.computeSignature(xml);
  return sig.getSignedXml();
}

// Opción 2: node-xml-sig (más alto nivel)
import * as xmlsig from 'node-xml-sig';

const signedXml = await xmlsig.sign(xml, {
  privateKey: privateKeyPem,
  publicCert: certPem,
  signatureId: 'Signature',
  referenceUri: ''  // Empty = whole document
});
```

### 6.3 Estructura de la Firma

```xml
<ext:UBLExtensions>
  <ext:UBLExtension>
    <ext:ExtensionContent>
      <ds:Signature Id="Signature">
        <ds:SignedInfo>
          <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
          <ds:Reference URI="">
            <ds:Transforms>
              <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
              <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
            </ds:Transforms>
            <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
            <ds:DigestValue>ABC123...</ds:DigestValue>
          </ds:Reference>
        </ds:SignedInfo>
        <ds:SignatureValue>DEF456...</ds:SignatureValue>
        <ds:KeyInfo>
          <ds:X509Data>
            <ds:X509Certificate>MIID...</ds:X509Certificate>
          </ds:X509Data>
        </ds:KeyInfo>
      </ds:Signature>
    </ext:ExtensionContent>
  </ext:UBLExtension>
</ext:UBLExtensions>
```

---

## 7. Envío SOAP a SUNAT

### 7.1 Cliente SOAP

```typescript
// Usando la librería 'soap'
import * as soap from 'soap';

class SunatClient {
  private client: soap.Client;
  
  constructor(
    private wsdlUrl: string,
    private username: string,
    private password: string
  ) {}
  
  async initialize(): Promise<void> {
    this.client = await soap.createClientAsync(this.wsdlUrl);
    // Set auth headers
    this.client.setSecurity(new soap.BasicAuthSecurity(
      this.username,
      this.password
    ));
  }
  
  async sendBill(
    fileName: string,
    contentFile: Buffer
  ): Promise<{ ticket: string }> {
    const args = {
      fileName,
      contentFile: contentFile.toString('base64')
    };
    
    const [result] = await this.client.sendBillAsync(args);
    return { ticket: result.applicationResponse };
  }
  
  async getStatus(ticket: string): Promise<{
    statusCode: string;
    statusMessage: string;
    content: Buffer;  // ZIP con CDR
  }> {
    const args = { ticket };
    const [result] = await this.client.getStatusAsync(args);
    
    return {
      statusCode: result.status.statusCode,
      statusMessage: result.status.statusMessage,
      content: Buffer.from(result.content, 'base64')
    };
  }
}
```

### 7.2 Flujo de Envío (Inngest)

```typescript
// Inngest Function
import { inngest } from './inngest/client';

export const enviarComprobanteSunat = inngest.createFunction(
  { 
    id: 'enviar-comprobante-sunat',
    retries: 3,
    concurrency: 10
  },
  { event: 'comprobante/creado' },
  async ({ event, step }) => {
    const { comprobanteId, organizationId } = event.data;
    
    // 1. Obtener datos
    const org = await step.run('get-organization', async () => {
      return await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId)
      });
    });
    
    const comprobante = await step.run('get-comprobante', async () => {
      return await db.query.comprobantes.findFirst({
        where: eq(comprobantes.id, comprobanteId)
      });
    });
    
    // 2. Generar XML si no existe
    const xml = await step.run('generar-xml', async () => {
      return await generarXMLUBL(comprobante);
    });
    
    // 3. Firmar XML
    const xmlFirmado = await step.run('firmar-xml', async () => {
      const cert = descifrarCertificado(org.certificadoDigital);
      return await firmarXML(xml, cert, org.certificadoPassword);
    });
    
    // 4. Comprimir en ZIP
    const zipBuffer = await step.run('comprimir-zip', async () => {
      const zip = new AdmZip();
      const fileName = `${org.ruc}-${comprobante.tipoComprobante}-${comprobante.serie}-${String(comprobante.numero).padStart(8, '0')}.xml`;
      zip.addFile(fileName, Buffer.from(xmlFirmado));
      return zip.toBuffer();
    });
    
    // 5. Enviar a SUNAT
    const envioResult = await step.run('enviar-sunat', async () => {
      const client = new SunatClient(
        org.ambiente === 'beta' 
          ? SUNAT_BETA_WSDL 
          : SUNAT_PROD_WSDL,
        org.sunatUsername,
        org.sunatPassword
      );
      await client.initialize();
      
      const fileName = `${org.ruc}-${comprobante.tipoComprobante}-${comprobante.serie}-${String(comprobante.numero).padStart(8, '0')}.zip`;
      return await client.sendBill(fileName, zipBuffer);
    });
    
    // 6. Actualizar con ticket
    await step.run('guardar-ticket', async () => {
      await db.update(comprobantes)
        .set({
          sunatTicket: envioResult.ticket,
          sunatEstado: 'enviado',
          sunatFechaEnvio: new Date(),
          xmlContent: xmlFirmado
        })
        .where(eq(comprobantes.id, comprobanteId));
    });
    
    // 7. Programar consulta de CDR (async)
    await step.sendEvent('consultar-cdr', {
      name: 'comprobante/consultar-cdr',
      data: { 
        comprobanteId,
        organizationId,
        ticket: envioResult.ticket
      }
    });
    
    return { success: true, ticket: envioResult.ticket };
  }
);

// Consultar CDR (función separada)
export const consultarCDR = inngest.createFunction(
  { id: 'consultar-cdr', retries: 5 },
  { event: 'comprobante/consultar-cdr' },
  async ({ event, step }) => {
    const { comprobanteId, organizationId, ticket } = event.data;
    
    // Esperar antes de consultar (SUNAT necesita tiempo)
    await step.sleep('wait-sunat', '30s');
    
    const org = await step.run('get-org', async () => {
      return await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId)
      });
    });
    
    const status = await step.run('consultar-status', async () => {
      const client = new SunatClient(
        org.ambiente === 'beta' ? SUNAT_BETA_WSDL : SUNAT_PROD_WSDL,
        org.sunatUsername,
        org.sunatPassword
      );
      await client.initialize();
      return await client.getStatus(ticket);
    });
    
    // Parsear CDR
    const cdr = await step.run('procesar-cdr', async () => {
      const zip = new AdmZip(status.content);
      const entries = zip.getEntries();
      const cdrEntry = entries.find(e => e.entryName.endsWith('.xml'));
      return cdrEntry ? zip.readAsText(cdrEntry) : null;
    });
    
    // Actualizar estado
    const estado = status.statusCode === '0' 
      ? 'aceptado' 
      : status.statusCode.startsWith('1') 
        ? 'observado' 
        : 'rechazado';
    
    await step.run('actualizar-estado', async () => {
      await db.update(comprobantes)
        .set({
          sunatEstado: estado,
          cdrContent: status.content,
          cdrStatus: status.statusCode,
          cdrObservaciones: status.statusMessage,
          sunatFechaRespuesta: new Date()
        })
        .where(eq(comprobantes.id, comprobanteId));
    });
    
    // Notificar vía webhook
    await step.run('notificar-webhook', async () => {
      await notificarWebhook(organizationId, {
        event: 'comprobante.actualizado',
        data: {
          comprobanteId,
          estado,
          ticket
        }
      });
    });
    
    return { success: true, estado };
  }
);
```

---

## 8. Catálogos SUNAT (Referencias)

### Catálogo 01: Tipo de Documento
- 01: Factura
- 03: Boleta de Venta
- 07: Nota de Crédito
- 08: Nota de Débito
- 09: Guía de Remisión
- 20: Retención
- 40: Percepción

### Catálogo 06: Tipo de Documento de Identidad
- 0: Doc. Trib. No Dom. Sin RUC
- 1: DNI
- 4: Carnet de Extranjería
- 6: RUC
- 7: Pasaporte

### Catálogo 07: Tipo de Afectación IGV
- 10: Gravado - Operación Onerosa
- 11: Gravado - Retiro por premio
- 12: Gravado - Retiro por donación
- 20: Exonerado - Operación Onerosa
- 30: Inafecto - Operación Onerosa

### Catálogo 16: Tipo de Precio
- 01: Precio unitario (incluye IGV)
- 02: Valor referencial unitario (incluye IGV)

### Catálogo 51: Tipo de Operación
- 0101: Venta interna
- 0200: Exportación de bienes
- 0401: Venta no domiciliado

---

## 9. Tareas de Implementación (Phases)

### Fase 1: Fundamentos (Semana 1-2)

- [ ] Setup proyecto con Leon skill (Bun monorepo + RR7)
- [ ] Configurar Drizzle ORM y migraciones iniciales
- [ ] Setup Better Auth (login, sessions, API Keys)
- [ ] Setup Inngest para background jobs
- [ ] Crear esquema de base de datos

### Fase 2: Core de Facturación (Semana 3-4)

- [ ] Implementar modelos de dominio (Invoice, Boleta, etc.)
- [ ] Crear generador de XML UBL 2.1
- [ ] Implementar firma digital con certificados .pfx
- [ ] Crear validadores de datos SUNAT
- [ ] Tests unitarios del core

### Fase 3: Integración SUNAT (Semana 5-6)

- [ ] Implementar cliente SOAP SUNAT
- [ ] Crear jobs Inngest para envío asíncrono
- [ ] Implementar consulta de CDR
- [ ] Manejo de errores y reintentos
- [ ] Tests de integración con ambiente BETA

### Fase 4: API REST (Semana 7-8)

- [ ] Crear endpoints REST (POST /invoices, etc.)
- [ ] Implementar autenticación Bearer Token
- [ ] Rate limiting y quotas
- [ ] Validación de requests
- [ ] Documentación API (OpenAPI/Swagger)

### Fase 5: Frontend (Semana 9-10)

- [ ] Dashboard de organizaciones
- [ ] Gestión de API Keys
- [ ] Listado de comprobantes
- [ ] Formulario de emisión manual
- [ ] Vista de detalle con XML/CDR

### Fase 6: Producción (Semana 11-12)

- [ ] Configuración de certificados SSL
- [ ] Monitoreo y logging
- [ ] Tests de carga
- [ ] Documentación de deploy
- [ ] Go-live

---

## 10. Recursos y Referencias

### Documentación SUNAT
- Portal CPE: https://cpe.sunat.gob.pe
- Guías y Manuales: https://cpe.sunat.gob.pe/guias-y-manuales
- Manual del Programador: [PDF](https://cpe.sunat.gob.pe/sites/default/files/inline-files/manual_programador%20%281%29.pdf)
- Servicios Web disponibles: [PDF](https://cpe.sunat.gob.pe/sites/default/files/inline-files/servicios%20web%20disponibles%20%281%29.pdf)

### Project OpenUBL (Referencia Java)
- GitHub: https://github.com/project-openubl/xhandler-java
- Documentación: https://project-openubl.github.io/docs/xbuilder/

### Especificaciones Técnicas
- UBL 2.1: http://docs.oasis-open.org/ubl/UBL-2.1.html
- XML Signature: https://www.w3.org/TR/xmldsig-core/

### Librerías Node.js/Bun Relevantes
- `xml-crypto`: Firma digital XML
- `soap`: Cliente SOAP
- `fast-xml-parser`: Parseo XML
- `adm-zip`: Compresión ZIP
- `node-forge`: Manejo de certificados

---

## 11. Consideraciones de Seguridad

1. **Certificados digitales**: Almacenar encriptados en base de datos
2. **Contraseñas**: Nunca loggear, usar encriptación fuerte
3. **API Keys**: Rotación periódica, scope limitado
4. **Rate limiting**: Prevenir abuso del servicio
5. **Validación**: Sanitizar todas las entradas
6. **Logs**: No incluir datos sensibles (passwords, certificados)
7. **HTTPS**: Todo el tráfico debe ser TLS 1.2+
8. **Auditoría**: Loggear todas las operaciones SUNAT

---

## 12. Costos y Proveedores

### Certificados Digitales
- **Girasol.pe**: S/ 130-220/año (dependiendo del régimen)
- **Certicámara**: Precios similares
- Requisitos: Poder vigente + DNI representante legal

### Infraestructura
- Servidor: $20-50/mes (VPS con Bun)
- Base de datos: PostgreSQL (local o managed)
- Inngest: Free tier (10,000 events/mes) → $20/mes para producción

---

## Anexos

### A. Estructura del Proyecto

```
packages/
├── api/                    # Elysia API
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   └── db/
│   └── package.json
├── web/                    # React Router frontend
│   └── app/
├── ubl-builder/            # Librería generación XML
│   ├── src/
│   │   ├── models/
│   │   ├── templates/
│   │   └── signature/
│   └── package.json
└── sunat-client/           # Cliente SOAP SUNAT
    └── src/
        ├── client.ts
        └── types.ts
```

### B. Ejemplo XML Completo

Ver archivo: `tmp/xhandler-java/xbuilder/core/src/test/resources/e2e/renderer/invoice/InvoiceTest/MinData_RUC.xml`

---

**Documento generado**: 2026-03-21
**Versión**: 1.0
**Investigación basada en**: xhandler-java v3.x, SUNAT docs 2024
