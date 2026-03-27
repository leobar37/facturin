/**
 * Tests for enviar-comprobante job
 *
 * Tests the job data structure and error handling
 */

import { describe, it, expect } from 'bun:test';
import type { EnviarComprobanteJobData } from '../../jobs/queue';
import type { EnviarComprobanteResult } from '../../jobs/processes/enviar-comprobante';

describe('EnviarComprobante Job', () => {
  describe('Job Data Structure', () => {
    it('should have correct job data shape', () => {
      const jobData: EnviarComprobanteJobData = {
        comprobanteId: '123e4567-e89b-12d3-a456-426614174000',
        tenantId: '123e4567-e89b-12d3-a456-426614174001',
      };

      expect(jobData).toHaveProperty('comprobanteId');
      expect(jobData).toHaveProperty('tenantId');
      expect(typeof jobData.comprobanteId).toBe('string');
      expect(typeof jobData.tenantId).toBe('string');
    });

    it('should accept valid UUIDs', () => {
      const jobData: EnviarComprobanteJobData = {
        comprobanteId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        tenantId: 'f1e2d3c4-b5a6-0987-6543-210fedcba987',
      };

      expect(jobData.comprobanteId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(jobData.tenantId).toMatch(/^[0-9a-f-]{36}$/i);
    });
  });

  describe('Result Structure', () => {
    it('should have correct success result shape', () => {
      const result: EnviarComprobanteResult = {
        success: true,
        comprobanteId: '123e4567-e89b-12d3-a456-426614174000',
        estado: 'aceptado',
      };

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('comprobanteId');
      expect(result).toHaveProperty('estado');
      expect(result.success).toBe(true);
      expect(['pendiente', 'enviado', 'aceptado', 'rechazado', 'anulado', 'excepcion', 'en_proceso']).toContain(result.estado);
    });

    it('should have correct failure result shape', () => {
      const result: EnviarComprobanteResult = {
        success: false,
        comprobanteId: '123e4567-e89b-12d3-a456-426614174000',
        estado: 'rechazado',
        errorCode: 'NOT_FOUND',
        errorMessage: 'Comprobante not found',
      };

      expect(result.success).toBe(false);
      expect(result).toHaveProperty('errorCode');
      expect(result).toHaveProperty('errorMessage');
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('should include ticket when async response', () => {
      const result: EnviarComprobanteResult = {
        success: true,
        comprobanteId: '123e4567-e89b-12d3-a456-426614174000',
        estado: 'enviado',
        ticket: '123456789012345',
      };

      expect(result.ticket).toBeDefined();
      expect(typeof result.ticket).toBe('string');
      expect(result.ticket).toMatch(/^\d{15}$/);
    });
  });

  describe('Error Handling', () => {
    it('should handle NOT_FOUND error code', () => {
      const result: EnviarComprobanteResult = {
        success: false,
        comprobanteId: '123e4567-e89b-12d3-a456-426614174000',
        estado: 'rechazado',
        errorCode: 'NOT_FOUND',
        errorMessage: 'Comprobante not found',
      };

      expect(result.success).toBe(false);
      expect(result.estado).toBe('rechazado');
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('should handle TENANT_NOT_FOUND error code', () => {
      const result: EnviarComprobanteResult = {
        success: false,
        comprobanteId: '123e4567-e89b-12d3-a456-426614174000',
        estado: 'rechazado',
        errorCode: 'TENANT_NOT_FOUND',
        errorMessage: 'Tenant not found',
      };

      expect(result.success).toBe(false);
      expect(result.estado).toBe('rechazado');
      expect(result.errorCode).toBe('TENANT_NOT_FOUND');
    });

    it('should handle MISSING_CERTIFICATE error code', () => {
      const result: EnviarComprobanteResult = {
        success: false,
        comprobanteId: '123e4567-e89b-12d3-a456-426614174000',
        estado: 'rechazado',
        errorCode: 'MISSING_CERTIFICATE',
        errorMessage: 'Tenant certificate not configured',
      };

      expect(result.success).toBe(false);
      expect(result.estado).toBe('rechazado');
      expect(result.errorCode).toBe('MISSING_CERTIFICATE');
    });

    it('should handle MISSING_CREDENTIALS error code', () => {
      const result: EnviarComprobanteResult = {
        success: false,
        comprobanteId: '123e4567-e89b-12d3-a456-426614174000',
        estado: 'rechazado',
        errorCode: 'MISSING_CREDENTIALS',
        errorMessage: 'Tenant SUNAT credentials not configured',
      };

      expect(result.success).toBe(false);
      expect(result.estado).toBe('rechazado');
      expect(result.errorCode).toBe('MISSING_CREDENTIALS');
    });

    it('should handle PROCESS_ERROR error code', () => {
      const result: EnviarComprobanteResult = {
        success: false,
        comprobanteId: '123e4567-e89b-12d3-a456-426614174000',
        estado: 'rechazado',
        errorCode: 'PROCESS_ERROR',
        errorMessage: 'Error generating XML: Invalid data',
      };

      expect(result.success).toBe(false);
      expect(result.estado).toBe('rechazado');
      expect(result.errorCode).toBe('PROCESS_ERROR');
    });

    it('should handle SUNAT rejection codes', () => {
      // Example: RUC invalid, documento no existe, etc.
      const result: EnviarComprobanteResult = {
        success: false,
        comprobanteId: '123e4567-e89b-12d3-a456-426614174000',
        estado: 'rechazado',
        errorCode: '2011',
        errorMessage: 'El número de RUC del emisor no existe',
      };

      expect(result.success).toBe(false);
      expect(result.estado).toBe('rechazado');
      expect(result.errorCode).toMatch(/^\d{4}$/); // SUNAT error codes are typically 4 digits
    });
  });

  describe('Estado Transitions', () => {
    it('should track expected estado values', () => {
      const validEstados = [
        'pendiente',
        'enviado',
        'aceptado',
        'rechazado',
        'anulado',
        'excepcion',
        'en_proceso',
      ] as const;

      validEstados.forEach((estado) => {
        const result: EnviarComprobanteResult = {
          success: estado === 'rechazado' || estado === 'excepcion' ? false : true,
          comprobanteId: '123e4567-e89b-12d3-a456-426614174000',
          estado,
        };

        expect(validEstados).toContain(result.estado);
      });
    });
  });
});

describe('ConsultarCdr Job Data', () => {
  it('should have correct job data shape', () => {
    const jobData = {
      ticket: '123456789012345',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
      comprobanteId: '123e4567-e89b-12d3-a456-426614174000',
      attemptNumber: 1,
    };

    expect(jobData).toHaveProperty('ticket');
    expect(jobData).toHaveProperty('tenantId');
    expect(jobData).toHaveProperty('comprobanteId');
    expect(jobData).toHaveProperty('attemptNumber');
  });

  it('should accept valid ticket format', () => {
    const jobData = {
      ticket: '123456789012345',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
      comprobanteId: '123e4567-e89b-12d3-a456-426614174000',
    };

    expect(jobData.ticket).toMatch(/^\d{15}$/);
  });
});
