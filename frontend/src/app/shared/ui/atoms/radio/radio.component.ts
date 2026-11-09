import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';

import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface RadioOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

/**
 * Componente Radio Button con diseño coherente al CheckboxComponent.
 * Implementa ControlValueAccessor para integración con formularios.
 * 
 * @example
 * ```html
 * <app-radio 
 *   name="preference"
 *   [options]="[
 *     { value: 'email', label: 'Email' },
 *     { value: 'phone', label: 'Teléfono' }
 *   ]"
 *   [(ngModel)]="selectedPreference"
 * ></app-radio>
 * ```
 */
@Component({
  selector: 'app-radio',
  standalone: true,
  imports: [],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioComponent),
      multi: true
    }
  ],
  template: `
    <div class="radio-group" [class.horizontal]="direction === 'horizontal'" [class.disabled]="disabled" role="radiogroup" [attr.aria-label]="label">
      @if (label) {
        <span class="radio-group-label">{{ label }}</span>
      }

      <div class="radio-options" [class.horizontal]="direction === 'horizontal'">
        @for (option of options; track option.value) {
          <label 
            class="radio-wrapper" 
            [class.disabled]="disabled || option.disabled"
            [class.selected]="selectedValue === option.value"
          >
            <input
              type="radio"
              class="radio-input"
              [name]="name"
              [value]="option.value"
              [checked]="selectedValue === option.value"
              [disabled]="disabled || option.disabled"
              (change)="onRadioChange(option.value)"
            />
            <span class="radio-circle">
              <span class="radio-dot"></span>
            </span>
            <span class="radio-label">{{ option.label }}</span>
          </label>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .radio-group-label {
      font-size: var(--text-sm);
      font-weight: var(--font-weight-body);
      color: var(--text-color);
      margin-bottom: var(--space-1);
    }

    .radio-options {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .radio-options.horizontal {
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--space-4);
    }

    .radio-wrapper {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      cursor: pointer;
      user-select: none;
      padding: var(--space-1) 0;
    }

    .radio-wrapper.disabled {
      cursor: not-allowed;
      color: var(--input-disabled-text);
    }

    .radio-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .radio-circle {
      width: var(--checkbox-size, var(--space-5));
      height: var(--checkbox-size, var(--space-5));
      display: flex;
      align-items: center;
      justify-content: center;
      border: var(--space-1) solid var(--border-color);
      border-radius: var(--radius-full);
      background: var(--surface-background);
      transition: all 200ms ease;
      flex-shrink: 0;
    }

    .radio-dot {
      width: calc(var(--checkbox-size, var(--space-5)) * 0.5);
      height: calc(var(--checkbox-size, var(--space-5)) * 0.5);
      border-radius: var(--radius-full);
      background: var(--text-color-on-primary);
      opacity: 0;
      transform: scale(0);
      transition: all 200ms ease;
    }

    /* Hover */
    .radio-wrapper:hover:not(.disabled) .radio-circle {
      border-color: var(--primary-color);
    }

    /* Selected */
    .radio-input:checked + .radio-circle {
      background: var(--primary-color);
      border-color: var(--primary-color);
    }

    .radio-input:checked + .radio-circle .radio-dot {
      opacity: 1;
      transform: scale(1);
    }

    /* Focus */
    .radio-input:focus-visible + .radio-circle {
      box-shadow: var(--input-shadow-focus);
    }

    .radio-label {
      font-size: var(--text-sm);
      color: var(--text-color);
      line-height: 1.4;
    }

    /* Selected label styling */
    .radio-wrapper.selected .radio-label {
      color: var(--primary-color);
      font-weight: var(--font-weight-body);
    }

    .radio-group.disabled .radio-group-label,
    .radio-wrapper.disabled .radio-label {
      color: var(--input-disabled-text);
    }

    .radio-wrapper.disabled .radio-circle {
      background: var(--input-disabled-bg);
      border-color: var(--input-disabled-text);
    }

    .radio-wrapper.disabled .radio-input:checked + .radio-circle {
      background: var(--input-disabled-text);
      border-color: var(--input-disabled-text);
    }

    .radio-wrapper.disabled .radio-dot {
      background: var(--input-disabled-bg);
    }
  `]
})
export class RadioComponent implements ControlValueAccessor {
  @Input() name = 'radio-group';
  @Input() label = '';
  @Input() options: RadioOption[] = [];
  @Input() direction: 'horizontal' | 'vertical' = 'vertical';
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<string | number>();

  selectedValue: string | number = '';
  onChange: (value: string | number) => void = () => { /* noop */ };
  onTouched: () => void = () => { /* noop */ };

  onRadioChange(value: string | number): void {
    this.selectedValue = value;
    this.onChange(value);
    this.valueChange.emit(value);
    this.onTouched();
  }

  writeValue(value: string | number): void {
    this.selectedValue = value ?? '';
  }

  registerOnChange(fn: (value: string | number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
