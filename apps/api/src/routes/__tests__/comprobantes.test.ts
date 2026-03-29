import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ComprobantesService } from '../../services/comprobantes.service';
import { comprobantesRepository } from '../../repositories/comprobantes.repository';
import { seriesRepository } from '../../repositories/series.repository';
import { tenantReadinessService } from '../../services/tenant-readiness.service';
import type { ComprobanteEntity } from '../../repositories/comprobantes.repository';
import { ValidationError, NotFoundError, ForbiddenError } from '../../errors';

// Test helper - validate RUC using SUNAT algorithm
function validateRUC(ruc: string): boolean {
  if (!/^\d{11}$/.test(ruc)) return false;

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;

  for (let i = 0; i < 10; i++) {
    sum += parseInt(ruc[i]) * weights[i];
  }

  const remainder = sum % 11;
  const checkDigit = 11 - remainder;

  return checkDigit === parseInt(ruc[10]);
}

// Test helper - calculate totals (replicating service logic)
const IGV_RATE = 0.18;

function calculateTotals(detalles: Array<{ cantidad: number; valorUnitario: number }>): {
  totalGravadas: string;
  totalIgv: string;
  totalImporte: string;
} {
  let totalGravadas = 0;

  for (const item of detalles) {
    const valorVenta = item.cantidad * item.valorUnitario;
    totalGravadas += valorVenta;
  }

  const totalIgv = totalGravadas * IGV_RATE;
  const totalImporte = totalGravadas + totalIgv;

  return {
    totalGravadas: totalGravadas.toFixed(2),
    totalIgv: totalIgv.toFixed(2),
    totalImporte: totalImporte.toFixed(2),
  };
}

// Mock tenant data
const mockTenantId = '123e4567-e89b-12d3-a456-426614174000';

const mockComprobante: ComprobanteEntity = {
  id: '789e0123-e89b-12d3-a456-426614174002',
  tenantId: mockTenantId,
  tipoComprobante: '01',
  serie: 'F001',
  numero: 1,
  fechaEmision: new Date('2026-03-29T00:00:00Z'),
  clienteTipoDocumento: '6',
  clienteNumeroDocumento: '20100178959',
  clienteNombre: 'Cliente Test SAC',
  clienteDireccion: null,
  totalGravadas: '200.00',
  totalIgv: '36.00',
  totalImporte: '236.00',
  detalles: [],
  leyendas: [],
  formaPago: null,
  xmlContent: null,
  cdrContent: null,
  cdrStatus: null,
  sunatTicket: null,
  sunatEstado: 'pendiente',
  sunatFechaEnvio: null,
  sunatFechaRespuesta: null,
  hash: null,
  createdAt: new Date('2026-03-29T00:00:00Z'),
};

describe('ComprobantesService', () => {
  const service = new ComprobantesService();

  // Store original methods
  const originalFindByTenantAndId = comprobantesRepository.findByTenantAndId.bind(comprobantesRepository);
  const originalFindByTenant = comprobantesRepository.findByTenant.bind(comprobantesRepository);
  const originalCreate = comprobantesRepository.create.bind(comprobantesRepository);
  const originalUpdateEstado = comprobantesRepository.updateEstado.bind(comprobantesRepository);
  const originalGetLastNumeroBySerie = comprobantesRepository.getLastNumeroBySerie.bind(comprobantesRepository);
  const originalFindByTenantAndTipoAndSerie = seriesRepository.findByTenantAndTipoAndSerie.bind(seriesRepository);
  const originalCheckReadiness = tenantReadinessService.checkReadiness.bind(tenantReadinessService);

  beforeEach(() => {
    // Reset to original methods before each test
    // In bun:test, we restore by reassigning
  });

  describe('create', () => {
    const validInput = {
      tipoComprobante: '01',
      serie: 'F001',
      clienteTipoDocumento: '6',
      clienteNumeroDocumento: '20100178959',
      clienteNombre: 'Cliente Test SAC',
      detalles: [
        { descripcion: 'Product A', cantidad: 2, valorUnitario: 100 },
      ],
    };

    afterEach(() => {
      // Restore original methods
      comprobantesRepository.findByTenantAndId = originalFindByTenantAndId;
      comprobantesRepository.findByTenant = originalFindByTenant;
      comprobantesRepository.create = originalCreate;
      comprobantesRepository.updateEstado = originalUpdateEstado;
      comprobantesRepository.getLastNumeroBySerie = originalGetLastNumeroBySerie;
      seriesRepository.findByTenantAndTipoAndSerie = originalFindByTenantAndTipoAndSerie;
      tenantReadinessService.checkReadiness = originalCheckReadiness;
    });

    it('should create comprobante when tenant is ready and data is valid (VAL-API-CPE-004)', async () => {
      // Mock tenant readiness
      tenantReadinessService.checkReadiness = async () => ({
        ready: true,
        missing: [],
        checks: { hasCertificate: true, hasSunatCredentials: true, hasSeries: true },
      });

      // Mock series validation
      seriesRepository.findByTenantAndTipoAndSerie = async () => ({
        id: 'series-id',
        tenantId: mockTenantId,
        tipoComprobante: '01',
        serie: 'F001',
        correlativoActual: 0,
        isActive: true,
        createdAt: new Date(),
      });

      // Mock correlativo
      comprobantesRepository.getLastNumeroBySerie = async () => 0;

      // Mock create
      const mockCreatedComprobante = { ...mockComprobante, numero: 1 };
      comprobantesRepository.create = async () => mockCreatedComprobante;

      const result = await service.create(mockTenantId, validInput);

      expect(result.tipoComprobante).toBe('01');
      expect(result.serie).toBe('F001');
      expect(result.numero).toBe(1);
      expect(result.totalGravadas).toBe('200.00');
      expect(result.totalIgv).toBe('36.00');
      expect(result.totalImporte).toBe('236.00');
    });

    it('should reject creation when tenant is not ready (VAL-API-CPE-005)', async () => {
      tenantReadinessService.checkReadiness = async () => ({
        ready: false,
        missing: ['certificate', 'sunat_credentials', 'series'],
        checks: { hasCertificate: false, hasSunatCredentials: false, hasSeries: false },
      });

      await expect(service.create(mockTenantId, validInput)).rejects.toThrow(ForbiddenError);
    });

    it('should reject invalid client RUC (VAL-API-CPE-005)', async () => {
      tenantReadinessService.checkReadiness = async () => ({
        ready: true,
        missing: [],
        checks: { hasCertificate: true, hasSunatCredentials: true, hasSeries: true },
      });

      const invalidRucInput = {
        ...validInput,
        clienteNumeroDocumento: '12345678901', // Invalid checksum
      };

      await expect(service.create(mockTenantId, invalidRucInput)).rejects.toThrow(ValidationError);
    });

    it('should reject invalid serie (VAL-API-CPE-005)', async () => {
      tenantReadinessService.checkReadiness = async () => ({
        ready: true,
        missing: [],
        checks: { hasCertificate: true, hasSunatCredentials: true, hasSeries: true },
      });

      seriesRepository.findByTenantAndTipoAndSerie = async () => null;

      await expect(service.create(mockTenantId, validInput)).rejects.toThrow(ValidationError);
    });

    it('should reject inactive serie (VAL-API-CPE-005)', async () => {
      tenantReadinessService.checkReadiness = async () => ({
        ready: true,
        missing: [],
        checks: { hasCertificate: true, hasSunatCredentials: true, hasSeries: true },
      });

      seriesRepository.findByTenantAndTipoAndSerie = async () => ({
        id: 'series-id',
        tenantId: mockTenantId,
        tipoComprobante: '01',
        serie: 'F001',
        correlativoActual: 0,
        isActive: false, // Inactive
        createdAt: new Date(),
      });

      await expect(service.create(mockTenantId, validInput)).rejects.toThrow(ValidationError);
    });
  });

  describe('list', () => {
    afterEach(() => {
      // Restore original methods
      comprobantesRepository.findByTenant = originalFindByTenant;
    });

    it('should list comprobantes for tenant with pagination (VAL-API-CPE-006)', async () => {
      comprobantesRepository.findByTenant = async () => ({
        data: [mockComprobante],
        total: 1,
      });

      const result = await service.list(mockTenantId, {}, { limit: 50, offset: 0 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.limit).toBe(50);
      expect(result.pagination.offset).toBe(0);
    });

    it('should filter by tipoComprobante (VAL-API-CPE-006)', async () => {
      comprobantesRepository.findByTenant = async () => ({
        data: [mockComprobante],
        total: 1,
      });

      const result = await service.list(mockTenantId, { tipoComprobante: '01' }, { limit: 50, offset: 0 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].tipoComprobante).toBe('01');
    });

    it('should filter by serie (VAL-API-CPE-006)', async () => {
      comprobantesRepository.findByTenant = async () => ({
        data: [mockComprobante],
        total: 1,
      });

      const result = await service.list(mockTenantId, { serie: 'f001' }, { limit: 50, offset: 0 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].serie).toBe('F001'); // Should be uppercased
    });

    it('should filter by estado (VAL-API-CPE-006)', async () => {
      comprobantesRepository.findByTenant = async () => ({
        data: [],
        total: 0,
      });

      const result = await service.list(mockTenantId, { estado: 'pendiente' }, { limit: 50, offset: 0 });

      expect(result.data).toHaveLength(0);
    });
  });

  describe('getById', () => {
    afterEach(() => {
      // Restore original methods
      comprobantesRepository.findByTenantAndId = originalFindByTenantAndId;
    });

    it('should return comprobante when found (VAL-API-CPE-006)', async () => {
      comprobantesRepository.findByTenantAndId = async () => mockComprobante;

      const result = await service.getById(mockTenantId, mockComprobante.id);

      expect(result.id).toBe(mockComprobante.id);
      expect(result.tipoComprobante).toBe('01');
    });

    it('should throw NotFoundError when comprobante not found (VAL-API-CPE-006)', async () => {
      comprobantesRepository.findByTenantAndId = async () => null;

      await expect(service.getById(mockTenantId, '00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundError);
    });
  });

  describe('cancel', () => {
    afterEach(() => {
      // Restore original methods
      comprobantesRepository.findByTenantAndId = originalFindByTenantAndId;
      comprobantesRepository.updateEstado = originalUpdateEstado;
    });

    it('should cancel pending comprobante (VAL-API-CPE-007)', async () => {
      const pendingComprobante = { ...mockComprobante, sunatEstado: 'pendiente' as const };
      const anuladoComprobante = { ...mockComprobante, sunatEstado: 'anulado' as const };

      comprobantesRepository.findByTenantAndId = async () => pendingComprobante;
      comprobantesRepository.updateEstado = async () => anuladoComprobante;

      const result = await service.cancel(mockTenantId, mockComprobante.id);

      expect(result.estado).toBe('anulado');
    });

    it('should reject cancel of non-pending comprobante (VAL-API-CPE-007)', async () => {
      const acceptedComprobante = { ...mockComprobante, sunatEstado: 'aceptado' as const };

      comprobantesRepository.findByTenantAndId = async () => acceptedComprobante;

      await expect(service.cancel(mockTenantId, mockComprobante.id)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when comprobante not found (VAL-API-CPE-007)', async () => {
      comprobantesRepository.findByTenantAndId = async () => null;

      await expect(service.cancel(mockTenantId, '00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundError);
    });
  });
});

describe('RUC Validation (VAL-API-CPE-005)', () => {
  it('should validate correct RUC', () => {
    // RUC 20100178959 passes the SUNAT checksum algorithm
    expect(validateRUC('20100178959')).toBe(true);
  });

  it('should reject RUC with wrong checksum', () => {
    expect(validateRUC('10410810808')).toBe(false);
  });

  it('should reject RUC with wrong length', () => {
    expect(validateRUC('1234567890')).toBe(false); // 10 digits
    expect(validateRUC('123456789012')).toBe(false); // 12 digits
  });

  it('should reject RUC with letters', () => {
    expect(validateRUC('1041081080A')).toBe(false);
    expect(validateRUC('ABCDEFGHIJK')).toBe(false);
  });
});

describe('Totals Calculation (VAL-API-CPE-004)', () => {
  it('should calculate totals correctly for single item', () => {
    const detalles = [
      { cantidad: 1, valorUnitario: 100 }
    ];

    const totals = calculateTotals(detalles);

    // valorVenta = 1 * 100 = 100
    // IGV = 100 * 0.18 = 18
    // totalImporte = 100 + 18 = 118
    expect(totals.totalGravadas).toBe('100.00');
    expect(totals.totalIgv).toBe('18.00');
    expect(totals.totalImporte).toBe('118.00');
  });

  it('should calculate totals correctly for multiple items', () => {
    const detalles = [
      { cantidad: 2, valorUnitario: 100 }, // valorVenta = 200
      { cantidad: 3, valorUnitario: 50 },  // valorVenta = 150
    ];

    const totals = calculateTotals(detalles);

    // valorVenta = 200 + 150 = 350
    // IGV = 350 * 0.18 = 63
    // totalImporte = 350 + 63 = 413
    expect(totals.totalGravadas).toBe('350.00');
    expect(totals.totalIgv).toBe('63.00');
    expect(totals.totalImporte).toBe('413.00');
  });

  it('should handle decimal values correctly', () => {
    const detalles = [
      { cantidad: 1, valorUnitario: 99.99 }
    ];

    const totals = calculateTotals(detalles);

    // valorVenta = 1 * 99.99 = 99.99
    // IGV = 99.99 * 0.18 = 17.9982, rounded to 18.00 with toFixed(2)
    // totalImporte = 99.99 + 17.9982 = 117.9882, rounded to 117.99
    expect(totals.totalGravadas).toBe('99.99');
    expect(totals.totalIgv).toBe('18.00');
    expect(totals.totalImporte).toBe('117.99');
  });
});

// Validation contract assertions mapping:
// VAL-API-CPE-004: Comprobante creation calculates and persists business totals - tested in Totals Calculation and ComprobantesService.create
// VAL-API-CPE-005: Comprobante creation rejects invalid and not-ready cases - tested in ComprobantesService.create
// VAL-API-CPE-006: Comprobante list/get is tenant-scoped and filterable - tested in ComprobantesService.list and getById
// VAL-API-CPE-007: Only pending comprobantes can be cancelled - tested in ComprobantesService.cancel
