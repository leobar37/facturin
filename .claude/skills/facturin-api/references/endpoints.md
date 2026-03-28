# API Endpoints Reference

Base URL: `http://localhost:3102`

---

## Health

### GET /api/health

Health check endpoint.

**Auth:** None

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-22T12:00:00.000Z",
  "service": "facturin-api",
  "version": "1.0.0"
}
```

---

## Authentication (Super Admin)

### POST /api/auth/login

Login with email and password.

**Auth:** None

**Request Body:**
```json
{
  "email": "admin@facturin.local",
  "password": "your-password"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "type": "Bearer",
    "expiresIn": "15m",
    "user": {
      "email": "admin@facturin.local",
      "role": "super-admin"
    }
  }
}
```

**Errors:**
- `INVALID_CREDENTIALS` (401): Wrong email or password
- `CONFIG_ERROR` (500): Server misconfigured (no password hash in ENV)

### GET /api/auth/me

Get current admin info.

**Auth:** JWT

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "admin@facturin.local",
    "role": "super-admin"
  }
}
```

### POST /api/auth/refresh

Refresh JWT token.

**Auth:** JWT

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "type": "Bearer",
    "expiresIn": "15m"
  }
}
```

---

## Admin: API Keys

### GET /api/admin/api-keys

List all API keys.

**Auth:** JWT

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Production Key",
      "keyPrefix": "sk_live_",
      "permissions": ["*"],
      "lastUsedAt": "2026-03-22T12:00:00.000Z",
      "expiresAt": null,
      "isActive": true,
      "createdAt": "2026-03-22T12:00:00.000Z"
    }
  ]
}
```

### POST /api/admin/api-keys

Create new API key.

**Auth:** JWT

**Request Body:**
```json
{
  "name": "Production Key",
  "permissions": ["*"],
  "expiresAt": "2027-01-01T00:00:00.000Z"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Production Key",
    "key": "sk_live_abc123...",  // Only returned once!
    "keyPrefix": "sk_live_",
    "permissions": ["*"],
    "expiresAt": "2027-01-01T00:00:00.000Z",
    "isActive": true,
    "createdAt": "2026-03-22T12:00:00.000Z"
  }
}
```

### DELETE /api/admin/api-keys/:id

Revoke (deactivate) an API key.

**Auth:** JWT

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isActive": false
  }
}
```

---

## Admin: Tenants

### GET /api/admin/tenants

List all tenants with pagination.

**Auth:** JWT

**Query Parameters:**
- `search` (optional): Search by razonSocial
- `limit` (optional, default 50, max 100)
- `offset` (optional, default 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ruc": "12345678901",
      "razonSocial": "Empresa SAC",
      "nombreComercial": "Empresa",
      "direccion": {
        "direccion": "Av. Lima 123",
        "departamento": "Lima",
        "provincia": "Lima",
        "distrito": "Lima",
        "ubigeo": "150101"
      },
      "contactoEmail": "contacto@empresa.com",
      "contactoPhone": "987654321",
      "isActive": true,
      "maxDocumentsPerMonth": 1000,
      "createdAt": "2026-03-22T12:00:00.000Z",
      "updatedAt": "2026-03-22T12:00:00.000Z",
      "hasCertificado": true,
      "hasSunatPassword": true
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

### GET /api/admin/tenants/:id

Get tenant by ID.

**Auth:** JWT

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

### POST /api/admin/tenants

Create new tenant.

**Auth:** JWT

**Request Body:**
```json
{
  "ruc": "12345678901",
  "razonSocial": "Empresa SAC",
  "nombreComercial": "Empresa",
  "direccion": {
    "direccion": "Av. Lima 123",
    "departamento": "Lima",
    "provincia": "Lima",
    "distrito": "Lima",
    "ubigeo": "150101"
  },
  "contactoEmail": "contacto@empresa.com",
  "contactoPhone": "987654321",
  "maxDocumentsPerMonth": 1000
}
```

**Validation:**
- RUC must be 11 digits with valid SUNAT checksum

**Errors:**
- `INVALID_RUC` (400): Invalid RUC format
- `DUPLICATE_RUC` (409): RUC already registered

### PUT /api/admin/tenants/:id

Update tenant.

**Auth:** JWT

**Request Body:** Partial update (all fields optional)

### DELETE /api/admin/tenants/:id

Deactivate tenant.

**Auth:** JWT

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isActive": false
  }
}
```

---

## V1: Series

### GET /api/v1/series

List series for authenticated tenant.

**Auth:** API Key + X-Tenant-ID header

**Headers:**
```
Authorization: Bearer sk_live_xxx
X-Tenant-ID: uuid-of-tenant
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "tipoComprobante": "01",
      "serie": "F001",
      "correlativoActual": 150,
      "isActive": true,
      "createdAt": "2026-03-22T12:00:00.000Z"
    }
  ]
}
```

**Errors:**
- `TENANT_REQUIRED` (400): Missing X-Tenant-ID header

### POST /api/v1/series

Create new series for tenant.

**Auth:** API Key + X-Tenant-ID

**Request Body:**
```json
{
  "tipoComprobante": "01",
  "serie": "F001",
  "correlativoActual": 0
}
```

**Validation:**
- `tipoComprobante`: Must be one of `01`, `03`, `07`, `08`, `09`, `20`, `40`
- `serie`: Must be exactly 4 uppercase alphanumeric characters

**Errors:**
- `INVALID_TIPO_COMPROBANTE` (400)
- `INVALID_SERIE` (400)
- `DUPLICATE_SERIE` (409): Series already exists for this document type

### GET /api/v1/series/:id

Get series by ID.

**Auth:** API Key + X-Tenant-ID

### PUT /api/v1/series/:id

Update series.

**Auth:** API Key + X-Tenant-ID

**Request Body:**
```json
{
  "correlativoActual": 200,
  "isActive": true
}
```

### DELETE /api/v1/series/:id

Deactivate series.

**Auth:** API Key + X-Tenant-ID

---

## Document Types (tipoComprobante)

| Code | Description |
|------|-------------|
| 01 | Factura |
| 03 | Boleta |
| 07 | Nota de Crédito |
| 08 | Nota de Débito |
| 09 | Guía de Remisión |
| 20 | Retención |
| 40 | Percepción |
