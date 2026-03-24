// Error classes for the SDK

export class FacturinError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'FacturinError';
  }
}

export class AuthenticationError extends FacturinError {
  constructor(message: string = 'Authentication failed', details?: unknown) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends FacturinError {
  constructor(message: string = 'Access forbidden', details?: unknown) {
    super(message, 'FORBIDDEN', 403, details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends FacturinError {
  constructor(message: string = 'Resource not found', details?: unknown) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends FacturinError {
  constructor(
    message: string = 'Validation failed',
    public readonly errors?: Array<{
      field: string;
      message: string;
    }>
  ) {
    super(message, 'VALIDATION_ERROR', 422, errors);
    this.name = 'ValidationError';
  }
}

export class TenantNotReadyError extends FacturinError {
  constructor(message: string = 'Tenant not ready for invoicing') {
    super(message, 'TENANT_NOT_READY', 403);
    this.name = 'TenantNotReadyError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error') {
    super(message);
    this.name = 'NetworkError';
  }
}
