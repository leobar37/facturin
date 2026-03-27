import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  permissions: z.array(z.string()).optional(),
  expiresAt: z.string().optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;