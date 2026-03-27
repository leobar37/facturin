/**
 * Email Validation
 */

export type EmailValidationResult = {
  isValid: boolean;
  error?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): EmailValidationResult {
  if (!email) {
    return { isValid: true }; // Email is optional
  }

  if (!EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'El email no es válido' };
  }

  return { isValid: true };
}

export function isValidEmail(email: string): boolean {
  return validateEmail(email).isValid;
}
