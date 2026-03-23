# Task 7: Background Jobs (Inngest)

## Objetivo
Implementar sistema de jobs asíncronos usando Inngest para envío a SUNAT y consulta de CDR.

## Entregables
- [ ] Configuración de Inngest client
- [ ] Job: `enviar-comprobante-sunat`
- [ ] Job: `consultar-cdr`
- [ ] Job: `notificar-webhook`
- [ ] Retry logic y manejo de errores
- [ ] Monitoreo de jobs

## Eventos Definidos

```typescript
// apps/api/src/inngest/events.ts

export type Events = {
  'comprobante/creado': {
    data: {
      comprobanteId: string;
      organizationId: string;
    };
  };
  
  'comprobante/consultar-cdr': {
    data: {
      comprobanteId: string;
      organizationId: string;
      ticket: string;
    };
  };
  
  'comprobante/webhook': {
    data: {
      organizationId: string;
      event: string;
      payload: Record<string, unknown>;
    };
  };
};
```

## Job: Enviar Comprobante

```typescript
// apps/api/src/inngest/functions/enviar-comprobante.ts

export const enviarComprobanteSunat = inngest.createFunction(
  {
    id: 'enviar-comprobante-sunat',
    name: 'Enviar Comprobante a SUNAT',
    retries: 3,
    concurrency: { limit: 10 },
  },
  { event: 'comprobante/creado' },
  async ({ event, step }) => {
    const { comprobanteId, organizationId } = event.data;

    // 1. Obtener datos
    const org = await step.run('get-organization', () =>
      orgRepo.findById(organizationId)
    );
    
    const comprobante = await step.run('get-comprobante', () =>
      comprobanteRepo.findById(comprobanteId)
    );

    // 2. Generar XML
    const xml = await step.run('generar-xml', () =>
      xmlBuilder.generarInvoiceXML(comprobante, org)
    );

    // 3. Firmar XML
    const xmlFirmado = await step.run('firmar-xml', () =>
      xmlSigner.firmarXML(xml, org.certificadoDigital, org.certificadoPassword)
    );

    // 4. Enviar a SUNAT
    const envioResult = await step.run('enviar-sunat', async () => {
      const client = new SunatClient({
        ambiente: org.ambiente,
        username: org.sunatUsername,
        password: org.sunatPassword,
      });
      await client.initialize();
      
      const fileName = `${org.ruc}-${comprobante.tipoComprobante}-${comprobante.serie}-${String(comprobante.numero).padStart(8, '0')}.xml`;
      
      return client.sendBill(fileName, xmlFirmado);
    });

    // 5. Guardar ticket y programar consulta CDR
    if (envioResult.success) {
      await step.run('guardar-ticket', () =>
        comprobanteRepo.updateTicket(comprobanteId, envioResult.ticket, xmlFirmado)
      );

      // Esperar antes de consultar
      await step.sleep('wait-sunat', '30s');
      
      await step.sendEvent('consultar-cdr', {
        name: 'comprobante/consultar-cdr',
        data: { comprobanteId, organizationId, ticket: envioResult.ticket },
      });
    } else {
      await step.run('marcar-error', () =>
        comprobanteRepo.updateEstado(comprobanteId, 'rechazado', envioResult.errorMessage)
      );
    }

    return { success: envioResult.success, ticket: envioResult.ticket };
  }
);
```

## Job: Consultar CDR

```typescript
// apps/api/src/inngest/functions/consultar-cdr.ts

export const consultarCDR = inngest.createFunction(
  {
    id: 'consultar-cdr',
    name: 'Consultar CDR en SUNAT',
    retries: 5,
    concurrency: { limit: 5 },
  },
  { event: 'comprobante/consultar-cdr' },
  async ({ event, step }) => {
    const { comprobanteId, organizationId, ticket } = event.data;

    const org = await step.run('get-org', () =>
      orgRepo.findById(organizationId)
    );

    const status = await step.run('consultar-status', async () => {
      const client = new SunatClient({
        ambiente: org.ambiente,
        username: org.sunatUsername,
        password: org.sunatPassword,
      });
      await client.initialize();
      return client.getStatus(ticket);
    });

    // Determinar estado
    const estado = status.statusCode === '0' ? 'aceptado' 
      : status.statusCode === '98' ? 'enviado'  // Reintentar
      : 'rechazado';

    await step.run('actualizar-estado', () =>
      comprobanteRepo.updateCdr(comprobanteId, estado, status.content, status.statusMessage)
    );

    // Notificar webhook
    await step.run('notificar-webhook', async () => {
      if (org.webhookUrl) {
        await fetch(org.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'comprobante.actualizado',
            data: { comprobanteId, estado, ticket },
          }),
        });
      }
    });

    // Si está en proceso, reintentar
    if (status.statusCode === '98') {
      await step.sleep('reintentar', '5m');
      await step.sendEvent('reconsultar-cdr', {
        name: 'comprobante/consultar-cdr',
        data: { comprobanteId, organizationId, ticket },
      });
    }

    return { success: true, estado };
  }
);
```

## Configuración Inngest

```typescript
// apps/api/src/inngest/client.ts

import { Inngest } from 'inngest';
import type { Events } from './events';

export const inngest = new Inngest({
  id: 'facturin-api',
  schemas: { events: {} as Events },
});

// Route handler para Inngest
// POST /api/inngest
```

## Criterios de Aceptación
- [ ] Jobs se ejecutan automáticamente al crear comprobante
- [ ] Retry funciona en errores temporales
- [ ] Consulta CDR espera y reintenta si status=98
- [ ] Webhooks se llaman correctamente
- [ ] Dashboard de Inngest muestra jobs

## Bloquea
Task 8 (API endpoints disparan estos jobs)

## Bloqueado Por
Task 2, Task 6

## Estimación
4-5 horas
