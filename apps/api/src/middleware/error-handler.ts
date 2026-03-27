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

    // Handle Elysia TypeBox validation errors
    if (error && typeof error === 'object' && 'type' in error) {
      const errorObj = error as Record<string, unknown>;
      
      if (errorObj.type === 'validation') {
        set.status = 400;
        
        // Check if it's a body validation error for required fields
        const on = errorObj.on as string | undefined;
        const property = errorObj.property as string | undefined;
        const message = errorObj.message as string | undefined;
        
        if (on === 'body' && property && message) {
          // If a required field is missing/empty, return our custom error message
          if (message.includes('Expected string') || message.includes('undefined')) {
            if (property === '/username' || property === '/password') {
              return {
                error: 'SUNAT username and password are required',
                code: 'SUNAT_CREDENTIALS_REQUIRED',
              };
            }
          }
        }
        
        // Generic validation error response
        return {
          error: message || 'Validation error',
          code: 'VALIDATION_ERROR',
        };
      }
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
