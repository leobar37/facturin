import type { Elysia } from 'elysia';
import { AppError } from '../errors';

export const errorHandler = (app: Elysia) =>
  app.onError(({ error, set }) => {
    console.error('Error:', error);

    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
        },
      };
    }

    // Default error response
    set.status = 500;
    return {
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    };
  });
