import { Component, Input, forwardRef, ChangeDetectionStrategy } from '@angular/core';

import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type InputType = 'text' | 'date' | 'number' | 'password' | 'email' | 'tel';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ],
  template: `
    <div class="form-group" [class.has-error]="error" [class.disabled]="disabled">
      @if (label) {
        <label class="form-label" [attr.for]="inputId">{{ label }}</label>
      }
      <div class="input-container">
        @if (iconClass) {
          <i [class]="'input-icon ' + iconClass"></i>
        } @else if (icon) {
          <span class="input-icon">{{ icon }}</span>
        }
        <input
          [id]="inputId"
          class="form-input"
          [type]="type"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [value]="value"
          [attr.data-clipboard-policy]="type === 'password' ? 'paste-only' : null"
          (input)="onInput($event)"
          (blur)="onTouched()"
        />
      </div>
      @if (error) {
        <span class="input-error">{{ error }}</span>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    /* Reuse form-group styles from global if available, or define local */
    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .form-label {
      font-size: var(--text-sm);
      font-weight: 500;
      color: var(--info-color);
    }

    .input-container {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .input-icon {
      position: absolute;
      left: var(--space-3);
      font-size: var(--text-md);
      color: var(--text-color-muted);
      pointer-events: none;
      display: flex; /* Ensure centering */
      align-items: center;
      justify-content: center;
    }

    /* When icon is present, add padding */
    .input-container:has(.input-icon) .form-input {
      padding-left: var(--space-10, 2.5rem);
    }

    .form-input {
      width: 100%;
      height: var(--control-height);
      padding: 0 var(--space-4);
      border: var(--input-border-width, 1px) solid var(--input-border);
      border-radius: var(--radius-md);
      background-color: var(--input-bg);
      color: var(--input-text);
      font-size: var(--text-sm);
      box-shadow: var(--input-shadow);
      transition: all 0.2s ease;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--input-border-focus);
      box-shadow: var(--input-shadow-focus);
    }

    .form-input:disabled {
      background-color: var(--input-disabled-bg);
      cursor: not-allowed;
      opacity: 0.7;
    }

    .has-error .form-input {
      border-color: var(--danger-color);
    }

    .has-error .form-input:focus {
      box-shadow: 0 0 0 var(--space-1) var(--danger-color-lighter);
    }

    .input-error {
      font-size: var(--text-xs);
      color: var(--danger-color);
    }
  `]
})
export class InputComponent implements ControlValueAccessor {
  @Input() type: InputType = 'text';
  @Input() label = '';
  @Input() placeholder = '';
  @Input() icon = '';
  @Input() iconClass = '';
  @Input() error = '';
  @Input() disabled = false;
  private static idCounter = 0;
  readonly inputId = `app-input-${++InputComponent.idCounter}`;

  value: string | number = '';
  onChange: (value: string | number) => void = () => { /* noop */ };
  onTouched: () => void = () => { /* noop */ };

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  writeValue(value: string | number): void {
    this.value = value ?? '';
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
