import { Component, Input, forwardRef } from '@angular/core';

import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxComponent),
      multi: true
    }
  ],
  template: `
    <label class="checkbox-wrapper" [class.disabled]="disabled">
      <input
        type="checkbox"
        class="checkbox-input"
        [checked]="checked"
        [disabled]="disabled"
        (change)="onCheckChange($event)"
      />
      <span class="checkbox-box">
        <svg class="checkbox-check" viewBox="0 0 12 12" fill="none">
          <path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span class="checkbox-label">{{ label }}<ng-content></ng-content></span>
    </label>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    .checkbox-wrapper {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      cursor: pointer;
      user-select: none;
    }

    .checkbox-wrapper.disabled {
      cursor: not-allowed;
      color: var(--input-disabled-text);
    }

    .checkbox-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .checkbox-box {
      width: var(--checkbox-size, var(--space-5));
      height: var(--checkbox-size, var(--space-5));
      display: flex;
      align-items: center;
      justify-content: center;
      border: var(--space-1) solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--surface-background);
      transition: all 200ms ease;
      flex-shrink: 0;
    }

    .checkbox-check {
      width: var(--checkbox-icon-size, 0.875rem);
      height: var(--checkbox-icon-size, 0.875rem);
      color: var(--text-color-on-primary);
      opacity: 0;
      transform: scale(0.5);
      transition: all 200ms ease;
    }

    /* Hover */
    .checkbox-wrapper:hover:not(.disabled) .checkbox-box {
      border-color: var(--primary-color);
    }

    /* Checked */
    .checkbox-input:checked + .checkbox-box {
      background: var(--primary-color);
      border-color: var(--primary-color);
    }

    .checkbox-input:checked + .checkbox-box .checkbox-check {
      opacity: 1;
      transform: scale(1);
    }

    /* Focus */
    .checkbox-input:focus-visible + .checkbox-box {
      box-shadow: var(--input-shadow-focus);
    }

    .checkbox-label {
      font-size: var(--text-sm);
      color: var(--text-color);
      line-height: 1.4;
    }

    .checkbox-wrapper.disabled .checkbox-label {
      color: var(--input-disabled-text);
    }

    .checkbox-wrapper.disabled .checkbox-box {
      background: var(--input-disabled-bg);
      border-color: var(--input-disabled-text);
    }

    .checkbox-wrapper.disabled .checkbox-input:checked + .checkbox-box {
      background: var(--input-disabled-text);
      border-color: var(--input-disabled-text);
    }

    .checkbox-wrapper.disabled .checkbox-check {
      color: var(--input-disabled-bg);
    }

    /*
     * Dark mode se maneja automáticamente via tokens semánticos.
     * --surface-background, --border-color, --primary-color, --shadow-focus-primary
     * ya tienen valores apropiados para temas oscuros.
     */
  `]
})
export class CheckboxComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() disabled = false;

  checked = false;
  onChange: (value: boolean) => void = () => { /* noop */ };
  onTouched: () => void = () => { /* noop */ };

  onCheckChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.checked = target.checked;
    this.onChange(this.checked);
    this.onTouched();
  }

  writeValue(value: boolean): void {
    this.checked = value || false;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
