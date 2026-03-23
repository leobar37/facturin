import { Elysia } from 'elysia';
import { t } from 'elysia';
import { tenantsService } from '../../services';
import { NotFoundError } from '../../errors';

export const adminTenantsRoutes = new Elysia({ prefix: '/api/admin/tenants' })
  // List all tenants
  .get('/', async ({ query }) => {
    const { search, limit = 50, offset = 0 } = query as {
      search?: string;
      limit?: number;
      offset?: number;
    };

    const result = await tenantsService.findAll({ search, limit, offset });

    return {
      data: result.data,
      pagination: result.pagination,
    };
  }, {
    query: t.Object({
      search: t.Optional(t.String()),
      limit: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      offset: t.Optional(t.Number({ minimum: 0 })),
    }),
  })
  // Get tenant by ID
  .get('/:id', async ({ params }) => {
    const { id } = params;

    const tenant = await tenantsService.findById(id);

    if (!tenant) {
      throw new NotFoundError('Tenant not found', 'NOT_FOUND');
    }

    return tenant;
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
  })
  // Create new tenant
  .post('/', async ({ body }) => {
    const data = body as {
      ruc: string;
      razonSocial: string;
      nombreComercial?: string;
      direccion?: Record<string, string>;
      contactoEmail?: string;
      contactoPhone?: string;
      maxDocumentsPerMonth?: number;
    };

    const newTenant = await tenantsService.create({
      ruc: data.ruc,
      razonSocial: data.razonSocial,
      nombreComercial: data.nombreComercial,
      direccion: data.direccion,
      contactoEmail: data.contactoEmail,
      contactoPhone: data.contactoPhone,
      maxDocumentsPerMonth: data.maxDocumentsPerMonth,
    });

    return newTenant;
  }, {
    body: t.Object({
      ruc: t.String({ pattern: '^[0-9]{11}$' }),
      razonSocial: t.String({ minLength: 1, maxLength: 255 }),
      nombreComercial: t.Optional(t.String({ maxLength: 255 })),
      direccion: t.Optional(t.Object({
        direccion: t.Optional(t.String()),
        departamento: t.Optional(t.String()),
        provincia: t.Optional(t.String()),
        distrito: t.Optional(t.String()),
        ubigeo: t.Optional(t.String()),
      })),
      contactoEmail: t.Optional(t.String({ format: 'email' })),
      contactoPhone: t.Optional(t.String({ maxLength: 50 })),
      maxDocumentsPerMonth: t.Optional(t.Number()),
    }),
  })
  // Update tenant
  .put('/:id', async ({ params, body }) => {
    const { id } = params;
    const data = body as {
      razonSocial?: string;
      nombreComercial?: string;
      direccion?: Record<string, string>;
      contactoEmail?: string;
      contactoPhone?: string;
      maxDocumentsPerMonth?: number;
      isActive?: boolean;
    };

    const updated = await tenantsService.update(id, {
      razonSocial: data.razonSocial,
      nombreComercial: data.nombreComercial,
      direccion: data.direccion,
      contactoEmail: data.contactoEmail,
      contactoPhone: data.contactoPhone,
      maxDocumentsPerMonth: data.maxDocumentsPerMonth,
      isActive: data.isActive,
    });

    if (!updated) {
      throw new NotFoundError('Tenant not found', 'NOT_FOUND');
    }

    return updated;
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    body: t.Object({
      razonSocial: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      nombreComercial: t.Optional(t.String({ maxLength: 255 })),
      direccion: t.Optional(t.Object({
        direccion: t.Optional(t.String()),
        departamento: t.Optional(t.String()),
        provincia: t.Optional(t.String()),
        distrito: t.Optional(t.String()),
        ubigeo: t.Optional(t.String()),
      })),
      contactoEmail: t.Optional(t.String({ format: 'email' })),
      contactoPhone: t.Optional(t.String({ maxLength: 50 })),
      maxDocumentsPerMonth: t.Optional(t.Number()),
      isActive: t.Optional(t.Boolean()),
    }),
  })
  // Deactivate tenant
  .delete('/:id', async ({ params }) => {
    const { id } = params;

    const result = await tenantsService.deactivate(id);

    if (!result) {
      throw new NotFoundError('Tenant not found', 'NOT_FOUND');
    }

    return result;
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
  })
  // Upload certificate for tenant
  .post('/:id/certificate', async ({ params, body }) => {
    const { id } = params;
    const data = body as {
      certificate: string;  // base64 encoded PFX/P12
      password: string;
    };

    const result = await tenantsService.uploadCertificate(
      id,
      data.certificate,
      data.password
    );

    return result;
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    body: t.Object({
      certificate: t.String({ minLength: 1 }),
      password: t.String({ minLength: 1 }),
    }),
  });
