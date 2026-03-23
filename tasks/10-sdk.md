# Task 10: SDK (npm package)

## Objetivo
Crear SDK JavaScript/TypeScript para integrar Facturin desde cualquier aplicación.

## Entregables
- [ ] Clase `FacturinSDK` con métodos CRUD
- [ ] Tipos TypeScript completos
- [ ] Manejo de errores
- [ ] Retry automático
- [ ] Publicación en npm registry
- [ ] Documentación

## Estructura
```
packages/sdk/
├── src/
│   ├── index.ts              # Export principal
│   ├── client.ts             # Clase FacturinSDK
│   ├── types.ts              # Interfaces TypeScript
│   ├── errors.ts             # Clases de error
│   └── resources/
│       ├── base.ts           # Resource base
│       ├── facturas.ts       # Facturas resource
│       ├── boletas.ts        # Boletas resource
│       ├── notas.ts          # Notas resource
│       └── comprobantes.ts   # Comprobantes genéricos
├── package.json
├── tsconfig.json
└── README.md
```

## API del SDK

```typescript
// packages/sdk/src/client.ts

export class FacturinSDK {
  private baseUrl: string;
  private apiKey: string;
  private headers: Record<string, string>;

  // Resources
  public facturas: FacturasResource;
  public boletas: BoletasResource;
  public notas: NotasResource;
  public comprobantes: ComprobantesResource;
  public series: SeriesResource;

  constructor(config: SDKConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    // Inicializar resources
    this.facturas = new FacturasResource(this);
    this.boletas = new BoletasResource(this);
    this.notas = new NotasResource(this);
    this.comprobantes = new ComprobantesResource(this);
    this.series = new SeriesResource(this);
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${path}`;
    
    const response = await fetch(url, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new FacturinError(
        error.message || `HTTP ${response.status}`,
        response.status,
        error.code
      );
    }

    return response.json();
  }
}

// Interfaces
export interface SDKConfig {
  baseUrl: string;      // URL de la instancia Facturin
  apiKey: string;       // API Key
  timeout?: number;     // Timeout en ms (default: 30000)
  retries?: number;     // Número de reintentos (default: 3)
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
}
```

## Resources

### FacturasResource
```typescript
// packages/sdk/src/resources/facturas.ts

export class FacturasResource extends BaseResource {
  async create(data: CrearFacturaInput): Promise<Comprobante> {
    return this.client.request('POST', '/facturas', data);
  }

  async list(params?: ListFacturasParams): Promise<PaginatedResponse<Comprobante>> {
    const query = new URLSearchParams(params as any).toString();
    return this.client.request('GET', `/facturas?${query}`);
  }

  async get(id: string): Promise<Comprobante> {
    return this.client.request('GET', `/facturas/${id}`);
  }

  async downloadXML(id: string): Promise<Blob> {
    return this.client.request('GET', `/facturas/${id}/xml`, undefined, {
      responseType: 'blob',
    });
  }

  async downloadCDR(id: string): Promise<Blob> {
    return this.client.request('GET', `/facturas/${id}/cdr`, undefined, {
      responseType: 'blob',
    });
  }
}
```

### ComprobantesResource (Genérico)
```typescript
// packages/sdk/src/resources/comprobantes.ts

export class ComprobantesResource extends BaseResource {
  async list(params?: ListComprobantesParams): Promise<PaginatedResponse<Comprobante>> {
    const query = new URLSearchParams(params as any).toString();
    return this.client.request('GET', `/comprobantes?${query}`);
  }

  async get(id: string): Promise<Comprobante> {
    return this.client.request('GET', `/comprobantes/${id}`);
  }

  async downloadXML(id: string): Promise<Blob> {
    return this.client.request('GET', `/comprobantes/${id}/xml`, undefined, {
      responseType: 'blob',
    });
  }

  async downloadCDR(id: string): Promise<Blob> {
    return this.client.request('GET', `/comprobantes/${id}/cdr`, undefined, {
      responseType: 'blob',
    });
  }

  async downloadPDF(id: string): Promise<Blob> {
    return this.client.request('GET', `/comprobantes/${id}/pdf`, undefined, {
      responseType: 'blob',
    });
  }
}
```

## Uso del SDK

### Node.js
```typescript
import { FacturinSDK } from '@facturin/sdk';

const facturin = new FacturinSDK({
  baseUrl: 'https://facturin.miempresa.com',
  apiKey: 'sk_live_xxxxxxxxxxxxxxxx',
});

// Crear factura
const factura = await facturin.facturas.create({
  cliente: {
    tipoDocumento: '6',
    numeroDocumento: '20100123456',
    nombre: 'EMPRESA SAC',
    direccion: {
      direccion: 'Av. Principal 123',
      departamento: 'LIMA',
      provincia: 'LIMA',
      distrito: 'MIRAFLORES',
      ubigeo: '150101',
    },
  },
  detalles: [
    {
      codigoProducto: 'SERV-001',
      descripcion: 'Consultoría de marketing digital',
      unidadMedida: 'NIU',
      cantidad: 1,
      precioUnitario: 5000,
    },
  ],
  formaPago: {
    tipo: 'credito',
    cuotas: [
      { monto: 2500, fechaVencimiento: '2024-02-15' },
      { monto: 2500, fechaVencimiento: '2024-03-15' },
    ],
  },
});

console.log(factura.serie, factura.numero); // F001-125
console.log(factura.sunatEstado); // pendiente

// Esperar a que SUNAT procese
await new Promise(r => setTimeout(r, 60000));

// Verificar estado
const actualizada = await facturin.facturas.get(factura.id);
console.log(actualizada.sunatEstado); // aceptado | rechazado

// Descargar documentos
const xml = await facturin.facturas.downloadXML(factura.id);
const cdr = await facturin.facturas.downloadCDR(factura.id);
```

### Browser
```html
<script type="module">
  import { FacturinSDK } from 'https://cdn.jsdelivr.net/npm/@facturin/sdk@latest/dist/index.esm.js';
  
  const facturin = new FacturinSDK({
    baseUrl: 'https://facturin.miempresa.com',
    apiKey: 'sk_live_xxxxxxxxxxxxxxxx',
  });
  
  // Usar SDK...
</script>
```

## Manejo de Errores

```typescript
// packages/sdk/src/errors.ts

export class FacturinError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'FacturinError';
  }
}

export class ValidationError extends FacturinError {
  constructor(message: string, public fields: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthenticationError extends FacturinError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class RateLimitError extends FacturinError {
  constructor(message = 'Rate limit exceeded', public retryAfter: number) {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}
```

## Criterios de Aceptación
- [ ] SDK instala sin errores (`npm install @facturin/sdk`)
- [ ] Tipos TypeScript funcionan correctamente
- [ ] Todos los métodos retornan datos esperados
- [ ] Errores se manejan apropiadamente
- [ ] Documentación clara con ejemplos
- [ ] Tests unitarios pasan

## Bloquea
Task 11 (CLI puede usar el SDK)

## Bloqueado Por
Task 1, Task 8

## Estimación
4-5 horas
