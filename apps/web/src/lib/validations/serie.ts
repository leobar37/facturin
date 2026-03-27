/**
 * Serie Validation
 * Comprobante series: F001, B001, etc.
 */

export type SerieValidationResult = {
  isValid: boolean;
  error?: string;
};

const SERIE_REGEX = /^[A-Z0-9]{4}$/;

export function validateSerieFormat(serie: string): SerieValidationResult {
  if (!serie) {
    return { isValid: false, error: 'La serie es requerida' };
  }

  if (!SERIE_REGEX.test(serie.toUpperCase())) {
    return { isValid: false, error: 'La serie debe tener 4 caracteres alfanuméricos (ej: F001)' };
  }

  return { isValid: true };
}

export function isValidSerieFormat(serie: string): boolean {
  return validateSerieFormat(serie).isValid;
}

export function normalizeSerie(serie: string): string {
  return serie.toUpperCase();
}
