/**
 * SUNAT Credentials Validation
 * SOL (Sistema Operativo en Línea) username and password validation
 */

export type SunatUsernameValidationResult = {
  isValid: boolean;
  error?: string;
};

export type SunatPasswordValidationResult = {
  isValid: boolean;
  error?: string;
};

const SUNAT_USERNAME_REGEX = /^[A-Za-z0-9]{6,20}$/;

export function validateSunatUsername(username: string): SunatUsernameValidationResult {
  if (!username) {
    return { isValid: false, error: 'El usuario SOL es requerido' };
  }

  if (!SUNAT_USERNAME_REGEX.test(username)) {
    return { isValid: false, error: 'El usuario SOL debe tener entre 6 y 20 caracteres alfanuméricos' };
  }

  return { isValid: true };
}

export function validateSunatPassword(password: string): SunatPasswordValidationResult {
  if (!password) {
    return { isValid: false, error: 'La contraseña SOL es requerida' };
  }

  if (password.length < 6) {
    return { isValid: false, error: 'La contraseña debe tener al menos 6 caracteres' };
  }

  return { isValid: true };
}

export function isValidSunatUsername(username: string): boolean {
  return validateSunatUsername(username).isValid;
}

export function isValidSunatPassword(password: string): boolean {
  return validateSunatPassword(password).isValid;
}
