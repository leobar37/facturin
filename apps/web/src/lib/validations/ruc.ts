/**
 * RUC (Registro Único de Contribuyentes) Validation
 * Peruvian tax identification number - 11 digits with checksum verification
 */

export type RucValidationResult = {
  isValid: boolean;
  error?: string;
};

const RUC_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export function validateRuc(ruc: string): RucValidationResult {
  if (!ruc) {
    return { isValid: false, error: 'El RUC es requerido' };
  }

  if (!/^[0-9]{11}$/.test(ruc)) {
    return { isValid: false, error: 'El RUC debe tener 11 dígitos' };
  }

  // Checksum verification using official algorithm
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(ruc[i]) * RUC_WEIGHTS[i];
  }

  const remainder = sum % 11;
  const checkDigit = 11 - remainder;
  const expectedCheckDigit = checkDigit === 10 ? 0 : checkDigit === 11 ? 1 : checkDigit;

  if (expectedCheckDigit !== parseInt(ruc[10])) {
    return { isValid: false, error: 'El RUC no es válido (dígito verificador incorrecto)' };
  }

  return { isValid: true };
}

export function isValidRuc(ruc: string): boolean {
  return validateRuc(ruc).isValid;
}
