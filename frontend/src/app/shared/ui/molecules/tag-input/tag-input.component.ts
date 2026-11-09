import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';

import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { ChipComponent } from '../../atoms/chip/chip.component';

export interface TagInputOption {
  label: string;
  value: string;
}

/**
 * TagInputComponent — Campo de entrada con etiquetas/chips removibles.
 * Compatible con `ngModel` y `FormControl`.
 *
 * @example
 * ```html
 * <app-tag-input
 *   [(ngModel)]="tags"
 *   label="Etiquetas"
 *   placeholder="Escribe y presiona Enter"
 *   [maxTags]="5"
 * ></app-tag-input>
 * ```
 */
@Component({
  selector: 'app-tag-input',
  standalone: true,
  imports: [FormsModule, ChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="tag-input-wrapper" [class.tag-input--disabled]="disabled" [class.tag-input--focused]="focused()">
      @if (label) {
        <label class="tag-input__label" [for]="inputId">{{ label }}</label>
      }
      <div class="tag-input__field">
        <!-- Tags -->
        @for (tag of tags(); track tag) {
          <app-chip
            size="sm"
            variant="primary"
            [removable]="!disabled"
            (remove)="removeTag(tag)"
          >{{ tag }}</app-chip>
        }

        <!-- Input -->
        @if (!maxTags || tags().length < maxTags) {
          <input
            #inputEl
            [id]="inputId"
            class="tag-input__input"
            [placeholder]="tags().length === 0 ? placeholder : ''"
            [disabled]="disabled"
            [(ngModel)]="inputValue"
            (keydown)="onKeydown($event)"
            (focus)="focused.set(true)"
            (blur)="onBlur()"
            [attr.aria-label]="label || placeholder"
          />
        }
      </div>

      @if (hint) {
        <span class="tag-input__hint">{{ hint }}</span>
      }
      @if (error) {
        <span class="tag-input__error">{{ error }}</span>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .tag-input__label {
      display: block;
      margin-bottom: var(--space-1);
      font-size: var(--text-sm);
      font-weight: var(--font-medium, 500);
      color: var(--text-color-secondary);
    }

    .tag-input__field {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1);
      min-height: var(--space-7);
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--input-background, var(--surface-background));
      cursor: text;
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }

    .tag-input--focused .tag-input__field {
      border-color: var(--input-border-focus);
      box-shadow: var(--input-shadow-focus);
    }

    .tag-input--disabled .tag-input__field {
      opacity: 0.6;
      cursor: not-allowed;
      background: var(--surface-section);
    }

    .tag-input__input {
      flex: 1;
      min-width: 80px;
      border: none;
      outline: none;
      background: transparent;
      font-size: var(--text-sm);
      color: var(--text-color);
      padding: var(--space-1) 0;
    }

    .tag-input__hint {
      display: block;
      margin-top: var(--space-1);
      font-size: var(--text-xs);
      color: var(--text-color-muted);
    }

    .tag-input__error {
      display: block;
      margin-top: var(--space-1);
      font-size: var(--text-xs);
      color: var(--color-danger-600, #dc2626);
    }
  `],
})
export class TagInputComponent implements ControlValueAccessor {
  readonly inputId = 'tag-input-' + Math.random().toString(36).slice(2, 8);

  @Input() label = '';
  @Input() placeholder = 'Agregar etiqueta…';
  @Input() hint = '';
  @Input() error = '';
  @Input() maxTags: number | null = null;
  @Input() allowDuplicates = false;
  @Input() disabled = false;
  @Input() separator: string[] = ['Enter', ','];

  @Output() tagAdded = new EventEmitter<string>();
  @Output() tagRemoved = new EventEmitter<string>();

  protected tags = signal<string[]>([]);
  protected focused = signal(false);
  protected inputValue = '';

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string[]): void {
    this.tags.set(Array.isArray(value) ? value : []);
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.separator.includes(event.key)) {
      event.preventDefault();
      this.addTag();
    } else if (event.key === 'Backspace' && !this.inputValue && this.tags().length) {
      const current = this.tags();
      this.removeTag(current[current.length - 1]);
    }
  }

  onBlur(): void {
    this.focused.set(false);
    if (this.inputValue.trim()) {
      this.addTag();
    }
    this.onTouched();
  }

  private addTag(): void {
    const value = this.inputValue.trim().replace(/,$/, '');
    if (!value) return;
    if (!this.allowDuplicates && this.tags().includes(value)) {
      this.inputValue = '';
      return;
    }
    if (this.maxTags && this.tags().length >= this.maxTags) return;

    const newTags = [...this.tags(), value];
    this.tags.set(newTags);
    this.inputValue = '';
    this.onChange(newTags);
    this.tagAdded.emit(value);
  }

  removeTag(tag: string): void {
    const newTags = this.tags().filter(t => t !== tag);
    this.tags.set(newTags);
    this.onChange(newTags);
    this.tagRemoved.emit(tag);
  }
}
