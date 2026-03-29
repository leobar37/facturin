import type { Elysia } from 'elysia';
import { AppError } from '../errors';

export const errorHandler = (app: Elysia) =>
  app.onError(({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        error: error.message,
        code: error.code,
      };
    }

    // Handle Elysia TypeBox validation errors
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      
      // TypeBox validation errors have code: "VALIDATION" and type: "body"
      if (errorObj.code === 'VALIDATION' && errorObj.type === 'body') {
        set.status = 400;
        
        // Extract error information from valueError
        const valueError = errorObj.valueError as Record<string, unknown> | undefined;
        
        // Note: valueError has 'path' not 'property'
        const path = (valueError?.path as string | undefined) || '';
        const message = (valueError?.message as string | undefined) || '';
        const summary = (valueError?.summary as string | undefined) || '';
        
        // Check if it's a body validation error for missing username or password
        if (path === '/username' || path === '/password') {
          // Check if it's a missing/undefined error
          if (message.includes('Expected string') || message.includes('undefined')) {
            return {
              error: 'SUNAT username and password are required',
              code: 'SUNAT_CREDENTIALS_REQUIRED',
            };
          }
        }
        
        // Generic validation error response
        return {
          error: summary || message || 'Validation error',
          code: 'VALIDATION_ERROR',
        };
      }
    }

    // Default error response
    set.status = 500;
    return {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
  });
