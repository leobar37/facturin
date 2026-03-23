# Task 9: Frontend (React Router v7)

## Objetivo
Crear interfaz web para gestionar comprobantes y configuración.

## Entregables
- [ ] Setup React Router v7 con Vite
- [ ] Sistema de autenticación (login/logout)
- [ ] Dashboard principal
- [ ] Lista de comprobantes con filtros
- [ ] Formulario de emisión de facturas/boletas
- [ ] Vista de detalle de comprobante
- [ ] Descarga de XML/CDR/PDF
- [ ] Configuración de organización
- [ ] Gestión de series

## Estructura
```
apps/web/
├── app/
│   ├── root.tsx              # Root layout
│   ├── routes/
│   │   ├── _index.tsx        # Dashboard
│   │   ├── login.tsx         # Login
│   │   ├── facturas/
│   │   │   ├── _index.tsx    # Lista facturas
│   │   │   ├── nuevo.tsx     # Crear factura
│   │   │   └── $id.tsx       # Detalle factura
│   │   ├── boletas/
│   │   ├── notas/
│   │   ├── series/
│   │   └── config/
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── forms/            # Formularios
│   │   └── layout/           # Layouts
│   ├── lib/
│   │   ├── api.ts            # Cliente API
│   │   └── utils.ts          # Utilidades
│   └── styles/
│       └── globals.css
├── package.json
└── vite.config.ts
```

## Páginas Principales

### 1. Dashboard
```tsx
// app/routes/_index.tsx
export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <StatsCards 
        totalEmitidos={100}
        pendientesSunat={5}
        aceptados={95}
      />
      <RecentComprobantes />
      <QuickActions 
        onNewFactura={() => navigate('/facturas/nuevo')}
        onNewBoleta={() => navigate('/boletas/nuevo')}
      />
    </div>
  );
}
```

### 2. Lista de Facturas
```tsx
// app/routes/facturas/_index.tsx
export default function FacturasList() {
  const { facturas } = useLoaderData();
  
  return (
    <div>
      <div className="flex justify-between">
        <h1>Facturas</h1>
        <Link to="/facturas/nuevo">Nueva Factura</Link>
      </div>
      
      <DataTable 
        data={facturas}
        columns={[
          { key: 'serieNumero', title: 'Número' },
          { key: 'clienteNombre', title: 'Cliente' },
          { key: 'total', title: 'Total' },
          { key: 'estado', title: 'Estado SUNAT' },
          { key: 'fecha', title: 'Fecha' },
          { 
            key: 'actions', 
            render: (row) => (
              <>
                <Button onClick={() => downloadXML(row.id)}>XML</Button>
                <Button onClick={() => downloadCDR(row.id)}>CDR</Button>
                <Button onClick={() => downloadPDF(row.id)}>PDF</Button>
              </>
            )
          },
        ]}
      />
    </div>
  );
}
```

### 3. Formulario de Emisión
```tsx
// app/routes/facturas/nuevo.tsx
export default function NuevaFactura() {
  const form = useForm({
    defaultValues: {
      cliente: { tipoDocumento: '6', nombre: '' },
      detalles: [{ codigo: '', descripcion: '', cantidad: 1, precio: 0 }],
    },
  });

  const onSubmit = async (data) => {
    await api.facturas.create(data);
    navigate('/facturas');
  };

  return (
    <Form {...form}>
      <ClienteSection />
      <DetallesSection 
        fields={form.watch('detalles')}
        onAdd={() => append({ ... })}
        onRemove={(i) => remove(i)}
      />
      
      <TotalesSection 
        subtotal={calcularSubtotal()}
        igv={calcularIGV()}
        total={calcularTotal()}
      />
      
      <Button type="submit">Emitir Factura</Button>
    </Form>
  );
}
```

## Cliente API

```typescript
// app/lib/api.ts

const API_URL = import.meta.env.VITE_API_URL;

export const api = {
  auth: {
    login: (email, password) => 
      fetch(`${API_URL}/auth/login`, { method: 'POST', body: JSON.stringify({ email, password }) }),
    logout: () => fetch(`${API_URL}/auth/logout`, { method: 'POST' }),
  },
  
  facturas: {
    list: (params) => fetch(`${API_URL}/v1/facturas?${new URLSearchParams(params)}`),
    create: (data) => fetch(`${API_URL}/v1/facturas`, { method: 'POST', body: JSON.stringify(data) }),
    get: (id) => fetch(`${API_URL}/v1/facturas/${id}`),
    downloadXML: (id) => window.open(`${API_URL}/v1/facturas/${id}/xml`),
    downloadCDR: (id) => window.open(`${API_URL}/v1/facturas/${id}/cdr`),
  },
  
  boletas: { /* ... */ },
};
```

## Criterios de Aceptación
- [ ] Login funciona correctamente
- [ ] Lista de comprobantes carga y filtra
- [ ] Formulario de emisión valida datos
- [ ] Descarga de archivos funciona
- [ ] Responsive (mobile/desktop)
- [ ] Estados de carga y error manejados

## Bloquea
Task 10 (SDK puede usar estos endpoints)

## Bloqueado Por
Task 1, Task 8

## Estimación
8-10 horas
