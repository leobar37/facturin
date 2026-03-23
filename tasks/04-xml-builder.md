# Task 4: XML Builder & UBL Generator

## Objetivo
Crear librería para generar XML UBL 2.1 válido según estándares SUNAT.

## Entregables
- [ ] Generador de XML para Invoice (Factura/Boleta)
- [ ] Generador de XML para CreditNote
- [ ] Generador de XML para DebitNote
- [ ] Templates XML usando Handlebars/EJS
- [ ] Validación de esquema UBL 2.1

## Estructura
```
packages/ubl-builder/
├── src/
│   ├── models/
│   │   ├── invoice.ts
│   │   ├── credit-note.ts
│   │   └── debit-note.ts
│   ├── templates/
│   │   ├── invoice.xml.ts      # Template string
│   │   ├── credit-note.xml.ts
│   │   └── fragments/          # Partes reutilizables
│   ├── catalogs/
│   │   └── sunat.ts            # Catálogos SUNAT
│   └── utils/
│       ├── calculations.ts     # Cálculos IGV
│       └── validators.ts
```

## Templates XML

### Invoice Template (simplificado)
```xml
<?xml version="1.0" encoding="ISO-8859-1"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>{{serie}}-{{numero}}</cbc:ID>
  <cbc:IssueDate>{{fechaEmision}}</cbc:IssueDate>
  <cbc:InvoiceTypeCode listID="{{tipoOperacion}}">{{tipoComprobante}}</cbc:InvoiceTypeCode>
  
  <!-- Emisor -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6">{{emisor.ruc}}</cbc:ID>
      </cac:PartyIdentification>
      <!-- ... -->
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <!-- Items -->
  {{#each items}}
  <cac:InvoiceLine>
    <cbc:ID>{{id}}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="{{unidadMedida}}">{{cantidad}}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="{{../moneda}}">{{valorVenta}}</cbc:LineExtensionAmount>
    <!-- ... -->
  </cac:InvoiceLine>
  {{/each}}
</Invoice>
```

## Cálculos Requeridos

```typescript
// IGV (18%)
const igv = gravadas * 0.18;

// Precio unitario sin IGV
const valorUnitario = precioConIGV / 1.18;

// Monto en letras
const leyenda1000 = numeroALetras(importeTotal, moneda);
```

## Catálogos SUNAT a Implementar
- Catálogo 01: Tipos de documento (01=Factura, 03=Boleta)
- Catálogo 06: Tipos de documento de identidad
- Catálogo 07: Tipos de afectación IGV
- Catálogo 16: Tipos de precio
- Catálogo 51: Tipos de operación
- Catálogo 52: Leyendas

## Criterios de Aceptación
- [ ] XML generado valida contra esquema XSD de SUNAT
- [ ] Cálculos de IGV son correctos (ej: 100 + 18% = 118)
- [ ] Todos los campos obligatorios están presentes
- [ ] Formatos de fecha/número correctos

## Bloquea
Task 5 (firma necesita XML)

## Bloqueado Por
Task 1

## Estimación
6-8 horas
