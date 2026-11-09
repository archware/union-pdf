import { Component, Input, Output, EventEmitter, forwardRef, signal, ChangeDetectionStrategy } from '@angular/core';

import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type FloatingInputType = 'text' | 'date' | 'number' | 'password' | 'email' | 'tel' | 'datetime-local' | 'time';
export type FloatingInputVariant = 'floating' | 'underline' | 'material' | 'outline';

@Component({
  selector: 'app-floating-input',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FloatingInputComponent),
      multi: true
    }
  ],
  template: `
    <div
      class="floating-input-wrapper"
      [class]="'variant-' + variant"
      [class.focused]="isFocused()"
      [class.has-value]="hasValue()"
      [class.has-error]="error"
      [class.disabled]="disabled"
      [class.has-icon]="icon || type === 'password'"
      [style.width]="width || null"
    >
      <input
        #inputEl
        class="floating-input"
        [id]="inputId()"
        [type]="actualType()"
        [disabled]="disabled"
        [readonly]="readonly"
        [value]="value"
        [attr.data-clipboard-policy]="type === 'password' ? 'paste-only' : null"
        [attr.autocomplete]="autocomplete || (type === 'password' ? 'current-password' : 'off')"
        (input)="onInput($event)"
        (focus)="onFocus()"
        (blur)="onBlur()"
        [attr.placeholder]="variant === 'floating' || variant === 'material' ? ' ' : placeholder"
      />
      <label class="floating-label" [attr.for]="inputId()">{{ label }}</label>
      <span class="input-line"></span>

      <!-- Icon button (password toggle or custom icon) -->
      @if (type === 'password') {
        <button
          type="button"
          class="input-icon-btn"
          [disabled]="disabled"
          [attr.aria-label]="passwordToggleAccessibleLabel()"
          [attr.aria-pressed]="showPassword()"
          [attr.aria-controls]="inputId()"
          (click)="onPasswordToggleClick($event)"
        >
          <i
            class="fa-solid"
            [class.fa-eye]="!showPassword()"
            [class.fa-eye-slash]="showPassword()"
            aria-hidden="true"
          ></i>
        </button>
      } @else if (iconClass || clearable) {
        <button
          type="button"
          class="input-icon-btn input-icon-btn--static"
          (click)="handleIconClick($event)"
          (keydown.enter)="handleIconClick($event)"
          (keydown.space)="handleIconClick($event); $event.preventDefault()"
          tabindex="0"
          [attr.aria-label]="label || 'Input icon action'"
          [style.cursor]="(clearable && hasValue()) ? 'pointer' : 'default'"
        >
          <i [class]="getIconClass()"></i>
        </button>
      } @else if (icon) {
        <button
          type="button"
          class="input-icon-btn input-icon-btn--static"
          (click)="emitIconClick($event)"
          (keydown.enter)="emitIconClick($event)"
          (keydown.space)="emitIconClick($event); $event.preventDefault()"
          tabindex="0"
          [attr.aria-label]="label || 'Input icon action'"
        >
          {{ icon }}
        </button>
      }

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

    .floating-input-wrapper {
      position: relative;
      width: 100%;
      min-width: var(--fi-min-width, 8rem); /* Controlable desde el contenedor padre. */
      margin-top: var(--space-3);
    }

    /* === BASE INPUT === */
    .floating-input {
      width: 100%;
      height: var(--control-height);
      padding: 0 0.875rem;
      line-height: calc(var(--control-height) - var(--space-1)); /* Robust vertical centering */
      font-size: 0.875rem;
      color: var(--input-text);
      background: transparent;
      border: none;
      outline: none;
      transition: all 200ms ease;
      box-sizing: border-box; /* Ensure padding doesn't affect height */
    }

    /* Standardize date and number inputs */
    .floating-input[type="date"],
    .floating-input[type="number"] {
      line-height: normal; /* Reset line-height to prevent expansion */
      height: var(--control-height);
      box-sizing: border-box;
      margin: 0;
    }

    /* Reset native date picker indicator spacing */
    .floating-input::-webkit-calendar-picker-indicator {
      margin: 0;
      padding: 0;
    }

    /* Reveal mask only when focused or has value to prevent label overlap */
    .floating-input-wrapper:not(.focused):not(.has-value) .floating-input::-webkit-datetime-edit {
      color: transparent;
    }

    .has-icon .floating-input {
      padding-right: var(--space-8);
    }

    .floating-input::placeholder {
      color: transparent;
    }

    /* WebView2: el revelado pertenece al control Atomic y no al navegador. */
    .floating-input::-ms-reveal,
    .floating-input::-ms-clear {
      display: none;
    }

    /* === FLOATING LABEL === */
    .floating-label {
      position: absolute;
      left: 0.875rem;
      top: calc(var(--control-height) / 2);
      transform: translateY(-50%);
      font-size: 1.0625rem;
      color: var(--input-placeholder);
      pointer-events: none;
      transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: left center;
      z-index: 10; /* Ensure label sits above borders/content */
    }

    /* Label goes up when focused or has value */
    .focused .floating-label,
    .has-value .floating-label {
      top: var(--space-1);
      transform: translateY(0);
      font-size: 0.8125rem;
      font-weight: var(--font-weight-body);
      color: var(--info-color-text);
    }

    /* === INPUT LINE (for underline/material) === */
    .input-line {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: var(--space-1);
      background: var(--input-border);
    }

    .input-line::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      width: 0;
      height: var(--space-1);
      background: var(--info-color);
      transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
      transform: translateX(-50%);
    }

    .focused .input-line::after {
      width: 100%;
    }

    /* === VARIANT: FLOATING === */
    .variant-floating .floating-input {
      height: var(--control-height);
      /* padding inherited from base: 0 0.875rem */
      border: var(--input-border-width, 1.5px) solid var(--input-border);
      border-radius: var(--radius-md);
      background: var(--input-bg);
      font-size: 0.875rem;
      box-shadow: var(--input-shadow);
    }

    .variant-floating .floating-label {
      left: 0.875rem;
      background: var(--input-bg);
      padding: 0 var(--space-2);
      white-space: nowrap;
    }

    .variant-floating.focused .floating-label,
    .variant-floating.has-value .floating-label {
      top: -0.625rem;
      transform: translateY(0);
    }

    .variant-floating.focused .floating-input {
      border-color: var(--input-border-focus);
      box-shadow: var(--input-shadow-focus);
    }

    .variant-floating .input-line {
      display: none;
    }

    /* === VARIANT: UNDERLINE === */
    .variant-underline .floating-input {
      height: var(--control-height);
      padding: 0;
      padding-top: var(--space-5); /* Increased for 4var(--space-2) height */
      line-height: 1.5; /* Reset line-height for underline */
      font-size: 0.875rem;
      border-bottom: 1px solid var(--input-border);
    }

    .variant-underline .floating-label {
      left: 0;
      /* font-size hereda de .floating-label base (1.0625rem) */
    }

    .variant-underline.focused .floating-label,
    .variant-underline.has-value .floating-label {
      top: calc(-1 * var(--space-1));
      font-size: var(--space-3);
    }

    .variant-underline.focused .floating-input,
    .variant-underline.has-value .floating-input {
      border-bottom-color: transparent;
    }

    .variant-underline .input-line {
      height: var(--space-1);
    }

    /* === VARIANT: MATERIAL === */
    .variant-material .floating-input {
      height: var(--control-height);
      padding: 0;
      padding-top: var(--space-5);
      line-height: 1.5;
      font-size: 0.875rem;
    }

    .variant-material.has-icon .floating-input {
      padding-right: var(--space-8);
    }

    .variant-material .floating-label {
      left: 0;
      font-size: 0.875rem;
    }

    .variant-material.focused .floating-label,
    .variant-material.has-value .floating-label {
      top: calc(-1 * var(--space-1));
      font-size: var(--space-3);
      color: var(--primary-color);
      font-weight: var(--font-weight-emphasis);
    }

    /* === VARIANT: OUTLINE === */
    .variant-outline .floating-input {
      height: var(--control-height);
      /* padding inherited from base: 0 0.875rem */
      font-size: 0.875rem;
      background: var(--input-bg);
      border: var(--input-border-width, 1.5px) solid var(--input-border);
      border-radius: var(--radius-md);
      box-shadow: var(--input-shadow);
    }

    .variant-outline .floating-label {
      top: 50%;
      background: var(--input-bg);
      padding: 0 var(--space-2);
      font-size: 1.0625rem;
      white-space: nowrap;
    }

    .variant-outline.focused .floating-label,
    .variant-outline.has-value .floating-label {
      top: -0.625rem;
      font-size: 0.8125rem;
    }

    .variant-outline.focused .floating-input {
      border-color: var(--input-border-focus);
      box-shadow: var(--input-shadow-focus);
    }

    .variant-outline .input-line {
      display: none;
    }

    /* === HOVER STATE (floating + outline, antes del focus) === */
    .variant-floating:not(.focused) .floating-input:hover,
    .variant-outline:not(.focused) .floating-input:hover {
      border-color: var(--input-border-hover);
      box-shadow: var(--input-shadow-hover);
    }

    /* === ICONS === */
    .input-icon {
      position: absolute;
      right: 0.875rem;
      top: calc(var(--control-height) / 2);
      transform: translateY(-50%);
      color: var(--text-color-muted);
      font-size: var(--space-4);
      /* Fix strict sizing to prevent height variations */
      width: var(--space-5);
      height: var(--space-5);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .input-icon-btn {
      position: absolute;
      right: var(--space-2);
      top: calc(var(--control-height) / 2);
      transform: translateY(-50%);
      width: var(--space-7);
      height: var(--space-7);
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      border-radius: 50%;
      color: var(--text-color-secondary);
      cursor: pointer;
      transition: all 150ms ease;
    }

    .input-icon-btn:hover {
      background: var(--hover-background-subtle);
      color: var(--primary-color);
    }

    .input-icon-btn:focus-visible {
      outline: none;
      box-shadow: var(--shadow-focus-primary);
    }

    .input-icon-btn:disabled {
      cursor: not-allowed;
      color: var(--input-disabled-text);
    }

    .input-icon-btn:disabled:hover {
      background: transparent;
      color: var(--text-color-secondary);
    }

    .input-icon-btn--static {
      width: 1.75rem;
      height: 1.75rem;
      right: var(--space-3);
    }

    .input-icon-btn i {
      font-size: var(--space-4);
    }

    /* === STATES === */
    .disabled .floating-input {
      background: var(--input-disabled-bg);
      cursor: not-allowed;
      color: var(--input-disabled-text);
    }

    .has-error .floating-input {
      border-color: var(--danger-color) !important;
    }

    .has-error .floating-label {
      color: var(--danger-color-text) !important;
    }

    .has-error .input-line::after {
      background: var(--danger-color);
    }

    .input-error {
      display: block;
      margin-top: var(--space-2);
      font-size: 0.8125rem;
      color: var(--danger-color-text);
    }

    /* Dark mode handled automatically by CSS variables */
  `]
})
export class FloatingInputComponent implements ControlValueAccessor {
  @Input() type: FloatingInputType = 'text';
  @Input() variant: FloatingInputVariant = 'floating';
  @Input() label = '';
  @Input() placeholder = '';
  @Input() icon = '';
  @Input() error = '';
  @Input() disabled = false;
  @Input() readonly = false;
  @Input() width = ''; // Optional: e.g., '200px', '50%', 'auto'
  @Input() autocomplete = ''; // Optional: 'off', 'current-password', 'new-password', etc.
  @Input() iconClass = '';
  @Input() clearable = false;
  @Output() iconClick = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  @Input() value: string | number = '';
  isFocused = signal(false);
  showPassword = signal(false);

  // Generate unique ID for accessibility (label-for association)
  private static instanceCounter = 0;
  private readonly _inputId = `floating-input-${++FloatingInputComponent.instanceCounter}`;
  readonly inputId = () => this._inputId;

  onChange: (value: string | number) => void = () => { /* noop */ };
  onTouched: () => void = () => { /* noop */ };

  actualType(): string {
    if (this.type === 'password') {
      return this.showPassword() ? 'text' : 'password';
    }
    return this.type;
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  passwordToggleAccessibleLabel(): string {
    return this.showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña';
  }

  onPasswordToggleClick(event: Event): void {
    event.stopPropagation();
    this.togglePassword();
    this.iconClick.emit();
  }

  getIconClass(): string {
    if (this.clearable && this.hasValue()) {
      return 'fa-solid fa-times';
    }
    return this.iconClass;
  }

  handleIconClick(event: Event): void {
    event.stopPropagation();
    if (this.clearable && this.hasValue()) {
      this.value = '';
      this.onChange(this.value);
      this.clear.emit();
      // If parent is listening to (input) event directly on the native element,
      // it won't fire unless we dispatch it. We will emit both.
      const nativeInput = (event.target as HTMLElement).closest('.floating-input-wrapper')?.querySelector('input');
      if (nativeInput) {
        nativeInput.value = '';
        nativeInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return;
    }
    this.iconClick.emit();
  }

  emitIconClick(event: Event): void {
    event.stopPropagation();
    this.iconClick.emit();
  }

  hasValue(): boolean {
    return this.value !== '' && this.value !== null && this.value !== undefined;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  onFocus(): void {
    this.isFocused.set(true);
  }

  onBlur(): void {
    this.isFocused.set(false);
    this.onTouched();
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
