import { Elysia } from 'elysia';
import { t } from 'elysia';
import bcrypt from 'bcrypt';
import { jwt } from '@elysiajs/jwt';
import { UnauthorizedError, AppError } from '../errors';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@facturin.local';
const SUPER_ADMIN_PASSWORD_HASH = process.env.SUPER_ADMIN_PASSWORD_HASH || '';
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

// Configure JWT plugin separately to avoid type inference issues
const jwtPlugin = jwt({
  secret: JWT_SECRET,
  exp: '15m',
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authRoutes: any = new Elysia({ prefix: '/api/auth' })
  .use(jwtPlugin)
  .post('/login', async ({ body, jwt: jwtPluginInstance }) => {
    const { email, password } = body as { email: string; password: string };

    // Validate credentials against ENV
    if (email !== SUPER_ADMIN_EMAIL) {
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Verify password hash exists in ENV
    if (!SUPER_ADMIN_PASSWORD_HASH) {
      throw new AppError('Server misconfiguration', 'CONFIG_ERROR', 500);
    }

    const isValidPassword = await bcrypt.compare(password, SUPER_ADMIN_PASSWORD_HASH);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Generate JWT
    const token = await jwtPluginInstance.sign({
      sub: 'super-admin',
      email: SUPER_ADMIN_EMAIL,
      type: 'admin',
    });

    return {
      token,
      type: 'Bearer',
      expiresIn: '15m',
      user: {
        email: SUPER_ADMIN_EMAIL,
        role: 'super-admin',
      },
    };
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      password: t.String({ minLength: 1 }),
    }),
  })
  .get('/me', async () => {
    // This would be called with JWT auth in real use
    // For now, just return the structure
    return {
      email: SUPER_ADMIN_EMAIL,
      role: 'super-admin',
    };
  })
  .post('/refresh', async ({ jwt: jwtPluginInstance }) => {
    // In a real implementation, this would verify the refresh token
    // and issue a new access token
    const token = await jwtPluginInstance.sign({
      sub: 'super-admin',
      email: SUPER_ADMIN_EMAIL,
      type: 'admin',
    });

    return {
      token,
      type: 'Bearer',
      expiresIn: '15m',
    };
  });
