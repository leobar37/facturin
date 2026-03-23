# Task 6: SUNAT SOAP Client

## Objetivo
Implementar cliente SOAP para comunicación con servicios SUNAT (billService).

## Entregables
- [ ] Cliente SOAP para envío de comprobantes (sendBill)
- [ ] Cliente SOAP para consulta de CDR (getStatus)
- [ ] Compresión ZIP de documentos
- [ ] Manejo de autenticación WSSE (UsernameToken)
- [ ] Parseo de respuestas CDR

## Endpoints SUNAT

### Ambiente Beta
```
Facturas/Boletas: https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl
Retenciones:      https://e-beta.sunat.gob.pe/ol-ti-itemision-otroscpe-gem-beta/billService?wsdl
```

### Ambiente Producción
```
Facturas/Boletas: https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService?wsdl
Retenciones:      https://e-factura.sunat.gob.pe/ol-ti-itemision-otroscpe-gem/billService?wsdl
```

## Implementación

```typescript
// apps/api/src/services/infrastructure/sunat-client.ts

import * as soap from 'soap';
import { AdmZip } from 'adm-zip';

interface SunatConfig {
  ambiente: 'beta' | 'produccion';
  username: string;  // RUC + Usuario SOL
  password: string;  // Clave SOL
}

export class SunatClient {
  private client: soap.Client | null = null;

  constructor(private config: SunatConfig) {}

  async initialize(): Promise<void> {
    const wsdlUrl = this.getWsdlUrl();
    this.client = await soap.createClientAsync(wsdlUrl, {
      request: { timeout: 60000 },
    });

    // Configurar WSSE (UsernameToken)
    this.client.setSecurity(
      new soap.WSSecurity(this.config.username, this.config.password, {
        passwordType: 'PasswordText',
        hasTimeStamp: false,
      })
    );
  }

  async sendBill(fileName: string, xmlFirmado: string): Promise<SendBillResult> {
    // 1. Comprimir XML en ZIP
    const zipBuffer = this.createZip(fileName, xmlFirmado);

    // 2. Enviar a SUNAT
    const [result] = await this.client!.sendBillAsync({
      fileName: fileName.replace('.xml', '.zip'),
      contentFile: zipBuffer.toString('base64'),
    });

    // 3. Retornar ticket
    return {
      success: true,
      ticket: result.applicationResponse,
    };
  }

  async getStatus(ticket: string): Promise<StatusResult> {
    const [result] = await this.client!.getStatusAsync({ ticket });

    return {
      statusCode: result.status.statusCode,
      statusMessage: result.status.statusMessage,
      content: result.content
        ? Buffer.from(result.content, 'base64')
        : null,
    };
  }

  private createZip(fileName: string, xmlContent: string): Buffer {
    const zip = new AdmZip();
    zip.addFile(fileName, Buffer.from(xmlContent, 'utf-8'));
    return zip.toBuffer();
  }
}

// Interfaces
interface SendBillResult {
  success: boolean;
  ticket: string;
  errorCode?: string;
  errorMessage?: string;
}

interface StatusResult {
  statusCode: string;  // 0 = Aceptado, 98 = En proceso, 99 = Errores
  statusMessage: string;
  content: Buffer | null;  // ZIP con CDR
}
```

## Códigos de Estado

| Código | Significado | Acción |
|--------|-------------|--------|
| 0 | PROCESO_CORRECTAMENTE | CDR recibido, procesar respuesta |
| 98 | EN_PROCESO | Esperar y reintentar |
| 99 | PROCESO_CON_ERRORES | CDR con errores, revisar observaciones |

## Manejo de CDR

```typescript
// Extraer CDR del ZIP
function extractCDR(zipBuffer: Buffer): CDRData {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  
  const cdrEntry = entries.find(e => 
    e.entryName.toLowerCase().includes('cdr') &&
    e.entryName.toLowerCase().endsWith('.xml')
  );
  
  if (!cdrEntry) throw new Error('CDR no encontrado en ZIP');
  
  const xml = zip.readAsText(cdrEntry);
  
  // Parsear XML del CDR
  return parseCDRXml(xml);
}
```

## Criterios de Aceptación
- [ ] Conexión SOAP exitosa con SUNAT beta
- [ ] Envío de comprobante retorna ticket
- [ ] Consulta de estado retorna CDR
- [ ] Manejo de errores SOAP (faults)
- [ ] Reintentos automáticos configurables
- [ ] Timeout de 60s funciona correctamente

## Bloquea
Task 7 (background jobs usan este cliente)

## Bloqueado Por
Task 1, Task 5

## Estimación
4-5 horas
