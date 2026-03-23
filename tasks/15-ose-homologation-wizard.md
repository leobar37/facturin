# Task 15: OSE Homologation Wizard

## Objetivo
Crear wizard completo para guiar al host en el proceso de homologación OSE ante SUNAT.

## Contexto
Para operar en modo Multi-Tenant (OSE), el host DEBE:
1. Constituir empresa SAC
2. Obtener garantía bancaria (S/ 50,000 - S/ 100,000)
3. Solicitar homologación ante SUNAT
4. Completar casos de prueba
5. Obtener resolución OSE

Este wizard guía paso a paso todo el proceso.

## Estructura del Wizard

```
Wizard de Homologación OSE (6 pasos)
├── Paso 1: Requisitos Legales
├── Paso 2: Constitución de Empresa
├── Paso 3: Garantía Bancaria
├── Paso 4: Solicitud SUNAT
├── Paso 5: Casos de Prueba
└── Paso 6: Seguimiento
```

## Paso 1: Requisitos Legales

```typescript
// Ruta: /admin/ose-homologation

export function RequisitosLegales() {
  const requisitos = [
    {
      titulo: 'Constituir Empresa SAC',
      descripcion: 'Debes tener una empresa jurídica constituida',
      tiempo: '3-5 días hábiles',
      costo: 'Aprox. S/ 1,500 - 2,500',
      check: () => hasCompany(),
    },
    {
      titulo: 'Garantía Bancaria',
      descripcion: 'SUNAT exige garantía como seguro de cumplimiento',
      tiempo: '1-2 semanas',
      costo: 'S/ 50,000 - 100,000 (reembolsable)',
      check: () => hasBankGuarantee(),
    },
    {
      titulo: 'Infraestructura Técnica',
      descripcion: 'Servidores con certificaciones de seguridad',
      tiempo: 'Inmediato',
      costo: 'Variable',
      check: () => hasInfrastructure(),
    },
    {
      titulo: 'Certificado Digital',
      descripcion: 'Certificado X.509 para firma de documentos',
      tiempo: '1-3 días',
      costo: 'S/ 150 - 300/año',
      check: () => hasDigitalCertificate(),
    },
  ];

  return (
    <WizardStep title="Requisitos Legales">
      <Alert type="info">
        El proceso de homologación OSE toma entre 3-6 meses y requiere
        inversión inicial significativa. Asegúrate de cumplir todos los
        requisitos antes de continuar.
      </Alert>
      
      <Checklist items={requisitos} />
      
      <Button 
        disabled={!allRequisitosMet(requisitos)}
        onClick={() => nextStep()}
      >
        Continuar
      </Button>
    </WizardStep>
  );
}
```

## Paso 2: Constitución de Empresa

```typescript
export function ConstitucionEmpresa() {
  return (
    <WizardStep title="Constitución de Empresa SAC">
      <h3>Pasos para constituir empresa:</h3>
      
      <ol>
        <li>
          <strong>Buscar nombre en SUNARP</strong>
          <p>Verifica que el nombre de tu empresa esté disponible</p>
          <Link href="https://www.sunarp.gob.pe">SUNARP</Link>
        </li>
        
        <li>
          <strong>Redactar Minuta</strong>
          <p>Puedes usar plantilla estándar o contratar abogado</p>
          <DownloadLink href="/templates/minuta-sac.docx">
            Descargar plantilla
          </DownloadLink>
        </li>
        
        <li>
          <strong>Firmar ante Notario</strong>
          <p>Costo aproximado: S/ 300 - 500</p>
        </li>
        
        <li>
          <strong>Inscribir en SUNARP</strong>
          <p>Registro de la empresa</p>
          <p>Costo: S/ 150 - 250</p>
        </li>
        
        <li>
          <strong>Obtener RUC</strong>
          <p>En SUNAT con partida registral</p>
          <p>Tiempo: 24-48 horas</p>
        </li>
      </ol>
      
      <Form onSubmit={saveCompanyData}>
        <Input name="ruc" label="RUC de la empresa" required />
        <Input name="razonSocial" label="Razón Social" required />
        <Input name="nombreComercial" label="Nombre Comercial" />
        <FileUpload name="partidaRegistral" label="Partida Registral (PDF)" />
        
        <Button type="submit">Guardar y Continuar</Button>
      </Form>
    </WizardStep>
  );
}
```

## Paso 3: Garantía Bancaria

```typescript
export function GarantiaBancaria() {
  const bancos = [
    { name: 'BCP', telefono: '01-311-9898', requisitos: ['Constancia SUNAT', 'Partida registral'] },
    { name: 'Interbank', telefono: '01-311-9000', requisitos: ['Constancia SUNAT', 'Partida registral'] },
    { name: 'BBVA', telefono: '01-595-0000', requisitos: ['Constancia SUNAT', 'Partida registral'] },
  ];

  return (
    <WizardStep title="Garantía Bancaria">
      <Alert type="warning">
        SUNAT exige una garantía bancaria entre S/ 50,000 y S/ 100,000
        como seguro de cumplimiento. Este dinero ES REEMBOLSABLE cuando
        dejes de operar como OSE.
      </Alert>
      
      <h3>Bancos que ofrecen garantías para OSE:</h3>
      
      {bancos.map(banco => (
        <Card key={banco.name}>
          <h4>{banco.name}</h4>
          <p>Teléfono: {banco.telefono}</p>
          <p>Requisitos:</p>
          <ul>
            {banco.requisitos.map(req => <li key={req}>{req}</li>)}
          </ul>
        </Card>
      ))}
      
      <Form onSubmit={saveGuaranteeData}>
        <Select name="banco" label="Banco">
          <option>BCP</option>
          <option>Interbank</option>
          <option>BBVA</option>
          <option>Otro</option>
        </Select>
        
        <Input name="monto" label="Monto de la garantía" type="number" />
        <Input name="numeroGarantia" label="Número de garantía" />
        <FileUpload name="documentoGarantia" label="Documento de garantía (PDF)" />
        
        <Button type="submit">Guardar y Continuar</Button>
      </Form>
    </WizardStep>
  );
}
```

## Paso 4: Solicitud SUNAT

```typescript
export function SolicitudSunat() {
  const pasosSolicitud = [
    {
      paso: 1,
      titulo: 'Ingresar a SUNAT Operaciones en Línea',
      descripcion: 'Con el RUC de tu empresa SAC',
      url: 'https://www.sunat.gob.pe',
    },
    {
      paso: 2,
      titulo: 'Ir a "Trámites y Consultas"',
      descripcion: 'Menú superior derecho',
    },
    {
      paso: 3,
      titulo: 'Seleccionar "Homologación OSE"',
      descripcion: 'En el menú de trámites',
    },
    {
      paso: 4,
      titulo: 'Completar formulario',
      descripcion: 'Datos de la empresa y representante legal',
    },
    {
      paso: 5,
      titulo: 'Adjuntar documentos',
      descripcion: 'Partida registral, garantía bancaria, etc.',
    },
    {
      paso: 6,
      titulo: 'Enviar solicitud',
      descripcion: 'SUNAT te dará un número de expediente',
    },
  ];

  return (
    <WizardStep title="Solicitud ante SUNAT">
      <h3>Pasos para solicitar homologación:</h3>
      
      <Timeline items={pasosSolicitud} />
      
      <Alert type="info">
        Tiempo estimado de respuesta: 5-10 días hábiles para asignación de
        casos de prueba.
      </Alert>
      
      <Form onSubmit={saveSunatRequest}>
        <Input name="numeroExpediente" label="Número de expediente SUNAT" />
        <Input name="fechaSolicitud" label="Fecha de solicitud" type="date" />
        <TextArea name="observaciones" label="Observaciones" />
        
        <Button type="submit">Guardar y Continuar</Button>
      </Form>
    </WizardStep>
  );
}
```

## Paso 5: Casos de Prueba

```typescript
export function CasosPrueba() {
  const [casos, setCasos] = useState([]);
  
  // SUNAT asigna estos grupos de prueba
  const gruposPrueba = [
    {
      grupo: 1,
      nombre: 'Facturas - Ventas Gravadas IGV',
      serie: 'FF11',
      cantidadCasos: 5,
      descripcion: 'Facturas con diferentes tipos de IGV',
    },
    {
      grupo: 2,
      nombre: 'Facturas - Ventas Inafectas/Exoneradas',
      serie: 'FF12',
      cantidadCasos: 3,
      descripcion: 'Facturas con operaciones no gravadas',
    },
    {
      grupo: 3,
      nombre: 'Boletas - Ventas Gravadas',
      serie: 'BB11',
      cantidadCasos: 3,
      descripcion: 'Boletas con IGV',
    },
    {
      grupo: 4,
      nombre: 'Notas de Crédito/Débito',
      serie: 'FC11/FD11',
      cantidadCasos: 4,
      descripcion: 'Anulaciones y modificaciones',
    },
    {
      grupo: 5,
      nombre: 'Resumen Diario',
      serie: 'RC',
      cantidadCasos: 1,
      descripcion: 'Resumen de boletas',
    },
  ];

  async function generarCasosPrueba() {
    // El sistema genera automáticamente los documentos de prueba
    const casosGenerados = await api.post('/admin/ose/generar-casos-prueba', {
      grupos: gruposPrueba,
    });
    
    setCasos(casosGenerados);
  }

  async function enviarASunat() {
    // Enviar todos los casos al ambiente beta de SUNAT
    await api.post('/admin/ose/enviar-casos-sunat', {
      casos: casos.map(c => c.id),
    });
    
    toast.success('Casos enviados a SUNAT');
  }

  return (
    <WizardStep title="Casos de Prueba">
      <h3>Grupos de prueba asignados por SUNAT:</h3>
      
      <Table data={gruposPrueba} columns={[
        { key: 'grupo', title: 'Grupo' },
        { key: 'nombre', title: 'Nombre' },
        { key: 'serie', title: 'Serie' },
        { key: 'cantidadCasos', title: 'Casos' },
      ]} />
      
      <Button onClick={generarCasosPrueba} variant="primary">
        Generar Casos de Prueba Automáticamente
      </Button>
      
      {casos.length > 0 && (
        <>
          <h4>Casos generados:</h4>
          <Table data={casos} columns={[...]} />
          
          <Button onClick={enviarASunat} variant="success">
            Enviar a SUNAT (Ambiente Beta)
          </Button>
        </>
      )}
      
      <Alert type="info">
        SUNAT evaluará los casos en 3-5 días hábiles. Si están correctos,
        avanzarás a la etapa final. Si hay errores, deberás corregirlos.
      </Alert>
    </WizardStep>
  );
}
```

## Paso 6: Seguimiento y Aprobación

```typescript
export function SeguimientoAprobacion() {
  const [estado, setEstado] = useState('en_evaluacion');
  const [observaciones, setObservaciones] = useState([]);

  async function verificarEstado() {
    const result = await api.get('/admin/ose/verificar-estado');
    setEstado(result.estado);
    setObservaciones(result.observaciones || []);
  }

  async function completarHomologacion() {
    await api.post('/admin/ose/completar', {
      numeroResolucion: resolucionInput.value,
      fechaResolucion: fechaInput.value,
    });
    
    // Activar modo OSE
    await api.post('/admin/ose/activar');
    
    toast.success('¡Homologación OSE completada! Ya puedes ofrecer facturación a tus clientes.');
  }

  return (
    <WizardStep title="Seguimiento y Aprobación">
      <StatusBadge estado={estado} />
      
      {estado === 'en_evaluacion' && (
        <>
          <p>SUNAT está evaluando tus casos de prueba...</p>
          <Button onClick={verificarEstado}>Verificar Estado</Button>
        </>
      )}
      
      {estado === 'observado' && (
        <>
          <Alert type="warning">
            SUNAT encontró observaciones. Debes corregirlas:
          </Alert>
          
          <ul>
            {observaciones.map(obs => (
              <li key={obs.id}>{obs.descripcion}</li>
            ))}
          </ul>
          
          <Button onClick={() => setStep(5)}>Volver a Casos de Prueba</Button>
        </>
      )}
      
      {estado === 'aprobado' && (
        <>
          <Alert type="success">
            ¡Felicitaciones! SUNAT aprobó tu solicitud OSE.
          </Alert>
          
          <Form onSubmit={completarHomologacion}>
            <Input 
              name="numeroResolucion" 
              label="Número de Resolución OSE" 
              required 
            />
            <Input 
              name="fechaResolucion" 
              label="Fecha de Resolución" 
              type="date" 
              required 
            />
            <FileUpload 
              name="resolucionPdf" 
              label="Resolución OSE (PDF)" 
              required 
            />
            
            <Button type="submit" variant="success">
              Completar Homologación y Activar OSE
            </Button>
          </Form>
        </>
      )}
    </WizardStep>
  );
}
```

## Criterios de Aceptación
- [ ] Wizard guía por los 6 pasos completos
- [ ] Valida requisitos antes de permitir avanzar
- [ ] Genera casos de prueba automáticamente
- [ ] Permite enviar casos directamente a SUNAT beta
- [ ] Sistema de seguimiento de estado
- [ ] Maneja observaciones y reenvíos
- [ ] Al completar, activa modo OSE automáticamente

## Bloquea
Ninguno - feature opcional pero importante

## Bloqueado Por
Task 14

## Estimación
8-10 horas
