import {
  Component, Input, Output, EventEmitter, signal, computed,
  forwardRef, ChangeDetectionStrategy, ElementRef, ViewChild, inject, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

export interface ComboboxOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  group?: string;
}

/**
 * ComboboxComponent — Input con sugerencias de autocompletado.
 *
 * @example
 * ```html
 * <app-combobox
 *   [options]="userOptions"
 *   [(ngModel)]="selectedUser"
 *   label="Buscar usuario"
 *   placeholder="Escribe para buscar..."
 * ></app-combobox>
 * ```
 */
@Component({
  selector: 'app-combobox',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ComboboxComponent),
      multi: true
    }
  ],
  template: `
    <div class="combobox" [class.combobox-open]="isOpen()" [class.combobox-disabled]="disabled">
      @if (label) {
        <label class="combobox-label" [for]="inputId">{{ label }}</label>
      }
      <div class="combobox-control" #controlRef>
        <input
          #inputRef
          [id]="inputId"
          class="combobox-input"
          type="text"
          [placeholder]="placeholder"
          [disabled]="disabled"
          [value]="inputValue()"
          (input)="onInput($event)"
          (focus)="onFocus()"
          (blur)="onBlur()"
          (keydown)="onKeydown($event)"
          autocomplete="off"
          role="combobox"
          [attr.aria-expanded]="isOpen()"
          aria-autocomplete="list"
          [attr.aria-controls]="listboxId"
          [attr.aria-activedescendant]="activeOptionId()"
          [attr.aria-label]="label ? null : ariaLabel || placeholder"
          [attr.aria-invalid]="error ? 'true' : 'false'"
          [attr.aria-errormessage]="error ? errorId : null"
          aria-haspopup="listbox"
        />
        @if (inputValue() && !disabled && clearable) {
          <button
            type="button"
            class="combobox-clear"
            (mousedown)="$event.preventDefault()"
            (click)="clear()"
            [attr.aria-label]="'Limpiar ' + (label || placeholder)">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        } @else {
          <span class="combobox-icon" aria-hidden="true"><i class="fa-solid fa-chevron-down"></i></span>
        }
      </div>

      @if (isOpen()) {
        <ul class="combobox-dropdown" role="listbox" [id]="listboxId">
          @for (option of filteredOptions(); track option.value; let i = $index) {
            <li
              [id]="optionId(i)"
              class="combobox-option"
              [class.combobox-option-highlighted]="i === highlightedIndex()"
              [class.combobox-option-selected]="option.value === value"
              [class.combobox-option-disabled]="option.disabled"
              role="option"
              [attr.aria-selected]="option.value === value"
              [attr.aria-disabled]="option.disabled ? 'true' : null"
              (mousedown)="onOptionPointerDown(option, $event)"
              (mouseenter)="highlightOption(option, i)"
            >
              <span class="combobox-option-label">{{ option.label }}</span>
              @if (option.value === value) {
                <i class="fa-solid fa-check combobox-check" aria-hidden="true"></i>
              }
            </li>
          } @empty {
            <li class="combobox-empty" role="presentation">
              <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
              <span role="status">Sin resultados para "{{ inputValue() }}"</span>
            </li>
          }
        </ul>
      }

      @if (error) {
        <span class="combobox-error" [id]="errorId" role="alert">{{ error }}</span>
      }
    </div>
  `,
  styles: [`
    .combobox { position: relative; width: 100%; }
    .combobox.combobox-open { z-index: 1000; }

    .combobox-label {
      display: block;
      font-size: var(--text-sm);
      font-weight: var(--font-weight-body);
      color: var(--text-color-secondary);
      margin-bottom: var(--space-1);
    }

    .combobox-control {
      position: relative;
      display: flex;
      align-items: center;
    }

    .combobox-input {
      width: 100%;
      padding: var(--space-2) var(--space-8) var(--space-2) var(--space-3);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--input-bg);
      color: var(--text-color);
      font-size: var(--text-sm);
      line-height: 1.5;
      outline: none;
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }

    .combobox-input:focus {
      border-color: var(--input-border-focus);
      box-shadow: var(--input-shadow-focus);
    }

    .combobox-input:disabled {
      background: var(--input-disabled-bg);
      cursor: not-allowed;
      color: var(--input-disabled-text);
    }

    .combobox-icon, .combobox-clear {
      position: absolute;
      right: var(--space-3);
      color: var(--text-color-muted);
      font-size: var(--text-sm);
      pointer-events: none;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
    }

    .combobox-clear { pointer-events: all; }
    .combobox-clear:hover { color: var(--text-color); }

    .combobox-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 1000;
      max-height: 240px;
      overflow-y: auto;
      background: var(--surface-background);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      list-style: none;
      margin: 0;
      padding: var(--space-1) 0;
    }

    .combobox-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-2) var(--space-3);
      cursor: pointer;
      font-size: var(--text-sm);
      color: var(--text-color);
      transition: background 100ms ease;
    }

    .combobox-option:hover,
    .combobox-option-highlighted { background: var(--surface-hover); }
    .combobox-option-selected { color: var(--primary-color); font-weight: var(--font-weight-body); }
    .combobox-option-disabled {
      background: var(--input-disabled-bg);
      color: var(--input-disabled-text);
      cursor: not-allowed;
    }

    .combobox-option-disabled .combobox-check {
      color: var(--input-disabled-text);
    }

    .combobox-check { color: var(--primary-color); font-size: var(--text-xs); }

    .combobox-empty {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3);
      color: var(--text-color-muted);
      font-size: var(--text-sm);
    }

    .combobox-error {
      display: block;
      font-size: var(--text-xs);
      color: var(--danger-color-text);
      margin-top: var(--space-1);
    }
  `]
})
export class ComboboxComponent implements ControlValueAccessor {
  private readonly platformId = inject(PLATFORM_ID);
  readonly inputId = 'combobox-input-' + Math.random().toString(36).slice(2, 8);
  readonly listboxId = 'combobox-list-' + Math.random().toString(36).slice(2, 8);
  readonly errorId = 'combobox-error-' + Math.random().toString(36).slice(2, 8);

  @Input()
  set options(value: ComboboxOption[]) {
    this._options = [...(value || [])];
    this.optionsState.set(this._options);
    this.reconcileSelection();
  }
  get options(): ComboboxOption[] {
    return this._options;
  }
  @Input() label = '';
  @Input() ariaLabel = '';
  @Input() placeholder = 'Buscar...';
  @Input()
  set disabled(value: boolean) {
    this.disabledState.set(value);
    if (value) this.closeOptions();
  }
  get disabled(): boolean {
    return this.disabledState();
  }
  @Input() clearable = true;
  @Input() error = '';

  @Output() optionSelected = new EventEmitter<ComboboxOption>();
  @Output() inputChange = new EventEmitter<string>();

  @ViewChild('inputRef') inputRef?: ElementRef<HTMLInputElement>;

  value: string | number | null = null;
  inputValue = signal('');
  isOpen = signal(false);
  highlightedIndex = signal(-1);
  private _options: ComboboxOption[] = [];
  private readonly disabledState = signal(false);
  private readonly optionsState = signal<readonly ComboboxOption[]>([]);

  filteredOptions = computed(() => {
    const query = this.inputValue().toLowerCase().trim();
    const options = this.optionsState();
    if (!query) return options;
    return options.filter(o => o.label.toLowerCase().includes(query));
  });

  activeOptionId = computed(() => {
    const index = this.highlightedIndex();
    return this.isOpen() && index >= 0 ? this.optionId(index) : null;
  });

  private onChange: (v: string | number | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(val: string | number | null): void {
    this.value = val;
    this.reconcileSelection();
  }

  registerOnChange(fn: (v: string | number | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.inputValue.set(val);
    this.isOpen.set(true);
    this.highlightedIndex.set(-1);
    this.inputChange.emit(val);

    const selected = this.optionsState().find(option => option.value === this.value);
    if (this.value !== null && (!selected || selected.label !== val)) {
      this.value = null;
      this.onChange(null);
    }
  }

  onFocus(): void {
    if (this.disabled) return;
    this.isOpen.set(true);
    this.ensureEnabledHighlight();
  }

  onBlur(): void {
    this.onTouched();
    setTimeout(() => this.isOpen.set(false), 150);
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled) return;
    const opts = this.filteredOptions();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.isOpen.set(true);
        this.highlightedIndex.set(this.nextEnabledIndex(opts, this.highlightedIndex(), 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.isOpen.set(true);
        this.highlightedIndex.set(this.nextEnabledIndex(opts, this.highlightedIndex(), -1));
        break;
      case 'Enter':
        event.preventDefault();
        if (this.highlightedIndex() >= 0 && opts[this.highlightedIndex()]) {
          this.selectOption(opts[this.highlightedIndex()]);
        }
        break;
      case 'Escape':
        this.isOpen.set(false);
        break;
    }
  }

  selectOption(option: ComboboxOption): void {
    if (this.disabled || option.disabled) return;
    this.value = option.value;
    this.inputValue.set(option.label);
    this.closeOptions();
    this.onChange(option.value);
    this.onTouched();
    this.optionSelected.emit(option);
  }

  clear(): void {
    if (this.disabled) return;
    this.value = null;
    this.inputValue.set('');
    this.closeOptions();
    this.onChange(null);
    this.onTouched();
    this.inputChange.emit('');
    if (isPlatformBrowser(this.platformId)) {
      this.inputRef?.nativeElement.focus();
    }
  }

  optionId(index: number): string {
    return `${this.listboxId}-option-${index}`;
  }

  onOptionPointerDown(option: ComboboxOption, event: MouseEvent): void {
    event.preventDefault();
    this.selectOption(option);
  }

  highlightOption(option: ComboboxOption, index: number): void {
    if (!option.disabled) this.highlightedIndex.set(index);
  }

  private reconcileSelection(): void {
    if (this.value === null) return;
    const option = this.optionsState().find(candidate => candidate.value === this.value);
    this.inputValue.set(option?.label || '');
    this.ensureEnabledHighlight();
  }

  private ensureEnabledHighlight(): void {
    if (!this.isOpen()) return;
    const options = this.filteredOptions();
    const current = this.highlightedIndex();
    if (current >= 0 && options[current] && !options[current].disabled) return;
    const selected = options.findIndex(option => option.value === this.value && !option.disabled);
    this.highlightedIndex.set(selected >= 0 ? selected : this.nextEnabledIndex(options, -1, 1));
  }

  private nextEnabledIndex(
    options: readonly ComboboxOption[],
    current: number,
    direction: 1 | -1
  ): number {
    let index = current;
    if (index < 0) index = direction === 1 ? -1 : options.length;
    for (index += direction; index >= 0 && index < options.length; index += direction) {
      if (!options[index].disabled) return index;
    }
    return current >= 0 && options[current] && !options[current].disabled ? current : -1;
  }

  private closeOptions(): void {
    this.isOpen.set(false);
    this.highlightedIndex.set(-1);
  }
}
