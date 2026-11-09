import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * FormBuilderHelper — Utilidades para construir y validar formularios reactivos.
 *
 * Incluye:
 * - Validadores personalizados
 * - Helpers para mensajes de error
 * - Utilidad para marcar formulario como touched
 * - Validador de confirmación de contraseña
 *
 * @example
 * ```typescript
 * import { FormBuilderHelper } from '@shared/ui';
 *
 * form = this.fb.group({
 *   email: ['', [Validators.required, FormBuilderHelper.emailValidator]],
 *   password: ['', [Validators.required, Validators.minLength(8)]],
 *   confirmPassword: [''],
 * }, { validators: FormBuilderHelper.passwordMatchValidator('password', 'confirmPassword') });
 *
 * getError(field: string): string {
 *   return FormBuilderHelper.getErrorMessage(this.form.get(field)!);
 * }
 * ```
 */
export class FormBuilderHelper {

  // ============================================================
  // VALIDADORES
  // ============================================================

  /**
   * Valida que el email tenga formato correcto.
   */
  static emailValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (!value) return null;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(value) ? null : { email: true };
  }

  /**
   * Valida que la contraseña tenga al menos una mayúscula, minúscula y número.
   */
  static strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (!value) return null;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    if (hasUpperCase && hasLowerCase && hasNumber) return null;
    return {
      weakPassword: {
        hasUpperCase,
        hasLowerCase,
        hasNumber,
      },
    };
  }

  /**
   * Valida formato de DNI/RUC argentino (7-8 dígitos).
   * @customize Ajusta la regex a tu país.
   */
  static dniValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (!value) return null;
    const dniRegex = /^\d{7,8}$/;
    return dniRegex.test(value.replace(/\./g, '')) ? null : { invalidDNI: true };
  }

  /**
   * Valida que un número sea positivo.
   */
  static positiveNumberValidator(control: AbstractControl): ValidationErrors | null {
    const value = Number(control.value);
    if (isNaN(value)) return { notANumber: true };
    return value > 0 ? null : { notPositive: true };
  }

  /**
   * Validador de grupo: verifica que dos campos coincidan.
   * @param controlName campo principal
   * @param matchingControlName campo de confirmación
   */
  static passwordMatchValidator(
    controlName: string,
    matchingControlName: string
  ): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const form = group as FormGroup;
      const control = form.controls[controlName];
      const matching = form.controls[matchingControlName];

      if (!control || !matching) return null;
      if (matching.errors && !matching.errors['passwordMismatch']) return null;

      if (control.value !== matching.value) {
        matching.setErrors({ passwordMismatch: true });
        return { passwordMismatch: true };
      } else {
        matching.setErrors(null);
        return null;
      }
    };
  }

  // ============================================================
  // HELPERS DE MENSAJES
  // ============================================================

  /** Mensajes de error por defecto en español */
  static readonly ERROR_MESSAGES: Record<string, string | ((params: Record<string, unknown>) => string)> = {
    required:         'Este campo es requerido',
    email:            'Ingresa un email válido',
    minlength:        (p) => `Mínimo ${p['requiredLength']} caracteres`,
    maxlength:        (p) => `Máximo ${p['requiredLength']} caracteres`,
    min:              (p) => `El valor mínimo es ${p['min']}`,
    max:              (p) => `El valor máximo es ${p['max']}`,
    pattern:          'Formato inválido',
    passwordMismatch: 'Las contraseñas no coinciden',
    weakPassword:     'La contraseña debe tener mayúsculas, minúsculas y números',
    invalidDNI:       'DNI inválido',
    notPositive:      'El valor debe ser mayor a 0',
    notANumber:       'Ingresa un número válido',
  };

  /**
   * Obtiene el primer mensaje de error de un control.
   * Retorna string vacío si el control es válido o no fue tocado.
   */
  static getErrorMessage(
    control: AbstractControl | null,
    customMessages: Record<string, string> = {}
  ): string {
    if (!control || !control.errors || (!control.touched && !control.dirty)) {
      return '';
    }

    const errorKey = Object.keys(control.errors)[0];
    const errorParams = control.errors[errorKey] as Record<string, unknown>;
    const messages = { ...FormBuilderHelper.ERROR_MESSAGES, ...customMessages };
    const message = messages[errorKey];

    if (!message) return `Error: ${errorKey}`;
    if (typeof message === 'function') return message(errorParams ?? {});
    return message;
  }

  // ============================================================
  // UTILIDADES DE FORMULARIO
  // ============================================================

  /**
   * Marca todos los campos del formulario como touched para mostrar errores.
   * Útil antes de enviar cuando el usuario no tocó ningún campo.
   */
  static markAllAsTouched(form: FormGroup): void {
    Object.values(form.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        FormBuilderHelper.markAllAsTouched(control);
      }
    });
  }

  /**
   * Extrae solo los campos con valor no nulo/vacío de un formulario.
   * Útil para peticiones PATCH donde solo se envían campos modificados.
   */
  static getDirtyValues<T>(form: FormGroup): Partial<T> {
    const result: Record<string, unknown> = {};
    Object.keys(form.controls).forEach(key => {
      const control = form.controls[key];
      if (control.dirty) {
        result[key] = control.value;
      }
    });
    return result as Partial<T>;
  }

  /**
   * Resetea el formulario y limpia los estados de validación.
   */
  static resetForm(form: FormGroup, value: Record<string, unknown> = {}): void {
    form.reset(value);
    Object.values(form.controls).forEach(control => {
      control.setErrors(null);
      control.markAsPristine();
      control.markAsUntouched();
    });
  }
}
