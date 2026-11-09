import {
  Component, Input, Output, EventEmitter, signal, HostListener,
  ElementRef, ChangeDetectionStrategy, forwardRef, OnChanges, SimpleChanges, inject
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface DropdownOption {
  value: string | number;
  label: string;
  icon?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-dropdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => DropdownComponent),
    multi: true
  }],
  template: `
    <div class="dropdown" [class.open]="isOpen()" [class.disabled]="disabled">
      <button type="button"
        class="dropdown-trigger"
        (click)="toggleDropdown()"
        (keydown.enter)="toggleDropdown()"
        (keydown.space)="toggleDropdown()"
        [attr.aria-expanded]="isOpen()"
        aria-haspopup="listbox"
        [disabled]="disabled"
      >
        <span class="dropdown-value">
          @if (selectedOption()) {
            @if (selectedOption()!.icon) {
              <span class="option-icon">{{ selectedOption()!.icon }}</span>
            }
            {{ selectedOption()!.label }}
          } @else {
            <span class="placeholder">{{ placeholder }}</span>
          }
        </span>
        <span class="dropdown-arrow">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
      </button>

      @if (isOpen()) {
        <div class="dropdown-menu" role="listbox">
          @for (option of options; track option.value) {
            <button type="button"
              class="dropdown-option"
              [class.selected]="option.value === value"
              [class.disabled]="option.disabled"
              (click)="!option.disabled && selectOption(option)"
              (keydown.enter)="!option.disabled && selectOption(option)"
              (keydown.space)="!option.disabled && selectOption(option)"
              role="option"
              [attr.aria-selected]="option.value === value"
            >
              @if (option.icon) {
                <span class="option-icon">{{ option.icon }}</span>
              }
              {{ option.label }}
              @if (option.value === value) {
                <span class="check-icon">✓</span>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .dropdown {
      position: relative;
      display: block;
      width: 100%;
    }

    .dropdown.disabled {
      pointer-events: none;
      color: var(--input-disabled-text);
    }

    .dropdown-trigger {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-2) var(--space-3);
      background: var(--surface-background);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      color: var(--text-color);
      cursor: pointer;
      transition: all 150ms ease;
    }

    .dropdown-trigger:hover:not(:disabled) {
      border-color: var(--input-border-hover);
    }

    .dropdown.open .dropdown-trigger {
      border-color: var(--input-border-focus);
      box-shadow: var(--input-shadow-focus);
    }

    .dropdown-value {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .placeholder {
      color: var(--text-color-muted);
    }

    .dropdown-arrow {
      color: var(--text-color-muted);
      transition: transform 200ms ease;
    }

    .dropdown.open .dropdown-arrow {
      transform: rotate(180deg);
    }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + var(--space-1));
      left: 0;
      right: 0;
      background: var(--surface-background);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-dropdown);
      z-index: 100;
      max-height: 240px;
      overflow-y: auto;
      animation: dropdownFade 150ms ease;
    }

    .dropdown-option {
      width: 100%;
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      background: none;
      border: none;
      font-size: var(--text-sm);
      color: var(--text-color);
      cursor: pointer;
      transition: background 100ms ease;
      text-align: left;
    }

    .dropdown-option:hover:not(.disabled) {
      background: var(--surface-hover);
    }

    .dropdown-option.selected {
      color: var(--primary-color);
      font-weight: var(--font-weight-body);
      background: var(--primary-color-lighter);
    }

    .dropdown-option.disabled {
      cursor: not-allowed;
      color: var(--input-disabled-text);
    }

    .option-icon {
      font-size: var(--text-md);
    }

    .check-icon {
      margin-left: auto;
      color: var(--primary-color);
    }

    @keyframes dropdownFade {
      from { opacity: 0; transform: translateY(calc(-1 * var(--space-2))); }
      to { opacity: 1; transform: translateY(0); }
    }

    /*
     * Dark mode se maneja automáticamente via tokens semánticos.
     * --surface-background, --border-color, --primary-color, --shadow-dropdown
     * ya tienen valores apropiados para temas oscuros.
     */
  `]
})
export class DropdownComponent implements OnChanges, ControlValueAccessor {
  @Input() options: DropdownOption[] = [];
  @Input() value?: string | number;
  @Input() placeholder = 'Seleccionar...';
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string | number>();

  isOpen = signal(false);
  selectedOption = signal<DropdownOption | null>(null);

  // ControlValueAccessor
  private onChange: (value: string | number) => void = () => { /* noop */ };
  private onTouched: () => void = () => { /* noop */ };

  private readonly elementRef = inject(ElementRef);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['value'] || changes['options']) {
      this.updateSelectedOption();
    }
  }

  writeValue(value: string | number): void {
    this.value = value;
    this.updateSelectedOption();
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

  private updateSelectedOption() {
    if (this.value !== undefined) {
      const option = this.options.find(o => o.value === this.value);
      this.selectedOption.set(option || null);
    } else {
      this.selectedOption.set(null);
    }
  }

  toggleDropdown() {
    if (!this.disabled) {
      this.isOpen.update(v => !v);
      this.onTouched();
    }
  }

  selectOption(option: DropdownOption) {
    this.value = option.value;
    this.selectedOption.set(option);
    this.valueChange.emit(option.value);
    this.onChange(option.value);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
