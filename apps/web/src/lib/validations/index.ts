/**
 * Validation Utilities
 * Centralized validation functions for Peruvian tax and identity documents
 */

export {
  validateRuc,
  isValidRuc,
  type RucValidationResult,
} from './ruc';

export {
  validateDni,
  validateCe,
  validatePassport,
  validateDei,
  isValidDni,
  isValidCe,
  isValidPassport,
  type DeiType,
  type DeiValidationResult,
} from './dei';

export {
  validateEmail,
  isValidEmail,
  type EmailValidationResult,
} from './email';

export {
  validateSunatUsername,
  validateSunatPassword,
  isValidSunatUsername,
  isValidSunatPassword,
  type SunatUsernameValidationResult,
  type SunatPasswordValidationResult,
} from './sunat';

export {
  validateSerieFormat,
  isValidSerieFormat,
  normalizeSerie,
  type SerieValidationResult,
} from './serie';
