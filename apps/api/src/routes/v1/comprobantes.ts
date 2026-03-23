import { Elysia } from 'elysia';
import { t } from 'elysia';
import { comprobantesService } from '../../services';
import type { RequestContext } from '../../middleware/auth';
import { UnauthorizedError } from '../../errors';

// Detail item schema
const detalleSchema = t.Object({
  descripcion: t.String({ minLength: 1 }),
  cantidad: t.Number({ minimum: 0.01 }),
  valorUnitario: t.Number({ minimum: 0 }),
  precioUnitario: t.Optional(t.Number({ minimum: 0 })),
  igv: t.Optional(t.Number({ minimum: 0 })),
  subTotal: t.Optional(t.Number({ minimum: 0 })),
});

export const v1ComprobantesRoutes = new Elysia({ prefix: '/api/v1/comprobantes' })
  // List comprobantes with filters
  .get('/', async ({ query, store }) => {
    const ctx = store as RequestContext;
    const tenantId = ctx?.tenantId;

    if (!tenantId) {
      throw new UnauthorizedError('X-Tenant-ID header required', 'TENANT_REQUIRED');
    }

    const { limit, offset, tipoComprobante, serie, estado, fechaDesde, fechaHasta } = query as {
      limit?: string;
      offset?: string;
      tipoComprobante?: string;
      serie?: string;
      estado?: string;
      fechaDesde?: string;
      fechaHasta?: string;
    };

    const result = await comprobantesService.list(
      tenantId,
      {
        tipoComprobante,
        serie,
        estado,
        fechaDesde,
        fechaHasta,
      },
      {
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
      }
    );

    return result;
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
      tipoComprobante: t.Optional(t.String()),
      serie: t.Optional(t.String()),
      estado: t.Optional(t.String()),
      fechaDesde: t.Optional(t.String()),
      fechaHasta: t.Optional(t.String()),
    }),
  })
  // Create new comprobante
  .post('/', async ({ body, store }) => {
    const ctx = store as RequestContext;
    const tenantId = ctx?.tenantId;

    if (!tenantId) {
      throw new UnauthorizedError('X-Tenant-ID header required', 'TENANT_REQUIRED');
    }

    const input = body as {
      tipoComprobante: string;
      serie: string;
      clienteTipoDocumento: string;
      clienteNumeroDocumento: string;
      clienteNombre: string;
      clienteDireccion?: string;
      detalles: Array<{
        descripcion: string;
        cantidad: number;
        valorUnitario: number;
        precioUnitario?: number;
        igv?: number;
        subTotal?: number;
      }>;
      formaPago?: {
        tipoPago: string;
        montoPagado?: number;
      };
    };

    const result = await comprobantesService.create(tenantId, input);

    return result;
  }, {
    body: t.Object({
      tipoComprobante: t.String({ pattern: '^(01|03|07|08|09|20|40)$' }),
      serie: t.String({ pattern: '^[A-Z0-9]{4}$' }),
      clienteTipoDocumento: t.String({ pattern: '^[0-6A]$' }),
      clienteNumeroDocumento: t.String({ minLength: 1, maxLength: 20 }),
      clienteNombre: t.String({ minLength: 1, maxLength: 255 }),
      clienteDireccion: t.Optional(t.String()),
      detalles: t.Array(detalleSchema, { minLength: 1 }),
      formaPago: t.Optional(t.Object({
        tipoPago: t.String(),
        montoPagado: t.Optional(t.Number()),
      })),
    }),
  })
  // Get comprobante by ID
  .get('/:id', async ({ params, store }) => {
    const ctx = store as RequestContext;
    const tenantId = ctx?.tenantId;

    if (!tenantId) {
      throw new UnauthorizedError('X-Tenant-ID header required', 'TENANT_REQUIRED');
    }

    const { id } = params;

    const result = await comprobantesService.getById(tenantId, id);

    return result;
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
  })
  // Cancel (anular) comprobante
  .delete('/:id', async ({ params, store }) => {
    const ctx = store as RequestContext;
    const tenantId = ctx?.tenantId;

    if (!tenantId) {
      throw new UnauthorizedError('X-Tenant-ID header required', 'TENANT_REQUIRED');
    }

    const { id } = params;

    const result = await comprobantesService.cancel(tenantId, id);

    return result;
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
  });
