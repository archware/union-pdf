import {
  Component, Input, Output, EventEmitter, signal, HostListener,
  ElementRef, forwardRef, inject, ChangeDetectionStrategy
} from '@angular/core';

import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';


export interface Select2Option {
  value: string | number;
  label: string;
  icon?: string;
  disabled?: boolean;
}

@Component({
  // Standalone component for Select2 dropdown
  selector: 'app-select2',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => Select2Component),
    multi: true
  }],
  template: `
    <div
      class="select2-wrapper"
      [class.open]="isOpen()"
      [class.disabled]="disabled"
      [class.focused]="isOpen()"
      [class.has-value]="hasValue()"
      [class.multiple]="multiple"
      [class.has-label]="label"
      [style.width]="width || null"
    >
      <div class="select2-trigger"
        (click)="$event.stopPropagation(); toggleDropdown()"
        (keydown)="handleKeydown($event)"
        [attr.aria-labelledby]="label ? selectId() : null"
        [attr.aria-label]="label ? null : ariaLabel || placeholder"
        [attr.aria-controls]="listboxId()"
        [attr.aria-activedescendant]="isOpen() && highlightedIndex() >= 0 ? optionId(highlightedIndex()) : null"
        [attr.aria-disabled]="disabled ? 'true' : 'false'"
        [attr.tabindex]="disabled ? -1 : 0"
        role="combobox"
        [attr.aria-expanded]="isOpen()"
        aria-haspopup="listbox"
      >
        @if (label) {
          <span class="floating-label" [id]="selectId()">{{ label }}</span>
        }
        <!-- Single value display -->
        @if (!multiple) {
          <span class="select2-value">
            @if (selectedOption()) {
              @if (selectedOption()!.icon) {
                <span class="option-icon">{{ selectedOption()!.icon }}</span>
              }
              {{ selectedOption()!.label }}
            } @else if (!label) {
              <span class="placeholder">{{ placeholder }}</span>
            }
          </span>
        }

        <!-- Multiple values as tags -->
        @if (multiple) {
          <div class="select2-tags">
            @for (opt of selectedOptions(); track opt.value) {
              <span class="select2-tag">
                {{ opt.label }}
                <button
                  type="button"
                  class="tag-remove"
                  [disabled]="disabled"
                  [attr.aria-label]="removeTagLabel(opt)"
                  (click)="removeTag(opt, $event)">×</button>
              </span>
            }
            @if (selectedOptions().length === 0 && !label) {
              <span class="placeholder">{{ placeholder }}</span>
            }
          </div>
        }

        <span class="select2-arrow">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" focusable="false">
            <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
      </div>

      @if (isOpen()) {
        <div class="select2-dropdown" (mousedown)="$event.stopPropagation()">
          <!-- Search box -->
          @if (searchable) {
            <div class="select2-search">
              <input
                type="text"
                class="search-input"
                placeholder="Buscar..."
                [ngModel]="searchTerm()"
                (ngModelChange)="onSearchTermChange($event)"
                (click)="$event.stopPropagation()"
                (keydown)="handleKeydown($event)"
                [attr.aria-label]="searchLabel"
                autocomplete="off"
              />
              <span class="search-icon" aria-hidden="true">🔍</span>
            </div>
          }

          <!-- Options list -->
          <div
            class="select2-options"
            role="listbox"
            [id]="listboxId()"
            [attr.aria-multiselectable]="multiple ? 'true' : null">
            @for (option of filteredOptions(); track option.value; let i = $index) {
              <div
                [id]="optionId(i)"
                class="select2-option"
                [class.selected]="isSelected(option)"
                [class.highlighted]="highlightedIndex() === i"
                [class.disabled]="option.disabled"
                (mousedown)="$event.stopPropagation(); $event.preventDefault(); !option.disabled && selectOption(option)"
                (keydown)="handleKeydown($event)"
                tabindex="-1"
                role="option"
                [attr.aria-selected]="isSelected(option)"
                [attr.aria-disabled]="option.disabled ? 'true' : null"
              >
                @if (option.icon) {
                  <span class="option-icon" aria-hidden="true">{{ option.icon }}</span>
                }
                <span class="option-label">{{ option.label }}</span>
                @if (isSelected(option)) {
                  <span class="check-icon" aria-hidden="true">✓</span>
                }
              </div>
            } @empty {
              <div class="select2-no-results" role="status">No hay resultados</div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .select2-wrapper {
      position: relative;
      width: 100%;
      min-width: var(--select2-min-width, 15rem);
    }

    .select2-wrapper.open {
      z-index: 1000;
    }

    .select2-wrapper.disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    .select2-wrapper.disabled .select2-trigger,
    .tag-remove:disabled {
      cursor: not-allowed;
    }

    .select2-wrapper.has-label {
      margin-top: var(--space-3);
    }

    /* === TRIGGER === */
    .select2-trigger {
      position: relative;
      display: flex;
      align-items: center;
      height: var(--control-height);
      padding: var(--space-1) var(--space-3);
      padding-right: var(--space-11);
      background: var(--input-bg);
      border: var(--input-border-width, 1.5px) solid var(--input-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 200ms ease;
      font-size: var(--text-sm);
      box-sizing: border-box;
      box-shadow: var(--input-shadow);
      /* FIXED: Permitir clics en Wails */
      --wails-draggable: no-drag;
    }

    .select2-wrapper.has-label .select2-trigger {
      padding: var(--space-1) var(--space-3);
    }

    /* === FLOATING LABEL === */
    .floating-label {
      position: absolute;
      left: var(--space-3);
      top: 50%;
      transform: translateY(-50%);
      font-size: var(--text-sm);
      color: var(--input-placeholder);
      pointer-events: none;
      transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
      background: var(--input-bg);
      padding: 0 var(--space-2);
      white-space: nowrap;
    }

    .select2-wrapper.focused .floating-label,
    .select2-wrapper.has-value .floating-label {
      top: -0.625rem;
      transform: translateY(0);
      font-size: var(--text-xs);
      font-weight: 500;
      color: var(--info-color);
    }

    /* === MULTI-SELECT FIX === */
    .select2-wrapper.multiple .select2-trigger {
      min-height: var(--control-height);
      height: auto;
      padding: var(--space-1) var(--space-3);
      padding-right: var(--space-11);
      align-items: center;
    }

    .select2-trigger:hover {
      border-color: var(--input-border-focus);
      box-shadow: var(--input-shadow-hover);
    }

    .select2-wrapper.focused .select2-trigger {
      border-color: var(--input-border-focus);
      box-shadow: var(--input-shadow-focus);
    }

    .select2-trigger:focus-visible {
      outline: none;
      border-color: var(--input-border-focus);
      box-shadow: var(--input-shadow-focus);
    }

    .select2-value {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex: 1;
      font-size: var(--text-sm);
      color: var(--input-text);
      line-height: normal;
    }

    .placeholder {
      color: var(--input-placeholder);
    }

    .select2-arrow {
      position: absolute;
      right: var(--space-3);
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-color-secondary);
      transition: transform 200ms ease;
    }

    .select2-wrapper.open .select2-arrow {
      transform: translateY(-50%) rotate(180deg);
    }

    /* === TAGS (Multiple) === */
    .select2-tags {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1);
      flex: 1;
      padding: var(--space-1) 0;
    }

    .select2-tag {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-2);
      background: var(--info-color-lighter);
      color: var(--info-color-text);
      border-radius: var(--radius-full);
      font-size: var(--text-xs);
      font-weight: 500;
    }

    .tag-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--space-4);
      height: var(--space-4);
      padding: 0;
      background: none;
      border: none;
      border-radius: 50%;
      font-size: var(--text-sm);
      color: var(--info-color);
      cursor: pointer;
      transition: all 150ms ease;
    }

    .tag-remove:hover {
      background: var(--info-color-lighter);
    }

    /* === DROPDOWN === */
    .select2-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: var(--dropdown-bg);
      border: 1px solid var(--dropdown-border);
      border-radius: var(--radius-md);
      box-shadow: var(--dropdown-shadow);
      z-index: 10000;
      animation: dropdownSlide 200ms ease;
      overflow: hidden;
      /* FIXED: Permitir clics en Wails */
      --wails-draggable: no-drag;
    }

    @keyframes dropdownSlide {
      from { opacity: 0; transform: translateY(calc(-1 * var(--space-2))); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* === SEARCH === */
    .select2-search {
      position: relative;
      padding: var(--space-2);
      border-bottom: 1px solid var(--dropdown-border);
    }

    .search-input {
      width: 100%;
      padding: var(--space-2) var(--space-3);
      padding-left: var(--space-7);
      font-size: var(--text-md);
      border: 1px solid var(--input-border);
      border-radius: var(--radius-sm);
      background: var(--input-bg);
      color: var(--input-text);
      outline: none;
      box-shadow: var(--shadow-xs);
      transition: all 150ms ease;
    }

    .search-input:hover:not(:focus) {
      border-color: var(--input-border-hover);
      box-shadow: var(--shadow-sm);
    }

    .search-input:focus {
      border-color: var(--input-border-focus);
      background: var(--input-bg);
      box-shadow: var(--input-shadow-focus);
    }

    .search-icon {
      position: absolute;
      left: var(--space-4);
      top: 50%;
      transform: translateY(-50%);
      font-size: var(--text-sm);
    }

    /* === OPTIONS === */
    .select2-options {
      max-height: 240px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
    }

    /* Custom Scrollbar for dropdown */
    .select2-options::-webkit-scrollbar {
      width: 6px;
    }
    .select2-options::-webkit-scrollbar-track {
      background: var(--scrollbar-track);
    }
    .select2-options::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb);
      border-radius: var(--radius-full);
    }
    .select2-options::-webkit-scrollbar-thumb:hover {
      background: var(--scrollbar-thumb-hover);
    }

    .select2-option {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      font-size: var(--text-md);
      color: var(--dropdown-text, var(--text-color));
      cursor: pointer;
      transition: background 100ms ease;
    }
    


    .select2-option:hover:not(.disabled),
    .select2-option.highlighted:not(.disabled) {
      background: var(--dropdown-item-hover);
    }

    .select2-option.selected {
      background: var(--dropdown-item-selected);
      color: var(--info-color);
      font-weight: 500;
    }

    .select2-option.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .option-icon {
      font-size: var(--text-md);
    }

    .option-label {
      flex: 1;
    }

    .check-icon {
      color: var(--info-color);
      font-weight: bold;
    }

    .select2-no-results {
      padding: var(--space-4);
      text-align: center;
      color: var(--text-color-muted);
      font-size: var(--text-sm);
    }

    /* Dark mode handled automatically by CSS variables */
  `]
})
export class Select2Component implements ControlValueAccessor {
  @Input()
  set options(value: Select2Option[]) {
    this._options = [...(value || [])];
    this.reconcilePendingValue();
    this.ensureEnabledHighlight();
  }
  get options(): Select2Option[] {
    return this._options;
  }
  @Input() label = '';
  @Input() ariaLabel = '';
  @Input() placeholder = 'Seleccionar...';
  @Input() searchLabel = 'Buscar opciones';
  @Input()
  set disabled(value: boolean) {
    this.disabledState.set(value);
    if (value) {
      this.isOpen.set(false);
      this.searchTerm.set('');
      this.highlightedIndex.set(-1);
    }
  }
  get disabled(): boolean {
    return this.disabledState();
  }
  @Input() searchable = true;
  @Input() multiple = false;
  @Input() width = ''; // Optional: e.g., '200px', '50%', 'auto'
  @Output() valueChange = new EventEmitter<string | number | (string | number)[]>();

  isOpen = signal(false);
  searchTerm = signal('');
  selectedOption = signal<Select2Option | null>(null);
  selectedOptions = signal<Select2Option[]>([]);
  highlightedIndex = signal(-1);
  private _options: Select2Option[] = [];
  private readonly disabledState = signal(false);
  private pendingValue: unknown = null;

  // Generate unique ID for accessibility (aria-labelledby)
  private static instanceCounter = 0;
  private readonly _instanceId = ++Select2Component.instanceCounter;
  readonly selectId = () => `select2-label-${this._instanceId}`;
  readonly listboxId = () => `select2-listbox-${this._instanceId}`;
  readonly optionId = (index: number) => `select2-option-${this._instanceId}-${index}`;

  private readonly elementRef = inject(ElementRef);
  private onChange: (value: unknown) => void = () => { /* noop */ };
  private onTouched: () => void = () => { /* noop */ };

  hasValue(): boolean {
    return this.multiple ? this.selectedOptions().length > 0 : this.selectedOption() !== null;
  }

  filteredOptions(): Select2Option[] {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.options;
    return this.options.filter(o => o.label.toLowerCase().includes(term));
  }

  isSelected(option: Select2Option): boolean {
    if (this.multiple) {
      return this.selectedOptions().some(o => o.value === option.value);
    }
    return this.selectedOption()?.value === option.value;
  }

  toggleDropdown(): void {
    if (!this.disabled) {
      this.isOpen.update(v => !v);
      if (this.isOpen()) {
        this.ensureEnabledHighlight();
        
        // Focus search input if searchable
        if (this.searchable) {
          setTimeout(() => {
            const searchInput = this.elementRef.nativeElement.querySelector('.search-input');
            if (searchInput) searchInput.focus();
            this.scrollToHighlighted();
          }, 0);
        } else {
          setTimeout(() => {
            this.scrollToHighlighted();
          }, 0);
        }
      } else {
        this.searchTerm.set('');
        this.highlightedIndex.set(-1);
        this.onTouched();
      }
    }
  }

  handleKeydown(event: KeyboardEvent): void {
    if (this.disabled) return;

    const options = this.filteredOptions();
    const isSearchInput = (event.target as HTMLElement | null)?.classList.contains('search-input');

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen()) {
          this.toggleDropdown();
        } else {
          this.highlightedIndex.set(this.nextEnabledIndex(options, this.highlightedIndex(), 1));
          this.scrollToHighlighted();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.isOpen()) {
          this.toggleDropdown();
        } else {
          this.highlightedIndex.set(this.nextEnabledIndex(options, this.highlightedIndex(), -1));
          this.scrollToHighlighted();
        }
        break;
      case 'Enter':
      case ' ':
        if (event.key === ' ' && isSearchInput) return;
        event.preventDefault();
        if (!this.isOpen()) {
          this.toggleDropdown();
        } else if (this.highlightedIndex() >= 0) {
          const option = options[this.highlightedIndex()];
          if (option && !option.disabled) {
            this.selectOption(option);
          }
        }
        break;
      case 'Escape':
        if (this.isOpen()) {
          event.stopPropagation();
          this.isOpen.set(false);
          this.searchTerm.set('');
          this.highlightedIndex.set(-1);
          this.elementRef.nativeElement.querySelector('.select2-trigger')?.focus();
        }
        break;
      case 'Tab':
        if (this.isOpen()) {
          this.isOpen.set(false);
          this.searchTerm.set('');
          this.highlightedIndex.set(-1);
        }
        break;
    }
  }

  private scrollToHighlighted(): void {
    const listbox = this.elementRef.nativeElement.querySelector('.select2-options');
    const highlighted = listbox?.querySelectorAll('.select2-option')[this.highlightedIndex()];
    if (highlighted) {
      highlighted.scrollIntoView({ block: 'nearest' });
    }
  }

  selectOption(option: Select2Option): void {
    if (this.disabled || option.disabled) return;
    if (this.multiple) {
      const current = this.selectedOptions();
      if (this.isSelected(option)) {
        this.selectedOptions.set(current.filter(o => o.value !== option.value));
      } else {
        this.selectedOptions.set([...current, option]);
      }
      const values = this.selectedOptions().map(o => o.value);
      this.onChange(values);
      this.valueChange.emit(values);
      this.onTouched();
    } else {
      this.selectedOption.set(option);
      this.onChange(option.value);
      this.valueChange.emit(option.value);
      
      this.isOpen.set(false);
      this.searchTerm.set('');
      this.highlightedIndex.set(-1);
      this.onTouched();
    }
  }

  removeTag(option: Select2Option, event: Event): void {
    event.stopPropagation();
    if (this.disabled) return;
    const current = this.selectedOptions();
    this.selectedOptions.set(current.filter(o => o.value !== option.value));
    const values = this.selectedOptions().map(o => o.value);
    this.onChange(values);
    this.valueChange.emit(values);
    this.onTouched();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      if (this.isOpen()) {
        this.isOpen.set(false);
        this.searchTerm.set('');
        this.highlightedIndex.set(-1);
        this.onTouched();
      }
    }
  }

  writeValue(value: unknown): void {
    if (!this.options.length) {
      // Guarda el valor hasta que lleguen las opciones (carga asíncrona)
      this.pendingValue = value;
      this.clearSelection();
      return;
    }
    this.applyIncomingValue(value);
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onSearchTermChange(value: string): void {
    this.searchTerm.set(value);
    this.highlightedIndex.set(this.nextEnabledIndex(this.filteredOptions(), -1, 1));
  }

  removeTagLabel(option: Select2Option): string {
    return `Quitar ${option.label}`;
  }

  /** Limpia selecciones actuales */
  private clearSelection(): void {
    this.selectedOption.set(null);
    this.selectedOptions.set([]);
  }

  /** Aplica un valor entrante respetando los modos single/multiple */
  private applyIncomingValue(value: unknown, emit = false): void {
    if (this.multiple) {
      const values = Array.isArray(value) ? value as (string | number)[] : [];
      const validOptions = this.options.filter(o => values.includes(o.value));
      this.selectedOptions.set(validOptions);
      if (emit) {
        this.onChange(validOptions.map(o => o.value));
        this.valueChange.emit(validOptions.map(o => o.value));
      }
    } else {
      const option = this.options.find(o => o.value === value);
      this.selectedOption.set(option || null);
      if (emit && option) {
        this.onChange(option.value);
        this.valueChange.emit(option.value);
      }
    }
  }

  /** Rehidrata selección cuando cambian las opciones */
  private reconcilePendingValue(): void {
    if (this.pendingValue !== null) {
      this.applyIncomingValue(this.pendingValue);
      this.pendingValue = null;
      return;
    }

    // Revalida selección actual por si alguna opción desapareció
    if (this.multiple) {
      const currentValues = this.selectedOptions().map(o => o.value);
      this.applyIncomingValue(currentValues);
    } else {
      this.applyIncomingValue(this.selectedOption()?.value);
    }
  }

  private ensureEnabledHighlight(): void {
    if (!this.isOpen()) return;
    const options = this.filteredOptions();
    const current = this.highlightedIndex();
    if (current >= 0 && options[current] && !options[current].disabled) return;

    const selectedValue = !this.multiple ? this.selectedOption()?.value : undefined;
    const selected = options.findIndex(option => option.value === selectedValue && !option.disabled);
    this.highlightedIndex.set(selected >= 0 ? selected : this.nextEnabledIndex(options, -1, 1));
  }

  private nextEnabledIndex(
    options: readonly Select2Option[],
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
}
