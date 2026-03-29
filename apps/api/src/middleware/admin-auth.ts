import { UnauthorizedError, ForbiddenError } from '../errors';

export interface AdminRequestContext {
  userId?: string;
  email?: string;
  authType: 'jwt';
}

/**
 * Admin authentication middleware that requires JWT tokens.
 * - Rejects API Keys with 403
 * - Rejects missing or invalid JWT with 401
 *
 * NOTE: This middleware expects the JWT plugin to be already applied to the app.
 * It uses the jwt from context which is provided by the @elysiajs/jwt plugin.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const adminAuthMiddleware = (app: any) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.onBeforeHandle(async ({ headers, path, store, jwt }: any) => {
    // Skip auth for public paths and v1 routes (v1 uses API Key auth, not JWT)
    const publicPaths = ['/api/health', '/api/auth/login', '/swagger', '/api/inngest', '/api/v1'];
    if (publicPaths.some((p) => path.startsWith(p))) {
      return;
    }

    const authHeader = headers.authorization;

    // If no auth header, reject with 401
    if (!authHeader) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }

    // If it's an API Key (starts with Bearer sk_), reject with 403
    if (authHeader.startsWith('Bearer sk_')) {
      throw new ForbiddenError(
        'Admin access requires JWT authentication',
        'ADMIN_JWT_REQUIRED'
      );
    }

    // If it's a JWT, validate it
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');

      // jwt should be available from the @elysiajs/jwt plugin context
      if (!jwt) {
        throw new UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN');
      }

      try {
        // Verify the JWT
        const payload = await jwt.verify(token);

        if (!payload) {
          throw new UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN');
        }

        // Check if it's an admin token
        if (payload.type !== 'admin') {
          throw new UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN');
        }

        // Set the auth context
        if (store) {
          (store as AdminRequestContext).userId = payload.sub as string;
          (store as AdminRequestContext).email = payload.email as string;
          (store as AdminRequestContext).authType = 'jwt';
        }

        return;
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          throw error;
        }
        throw new UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN');
      }
    }

    // Any other auth scheme is invalid
    throw new UnauthorizedError('Invalid authentication scheme', 'INVALID_AUTH');
  });
