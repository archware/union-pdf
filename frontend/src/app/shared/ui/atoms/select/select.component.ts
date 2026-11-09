import { AfterViewInit, Component, ElementRef, Input, ViewChild, forwardRef } from '@angular/core';

import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string | number;
  label: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="form-group" [class.has-error]="error" [class.disabled]="disabled">
      @if (label) {
        <label class="form-label" [attr.for]="selectId">{{ label }}</label>
      }
      <div class="select-container">
        <select
          #nativeSelect
          [id]="selectId"
          class="form-select"
          [disabled]="disabled"
          [value]="value"
          (change)="onSelectChange($event)"
          (blur)="onTouched()"
        >
          @if (placeholder) {
            <option value="" disabled [selected]="!value">{{ placeholder }}</option>
          }
          @for (option of options; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
        <!-- Arrow handled by form-select background-image -->
      </div>
      @if (error) {
        <span class="select-error">{{ error }}</span>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .select-container {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .select-arrow {
      position: absolute;
      right: var(--space-3);
      color: var(--text-color-muted);
      pointer-events: none;
      transition: transform 200ms ease;
    }

    .select-error {
      font-size: var(--text-xs);
      color: var(--danger-color-text);
    }
  `]
})
export class SelectComponent implements ControlValueAccessor, AfterViewInit {
  @Input() options: SelectOption[] = [];
  @Input() label = '';
  @Input() placeholder = '';
  @Input() error = '';
  @Input() disabled = false;
  private static idCounter = 0;
  readonly selectId = `app-select-${++SelectComponent.idCounter}`;

  @ViewChild('nativeSelect') private nativeSelect?: ElementRef<HTMLSelectElement>;

  value: string | number = '';
  onChange: (value: string | number) => void = () => { /* noop */ };
  onTouched: () => void = () => { /* noop */ };

  ngAfterViewInit(): void {
    this.syncNativeValue();
  }

  onSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  writeValue(value: string | number): void {
    this.value = value ?? '';
    /*
    RECHAZAR UNA ELECCION TAMBIEN TIENE QUE RETIRARLA DE LA PANTALLA.

    Cuando el padre rechaza lo elegido y repone SU valor —el mismo que ya tenia—
    llega aqui un `writeValue` con un valor que no cambia. El binding `[value]`
    compara contra lo ultimo que escribio, ve que es identico y no toca el DOM.
    El navegador, en cambio, ya movio el `<select>` al hacer clic la persona.

    Resultado: lo que se ve deja de ser lo que se envia, y ni el padre ni el
    consumidor tienen forma de arreglarlo desde fuera.

    La mitad olvidada del capitulo 4: la reconciliacion del DOM es parte del
    rechazo, no un extra. Se escribe siempre; si ya coincide, no cuesta nada.
    */
    this.syncNativeValue();
  }

  private syncNativeValue(): void {
    const element = this.nativeSelect?.nativeElement;
    if (!element) {
      // Todavia sin vista: el binding `[value]` pinta el primer estado.
      return;
    }
    const expected = this.value === null || this.value === undefined ? '' : String(this.value);
    if (element.value !== expected) {
      element.value = expected;
    }
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
