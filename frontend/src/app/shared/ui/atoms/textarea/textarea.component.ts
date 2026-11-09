import { Component, Input, forwardRef, signal, computed } from '@angular/core';

import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type TextareaVariant = 'floating' | 'outline' | 'material';

/**
 * Componente Textarea con label flotante y variantes de estilo.
 * Implementa ControlValueAccessor para integración con formularios.
 * 
 * @example
 * ```html
 * <app-textarea 
 *   label="Mensaje" 
 *   variant="floating"
 *   [(ngModel)]="message"
 * ></app-textarea>
 * ```
 */
@Component({
  selector: 'app-textarea',
  standalone: true,
  imports: [],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaComponent),
      multi: true
    }
  ],
  template: `
    <div 
      class="textarea-wrapper"
      [class]="'variant-' + variant"
      [class.focused]="isFocused()"
      [class.has-value]="hasValue()"
      [class.has-error]="error"
      [class.disabled]="disabled"
    >
      <textarea
        class="textarea-input"
        [id]="textareaId()"
        [rows]="rows"
        [disabled]="disabled"
        [readonly]="readonly"
        [value]="value"
        [attr.maxlength]="maxlength"
        [attr.placeholder]="variant === 'floating' || variant === 'material' ? ' ' : placeholder"
        (input)="onInput($event)"
        (focus)="onFocus()"
        (blur)="onBlur()"
      ></textarea>
      <label class="textarea-label" [attr.for]="textareaId()">{{ label }}</label>
      <span class="textarea-line"></span>
      
      <!-- Character counter -->
      @if (maxlength && showCounter) {
        <span class="textarea-counter">{{ value.length }} / {{ maxlength }}</span>
      }
    </div>
    
    <!-- Error message -->
    @if (error) {
      <span class="textarea-error">{{ error }}</span>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .textarea-wrapper {
      position: relative;
      display: flex;
      flex-direction: column;
    }

    /* Base textarea styles */
    .textarea-input {
      width: 100%;
      min-height: var(--space-20, 5rem);
      padding: var(--space-4);
      padding-top: var(--space-6);
      font-size: var(--text-md);
      font-family: inherit;
      color: var(--text-color);
      background: var(--surface-input);
      border: var(--input-border-width, 1.5px) solid var(--input-border);
      border-radius: var(--radius-md);
      box-shadow: var(--input-shadow);
      resize: vertical;
      transition: border-color 200ms ease, box-shadow 200ms ease;
    }

    .textarea-input::placeholder {
      color: var(--text-color-muted);
    }

    .textarea-input:focus {
      outline: none;
      border-color: var(--input-border-focus);
      box-shadow: var(--input-shadow-focus);
    }

    .textarea-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background: var(--surface-disabled);
    }

    /* Floating label */
    .textarea-label {
      position: absolute;
      left: var(--space-4);
      top: var(--space-4);
      font-size: var(--text-md);
      color: var(--text-color-muted);
      pointer-events: none;
      transition: all 200ms ease;
      background: transparent;
    }

    /* Label animation */
    .variant-floating .textarea-input:focus + .textarea-label,
    .variant-floating.has-value .textarea-label,
    .variant-material .textarea-input:focus + .textarea-label,
    .variant-material.has-value .textarea-label {
      top: var(--space-1);
      font-size: var(--text-xs);
      color: var(--primary-color);
      background: var(--surface-input);
      padding: 0 var(--space-1);
    }

    /* Material variant */
    .variant-material .textarea-input {
      border-radius: var(--radius-md) var(--radius-md) 0 0;
      border-bottom: var(--space-1) solid var(--border-color);
    }

    .variant-material .textarea-input:focus {
      border-bottom-color: var(--primary-color);
    }

    .variant-material .textarea-line {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: var(--space-1);
      background: var(--primary-color);
      transform: scaleX(0);
      transition: transform 200ms ease;
    }

    .variant-material.focused .textarea-line {
      transform: scaleX(1);
    }

    /* Outline variant - label always visible */
    .variant-outline .textarea-label {
      top: calc(-1 * var(--space-2) - var(--space-1));
      font-size: var(--text-xs);
      color: var(--text-color-secondary);
      background: var(--surface-input);
      padding: 0 var(--space-1);
    }

    .variant-outline .textarea-input {
      padding-top: var(--space-4);
    }

    /* Error state */
    .has-error .textarea-input {
      border-color: var(--danger-color);
    }

    .has-error .textarea-input:focus {
      box-shadow: var(--shadow-focus-danger);
    }

    .has-error .textarea-label {
      color: var(--danger-color);
    }

    .textarea-error {
      display: block;
      margin-top: var(--space-1);
      font-size: var(--text-xs);
      color: var(--danger-color);
    }

    /* Character counter */
    .textarea-counter {
      position: absolute;
      bottom: var(--space-2);
      right: var(--space-3);
      font-size: var(--text-xs);
      color: var(--text-color-muted);
    }
  `]
})
export class TextareaComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() variant: TextareaVariant = 'floating';
  @Input() rows = 4;
  @Input() maxlength?: number;
  @Input() showCounter = true;
  @Input() error = '';
  @Input() disabled = false;
  @Input() readonly = false;

  value = '';
  private idCounter = Math.random().toString(36).substring(2, 9);

  isFocused = signal(false);
  hasValue = computed(() => this.value.length > 0);
  textareaId = computed(() => `textarea-${this.idCounter}`);

  onChange: (value: string) => void = () => { /* noop */ };
  onTouched: () => void = () => { /* noop */ };

  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
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

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
