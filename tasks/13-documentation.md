# Task 13: Documentation & Homologación Guide

## Objetivo
Crear documentación completa y guía de homologación SUNAT.

## Entregables
- [ ] README principal del proyecto
- [ ] Guía de instalación paso a paso
- [ ] Guía de homologación SUNAT
- [ ] API Documentation (OpenAPI/Swagger)
- [ ] SDK Documentation
- [ ] Tutorial de uso básico
- [ ] FAQ
- [ ] Contributing guidelines

## README.md Principal

```markdown
# Facturin

Sistema de facturación electrónica open source para Perú (SUNAT).

## 🚀 Características

- ✅ Facturas, boletas, notas de crédito/débito
- ✅ Firma digital con certificados SUNAT
- ✅ Envío automático a SUNAT vía SOAP
- ✅ API REST completa
- ✅ SDK JavaScript/TypeScript
- ✅ Self-hosted (tú controlas tus datos)
- ✅ Open source (licencia MIT)

## 📦 Instalación Rápida

```bash
npx facturin init mi-empresa
cd mi-empresa
npx facturin start
```

## 🏗️ Arquitectura

- **Backend:** Elysia (Bun) + Drizzle ORM + PostgreSQL
- **Frontend:** React Router v7 + TailwindCSS
- **Jobs:** Inngest (background processing)
- **SDK:** TypeScript con tipos completos

## 📚 Documentación

- [Guía de Instalación](docs/installation.md)
- [Guía de Homologación SUNAT](docs/homologacion.md)
- [API Reference](docs/api.md)
- [SDK Documentation](docs/sdk.md)

## 🛠️ Contribuir

Ver [CONTRIBUTING.md](CONTRIBUTING.md)

## 📄 Licencia

MIT
```

## Guía de Homologación

```markdown
# Guía de Homologación SUNAT

La homologación es el proceso por el cual SUNAT verifica que tu sistema puede emitir comprobantes electrónicos correctamente.

## Paso 1: Prerrequisitos

- [ ] RUC activo y habido
- [ ] Inscrito en SEE (Sistema de Emisión Electrónica)
- [ ] Certificado digital (.pfx)
- [ ] Usuario SOL secundario creado

## Paso 2: Configurar Facturin

1. Abre http://localhost:3001
2. Crea cuenta de administrador
3. Ve a Configuración > SUNAT
4. Ingresa:
   - RUC
   - Usuario SOL
   - Contraseña SOL
   - Certificado digital (.pfx)
   - Contraseña del certificado

## Paso 3: Solicitar Homologación

1. En Facturin, ve a "Homologación"
2. Click "Solicitar Homologación"
3. El sistema se conecta a SUNAT y solicita casos de prueba
4. SUNAT te asignará series de prueba (ej: FF11, BB11)

## Paso 4: Completar Casos de Prueba

SUNAT te pedirá emitir:

### Grupo 1: Facturas (Serie FF11)
- [ ] FF11-1: Factura simple, cliente con RUC
- [ ] FF11-2: Factura con descuento global
- [ ] FF11-3: Factura con múltiples ítems

### Grupo 2: Boletas (Serie BB11)  
- [ ] BB11-1: Boleta simple, cliente con DNI
- [ ] BB11-2: Boleta inafecta

### Grupo 3: Notas (Series FC11, FD11)
- [ ] FC11-1: Nota de crédito anulando FF11-1
- [ ] FD11-1: Nota de débito aumentando valor

## Paso 5: Enviar a SUNAT

En Facturin:
1. Ve a "Homologación"
2. Click "Enviar a SUNAT"
3. El sistema enviará automáticamente todos los documentos al ambiente beta

## Paso 6: Esperar Aprobación

- Tiempo: 3-5 días hábiles
- SUNAT revisa que todos los documentos estén correctos
- Si hay errores, te notifican y debes corregir

## Paso 7: Aprobación

Una vez aprobado:
1. Puedes emitir comprobantes reales
2. Cambia ambiente de "beta" a "producción"
3. Empieza a facturar!

## ❌ Errores Comunes

### "El XML no contiene firma digital"
- **Causa:** Certificado no cargado correctamente
- **Solución:** Revisa configuración del certificado

### "IGV no cuadra"
- **Causa:** Error en cálculos
- **Solución:** Facturin calcula automáticamente, revisa precios ingresados

### "Serie no corresponde"
- **Causa:** Usaste serie incorrecta
- **Solución:** Usa exactamente la serie asignada por SUNAT
```

## API Documentation (OpenAPI)

```yaml
# docs/openapi.yaml

openapi: 3.0.0
info:
  title: Facturin API
  version: 1.0.0
  description: API para emisión de comprobantes electrónicos

paths:
  /api/v1/facturas:
    post:
      summary: Crear factura
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CrearFacturaInput'
      responses:
        201:
          description: Factura creada
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Comprobante'

components:
  schemas:
    CrearFacturaInput:
      type: object
      required:
        - cliente
        - detalles
      properties:
        serie:
          type: string
          example: "F001"
        cliente:
          $ref: '#/components/schemas/ClienteInput'
        detalles:
          type: array
          items:
            $ref: '#/components/schemas/DetalleInput'

    Comprobante:
      type: object
      properties:
        id:
          type: string
        tipoComprobante:
          type: string
          example: "01"
        serie:
          type: string
          example: "F001"
        numero:
          type: integer
          example: 125
        sunatEstado:
          type: string
          enum: [pendiente, enviado, aceptado, rechazado]
```

## SDK Examples

```markdown
# SDK Documentation

## Instalación

```bash
npm install @facturin/sdk
```

## Uso Básico

```typescript
import { FacturinSDK } from '@facturin/sdk';

const facturin = new FacturinSDK({
  baseUrl: 'https://facturin.tu-dominio.com',
  apiKey: 'sk_live_xxxxxxxxxxxxxxxx',
});

// Crear factura
const factura = await facturin.facturas.create({
  cliente: {
    tipoDocumento: '6',
    numeroDocumento: '20100123456',
    nombre: 'EMPRESA SAC',
  },
  detalles: [{
    codigoProducto: 'PROD-001',
    descripcion: 'Producto de ejemplo',
    cantidad: 2,
    precioUnitario: 100,
  }],
});

console.log(factura.serieNumero); // F001-125
```

## Manejo de Errores

```typescript
try {
  await facturin.facturas.create(data);
} catch (error) {
  if (error instanceof FacturinError) {
    console.log(error.statusCode); // 400
    console.log(error.message);    // "Validation error"
  }
}
```
```

## FAQ

```markdown
# Preguntas Frecuentes

## ¿Puedo usar Facturin sin ser OSE?

Sí. Facturin es self-hosted. Cada usuario hostea su propia instancia y se homologa individualmente ante SUNAT.

## ¿Cuánto cuesta?

Facturin es open source y gratuito. Solo pagas por:
- Hosting de tu servidor (VPS ~$10-20/mes)
- Certificado digital (~S/ 150-220/año)

## ¿Necesito homologarme?

Sí, cada usuario debe completar la homologación SUNAT antes de emitir comprobantes reales.

## ¿Puedo modificar el código?

Sí, es open source bajo licencia MIT. Puedes modificarlo según tus necesidades.

## ¿Es seguro?

Sí. Los datos están en tu propio servidor. Usamos encriptación para certificados y contraseñas.
```

## Criterios de Aceptación
- [ ] README claro y completo
- [ ] Guía de instalación funciona paso a paso
- [ ] Guía de homologación cubre casos comunes
- [ ] API docs son precisas
- [ ] FAQ responde preguntas reales

## Bloquea
Ninguno

## Bloqueado Por
Task 1 (básico), resto opcional

## Estimación
4-6 horas
