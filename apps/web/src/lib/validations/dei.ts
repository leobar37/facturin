/**
 * DEI (Documento de Identidad) Validation
 * Peruvian identity documents: DNI, CE, Passport
 */

export type DeiType = 'dni' | 'ce' | 'passport';

export type DeiValidationResult = {
  isValid: boolean;
  error?: string;
};

export function validateDni(dni: string): DeiValidationResult {
  if (!dni) {
    return { isValid: false, error: 'El DNI es requerido' };
  }

  if (!/^[0-9]{8}$/.test(dni)) {
    return { isValid: false, error: 'El DNI debe tener 8 dígitos' };
  }

  return { isValid: true };
}

export function validateCe(ce: string): DeiValidationResult {
  if (!ce) {
    return { isValid: false, error: 'El CE es requerido' };
  }

  if (!/^[0-9]{9,12}$/.test(ce)) {
    return { isValid: false, error: 'El CE debe tener entre 9 y 12 dígitos' };
  }

  return { isValid: true };
}

export function validatePassport(passport: string): DeiValidationResult {
  if (!passport) {
    return { isValid: false, error: 'El pasaporte es requerido' };
  }

  if (!/^[A-Za-z0-9]{6,12}$/.test(passport)) {
    return { isValid: false, error: 'El pasaporte debe tener entre 6 y 12 caracteres alfanuméricos' };
  }

  return { isValid: true };
}

export function validateDei(value: string, type: DeiType): DeiValidationResult {
  switch (type) {
    case 'dni':
      return validateDni(value);
    case 'ce':
      return validateCe(value);
    case 'passport':
      return validatePassport(value);
    default:
      return { isValid: false, error: 'Tipo de documento no válido' };
  }
}

export function isValidDni(dni: string): boolean {
  return validateDni(dni).isValid;
}

export function isValidCe(ce: string): boolean {
  return validateCe(ce).isValid;
}

export function isValidPassport(passport: string): boolean {
  return validatePassport(passport).isValid;
}
