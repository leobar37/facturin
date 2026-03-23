import { Elysia } from 'elysia';
import { t } from 'elysia';
import { apiKeysService } from '../../services';
import { NotFoundError } from '../../errors';

export const adminApiKeysRoutes = new Elysia({ prefix: '/api/admin/api-keys' })
  // List all API keys
  .get('/', async () => {
    const keys = await apiKeysService.findAll();

    return keys;
  })
  // Create new API key
  .post('/', async ({ body }) => {
    const { name, permissions, expiresAt } = body as {
      name: string;
      permissions?: string[];
      expiresAt?: string;
    };

    const newKey = await apiKeysService.create({
      name,
      permissions,
      expiresAt,
    });

    return newKey;
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      permissions: t.Optional(t.Array(t.String())),
      expiresAt: t.Optional(t.String()),
    }),
  })
  // Revoke API key
  .delete('/:id', async ({ params }) => {
    const { id } = params;

    const result = await apiKeysService.revoke(id);

    if (!result) {
      throw new NotFoundError('API key not found', 'NOT_FOUND');
    }

    return result;
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
  });
