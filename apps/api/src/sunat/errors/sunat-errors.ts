// SUNAT error code mappings to user-friendly messages
// Based on official SUNAT documentation

export interface SunatError {
  code: string;
  message: string;
  category: 'validation' | 'soap' | 'sunat' | 'system';
}

export const SUNAT_ERRORS: Record<string, SunatError> = {
  // ====================================================================
  // SOAP / Communication Errors (1000-1999)
  // ====================================================================
  '1000': {
    code: '1000',
    message: 'El usuario o contraseña del servicio web están incorrectos',
    category: 'soap',
  },
  '1001': {
    code: '1001',
    message: 'El usuario no tiene acceso al servicio web',
    category: 'soap',
  },
  '1002': {
    code: '1002',
    message: 'El certificado esta vencido',
    category: 'soap',
  },
  '1003': {
    code: '1003',
    message: 'El formato del XML es incorrecto',
    category: 'soap',
  },
  '1004': {
    code: '1004',
    message: 'Error en el parsing del XML',
    category: 'soap',
  },
  '1005': {
    code: '1005',
    message: 'Error en el SOAP envelope',
    category: 'soap',
  },
  '1006': {
    code: '1006',
    message: 'El servicio web no esta disponible',
    category: 'soap',
  },
  '1007': {
    code: '1007',
    message: 'Timeout en el servicio web',
    category: 'soap',
  },

  // ====================================================================
  // SUNAT Application Errors (2000-3999)
  // ====================================================================
  '2000': {
    code: '2000',
    message: 'La estructura del documento electrónico contiene errores de formato',
    category: 'sunat',
  },
  '2001': {
    code: '2001',
    message: 'El documento no existe',
    category: 'sunat',
  },
  '2002': {
    code: '2002',
    message: 'El documento ya fue informado',
    category: 'sunat',
  },
  '2003': {
    code: '2003',
    message: 'El documentoelectronico ha sido rechazado',
    category: 'sunat',
  },
  '2010': {
    code: '2010',
    message: 'Error en la firma del documento electrónico',
    category: 'sunat',
  },
  '2011': {
    code: '2011',
    message: 'La firma no es válida',
    category: 'sunat',
  },
  '2020': {
    code: '2020',
    message: 'El RUC del emisor no existe',
    category: 'sunat',
  },
  '2021': {
    code: '2021',
    message: 'El RUC del emisor no esta habilitado para(emir documentos electrónicos',
    category: 'sunat',
  },
  '2022': {
    code: '2022',
    message: 'El numero de documento del receptor no es válido',
    category: 'sunat',
  },
  '2023': {
    code: '2023',
    message: 'La serie del documento no existe',
    category: 'sunat',
  },
  '2024': {
    code: '2024',
    message: 'El numero de documento ya fue utilizado',
    category: 'sunat',
  },
  '2030': {
    code: '2030',
    message: 'La fecha de emisión no puede ser mayor a la fecha actual',
    category: 'sunat',
  },
  '2031': {
    code: '2031',
    message: 'La fecha de emisión no puede ser menor a la fecha de envío',
    category: 'sunat',
  },
  '2040': {
    code: '2040',
    message: 'El monto total es menor al valor mínimo',
    category: 'sunat',
  },
  '2050': {
    code: '2050',
    message: 'El tipo de documento del receptor no corresponde con el monto',
    category: 'sunat',
  },
  '2060': {
    code: '2060',
    message: 'El documento de referência no corresponde a una nota',
    category: 'sunat',
  },
  '2070': {
    code: '2070',
    message: 'El monto total no coincide con la suma de los items',
    category: 'sunat',
  },
  '2080': {
    code: '2080',
    message: 'La suma de impuestos es mayor al monto total',
    category: 'sunat',
  },
  '2090': {
    code: '2090',
    message: 'El descuento global supera el monto total',
    category: 'sunat',
  },
  '2100': {
    code: '2100',
    message: 'El código del producto/servicio no existe en el catálogo',
    category: 'sunat',
  },
  '2110': {
    code: '2110',
    message: 'La cantidad del item debe ser mayor a cero',
    category: 'sunat',
  },
  '2120': {
    code: '2120',
    message: 'El precio unitario debe ser mayor a cero',
    category: 'sunat',
  },
  '2130': {
    code: '2130',
    message: 'El código de affectéación del IGV no es válido',
    category: 'sunat',
  },
  '2140': {
    code: '2140',
    message: 'El tipo de documento de老爷子 no es válido',
    category: 'sunat',
  },
  '2150': {
    code: '2150',
    message: 'La observación excede el número máximo de caracteres',
    category: 'sunat',
  },

  // ====================================================================
  // Ticket-based Processing Errors (3000-3999)
  // ====================================================================
  '3000': {
    code: '3000',
    message: 'El ticket aún esta en proceso',
    category: 'sunat',
  },
  '3001': {
    code: '3001',
    message: 'El ticket ha expirado',
    category: 'sunat',
  },
  '3002': {
    code: '3002',
    message: 'El ticket no existe',
    category: 'sunat',
  },

  // ====================================================================
  // Voided Document Errors (4000-4999)
  // ====================================================================
  '4000': {
    code: '4000',
    message: 'El documento a dar de baja no existe',
    category: 'sunat',
  },
  '4001': {
    code: '4001',
    message: 'El documento ya ha sido dado de baja anteriormente',
    category: 'sunat',
  },
  '4002': {
    code: '4002',
    message: 'El documento no puede ser dado de baja por estar en proceso',
    category: 'sunat',
  },
  '4003': {
    code: '4003',
    message: 'La fecha de baja no puede ser mayor a la fecha actual',
    category: 'sunat',
  },
  '4004': {
    code: '4004',
    message: 'La fecha de baja no puede ser menor a la fecha de emisión',
    category: 'sunat',
  },

  // ====================================================================
  // Summary Document Errors (5000-5999)
  // ====================================================================
  '5000': {
    code: '5000',
    message: 'El resumen diario contiene errores de formato',
    category: 'sunat',
  },
  '5001': {
    code: '5001',
    message: 'La fecha del resumen no puede ser mayor a la fecha actual',
    category: 'sunat',
  },
  '5002': {
    code: '5002',
    message: 'El resumen ya fue enviado',
    category: 'sunat',
  },
  '5003': {
    code: '5003',
    message: 'El ticket del resumen no existe',
    category: 'sunat',
  },

  // ====================================================================
  // System Errors (9000-9999)
  // ====================================================================
  '9000': {
    code: '9000',
    message: 'Error interno del sistema',
    category: 'system',
  },
  '9001': {
    code: '9001',
    message: 'Error de base de datos',
    category: 'system',
  },
  '9002': {
    code: '9002',
    message: 'Error de conexión con SUNAT',
    category: 'system',
  },
  '9003': {
    code: '9003',
    message: 'Error de timeout',
    category: 'system',
  },
  '9004': {
    code: '9004',
    message: 'Error de firma digital',
    category: 'system',
  },
  '9005': {
    code: '9005',
    message: 'Error de certificado digital',
    category: 'system',
  },
} as const;

export class SunatErrorCode extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'SunatErrorCode';
  }
}

export function getSunatError(code: string): SunatError {
  return (
    SUNAT_ERRORS[code] || {
      code,
      message: 'Error desconocido en SUNAT',
      category: 'system' as const,
    }
  );
}

export function parseSunatErrorCode(code: string | number): string {
  const numCode = typeof code === 'string' ? parseInt(code, 10) : code;

  if (isNaN(numCode)) {
    return 'Código de error inválido';
  }

  // Map ranges to error categories
  if (numCode === 0) {
    return 'Aceptado';
  }

  if (numCode >= 1000 && numCode < 2000) {
    const error = SUNAT_ERRORS[String(numCode)];
    return error ? error.message : `Error de comunicación (${numCode})`;
  }

  if (numCode >= 2000 && numCode < 3000) {
    const error = SUNAT_ERRORS[String(numCode)];
    return error ? error.message : `Error de validación del documento (${numCode})`;
  }

  if (numCode === 98) {
    return 'En proceso de consulta';
  }

  if (numCode === 99) {
    return 'Excepción en el procesamiento';
  }

  if (numCode >= 3000 && numCode < 4000) {
    const error = SUNAT_ERRORS[String(numCode)];
    return error ? error.message : `Error de ticket (${numCode})`;
  }

  if (numCode >= 4000 && numCode < 5000) {
    const error = SUNAT_ERRORS[String(numCode)];
    return error ? error.message : `Error de baja (${numCode})`;
  }

  if (numCode >= 5000) {
    return 'Procesamiento exitoso';
  }

  return `Error desconocido (${numCode})`;
}

export function isSunatAcceptanceCode(code: number | string): boolean {
  const numCode = typeof code === 'string' ? parseInt(code, 10) : code;
  return numCode === 0 || numCode >= 4000;
}

export function isSunatRejectionCode(code: number | string): boolean {
  const numCode = typeof code === 'string' ? parseInt(code, 10) : code;
  return numCode >= 2000 && numCode < 4000;
}

export function isSunatExceptionCode(code: number | string): boolean {
  const numCode = typeof code === 'string' ? parseInt(code, 10) : code;
  return numCode === 99 || (numCode >= 100 && numCode < 2000);
}
