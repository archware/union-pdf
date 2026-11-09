import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Validation error message configuration.
 */
export interface ValidationMessage {
  key: string;
  message: string | ((params?: Record<string, unknown>) => string);
}

/**
 * Default validation error messages in Spanish.
 */
export const DEFAULT_VALIDATION_MESSAGES: Record<string, string | ((params?: Record<string, unknown>) => string)> = {
  required: 'Este campo es requerido',
  email: 'Ingrese un email válido',
  minlength: (params) => `Mínimo ${params?.['requiredLength'] || 0} caracteres`,
  maxlength: (params) => `Máximo ${params?.['requiredLength'] || 0} caracteres`,
  min: (params) => `El valor mínimo es ${params?.['min'] || 0}`,
  max: (params) => `El valor máximo es ${params?.['max'] || 0}`,
  pattern: 'Formato inválido',
  passwordMismatch: 'Las contraseñas no coinciden',
  invalidDate: 'Fecha inválida',
  futureDate: 'La fecha no puede ser futura',
  pastDate: 'La fecha no puede ser pasada',
  invalidPhone: 'Número de teléfono inválido',
  invalidDNI: 'DNI/Documento inválido',
  invalidRUC: 'RUC inválido',
};

/**
 * Service for handling form validation and error messages.
 * 
 * @example
 * ```typescript
 * // In component
 * constructor(private validationService: ValidationService) {}
 * 
 * getError(control: AbstractControl): string {
 *   return this.validationService.getErrorMessage(control);
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  private customMessages: Record<string, string | ((params?: Record<string, unknown>) => string)> = {};

  /**
   * Get the first error message for a control.
   */
  getErrorMessage(control: AbstractControl | null): string {
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    const errors = control.errors;
    const firstErrorKey = Object.keys(errors)[0];
    const errorParams = errors[firstErrorKey];

    return this.getMessage(firstErrorKey, errorParams);
  }

  /**
   * Get all error messages for a control.
   */
  getAllErrorMessages(control: AbstractControl | null): string[] {
    if (!control || !control.errors || !control.touched) {
      return [];
    }

    return Object.entries(control.errors).map(([key, params]) =>
      this.getMessage(key, params)
    );
  }

  /**
   * Set custom validation messages.
   */
  setCustomMessages(messages: Record<string, string | ((params?: Record<string, unknown>) => string)>): void {
    this.customMessages = { ...this.customMessages, ...messages };
  }

  /**
   * Get message for a specific error key.
   */
  private getMessage(errorKey: string, params?: unknown): string {
    const message = this.customMessages[errorKey] || DEFAULT_VALIDATION_MESSAGES[errorKey];

    if (!message) {
      return `Error: ${errorKey}`;
    }

    if (typeof message === 'function') {
      return message(params as Record<string, unknown>);
    }

    return message;
  }

  // ============================================
  // Custom Validators
  // ============================================

  /**
   * Validates that passwords match.
   */
  static passwordMatch(passwordField: string, confirmField: string) {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get(passwordField);
      const confirm = control.get(confirmField);

      if (password && confirm && password.value !== confirm.value) {
        confirm.setErrors({ passwordMismatch: true });
        return { passwordMismatch: true };
      }
      return null;
    };
  }

  /**
   * Validates Peruvian DNI format (8 digits).
   */
  static dni(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const dniPattern = /^\d{8}$/;
    return dniPattern.test(value) ? null : { invalidDNI: true };
  }

  /**
   * Validates Peruvian RUC format (11 digits starting with 10 or 20).
   */
  static ruc(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const rucPattern = /^(10|20)\d{9}$/;
    return rucPattern.test(value) ? null : { invalidRUC: true };
  }

  /**
   * Validates phone number format.
   */
  static phone(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    // Accepts formats: 9XXXXXXXX, +51 9XXXXXXXX, 01 XXXXXXX
    const phonePattern = /^(\+51\s?)?9\d{8}$|^0[1-9]\s?\d{6,7}$/;
    return phonePattern.test(value.replace(/\s/g, '')) ? null : { invalidPhone: true };
  }

  /**
   * Validates that date is not in the future.
   */
  static notFutureDate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const inputDate = new Date(value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return inputDate > today ? { futureDate: true } : null;
  }

  /**
   * Validates that date is not in the past.
   */
  static notPastDate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const inputDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return inputDate < today ? { pastDate: true } : null;
  }
}
