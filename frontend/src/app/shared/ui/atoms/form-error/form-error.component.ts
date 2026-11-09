import { Component, Input, inject, ChangeDetectionStrategy } from '@angular/core';

import { AbstractControl } from '@angular/forms';
import { ValidationService } from '../../services/validation.service';

/**
 * Component for displaying form validation errors.
 * Automatically integrates with ValidationService to display error messages.
 * 
 * @example
 * ```html
 * <form [formGroup]="form">
 *   <input formControlName="email" />
 *   <app-form-error [control]="form.get('email')"></app-form-error>
 * </form>
 * ```
 */
@Component({
  selector: 'app-form-error',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showError) {
      <div class="form-error" role="alert" aria-live="polite">
        <i class="fa-solid fa-circle-exclamation error-icon" aria-hidden="true"></i>
        <span class="error-message">{{ errorMessage }}</span>
      </div>
    }
  `,
  styles: [`
    .form-error {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
      margin-top: var(--space-1);
      font-size: 0.8125rem;
      color: var(--danger-color, #ef4444);
      animation: error-in 150ms ease;
    }

    @keyframes error-in {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .error-icon {
      font-size: var(--space-3);
      margin-top: var(--space-1);
      flex-shrink: 0;
    }

    .error-message {
      line-height: 1.4;
    }
  `]
})
export class FormErrorComponent {
  private readonly validationService = inject(ValidationService);

  /** The form control to validate */
  @Input() control: AbstractControl | null = null;

  /** Custom error message (overrides automatic message) */
  @Input() customMessage?: string;

  /** Whether to show error only when touched (default: true) */
  @Input() showOnTouched = true;

  get showError(): boolean {
    if (this.customMessage) return true;
    if (!this.control) return false;

    if (this.showOnTouched) {
      return this.control.invalid && this.control.touched;
    }

    return this.control.invalid;
  }

  get errorMessage(): string {
    if (this.customMessage) {
      return this.customMessage;
    }
    return this.validationService.getErrorMessage(this.control);
  }
}
