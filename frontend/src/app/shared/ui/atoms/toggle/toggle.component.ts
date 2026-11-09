import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  forwardRef,
  inject
} from '@angular/core';

import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-toggle, prest-toggle',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ToggleComponent),
      multi: true
    }
  ],
  template: `
    <label class="toggle-wrapper" [class.disabled]="disabled">
      <input
        type="checkbox"
        role="switch"
        class="toggle-input"
        [checked]="checked"
        [disabled]="disabled"
        [attr.aria-checked]="checked"
        [attr.aria-label]="label ? null : ariaLabel"
        (change)="onToggleChange($event)"
      />
      <span class="toggle-track">
        <span class="toggle-thumb"></span>
      </span>
      @if (label) {
        <span class="toggle-label">{{ label }}</span>
      }
    </label>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    .toggle-wrapper {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      cursor: pointer;
      user-select: none;
    }

    .toggle-wrapper.disabled {
      cursor: not-allowed;
      color: var(--input-disabled-text);
    }

    .toggle-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    /*
    LA GEOMETRIA VUELVE A CERRAR.

    Los comentarios que habia aqui contaban la historia: "24px → var(--space-5)"
    y "20px → var(--space-5)". Dos medidas distintas acabaron en el mismo token
    porque la sustitucion se hizo por parecido, no por aritmetica. Con los
    valores reales -pista 3rem por 1.75rem, relleno 0.25rem, pulgar 1.5rem- el
    pulgar era MAS ALTO que el interior de su pista y sobresalia por abajo, y al
    marcarlo se iba 0.5rem por fuera del borde derecho, porque el recorrido
    disponible era 1rem y se pedia 1.5rem.

    Ahora las tres medidas se sostienen entre si y todas caen en la escala:

        interior = 3rem - 2(0.25rem) = 2.5rem de ancho, 1rem de alto
        pulgar   = 1rem  -> cabe EXACTO en el alto: queda centrado solo
        recorrido = 2.5rem - 1rem = 1.5rem  -> es var(--space-5), no una casualidad

    El relleno se declara con un token que existe. Antes era
    "var(--space-0, var(--space-1))", y "--space-0" no esta definido en ninguna
    parte: el valor salia siempre del respaldo, con lo que el primer termino
    solo servia para hacer creer que el relleno era cero.
    */
    .toggle-track {
      width: var(--space-8);
      height: var(--space-5);
      background: var(--border-color);
      border-radius: var(--radius-xl);
      padding: var(--space-1);
      transition: all 200ms ease;
      flex-shrink: 0;
      box-sizing: border-box;
    }

    .toggle-thumb {
      display: block;
      width: var(--space-4);
      height: var(--space-4);
      background: var(--surface-background);
      border-radius: 50%;
      box-shadow: var(--shadow-sm);
      transition: transform 200ms ease;
    }

    /* Hover */
    .toggle-wrapper:hover:not(.disabled) .toggle-track {
      background: var(--text-color-secondary);
    }

    /* Checked */
    .toggle-input:checked + .toggle-track {
      background: var(--primary-color);
    }

    .toggle-input:checked + .toggle-track .toggle-thumb {
      /* 2.5rem de interior menos 1rem de pulgar. Es exacto, no aproximado. */
      transform: translateX(var(--space-5));
    }

    /* Focus */
    .toggle-input:focus-visible + .toggle-track {
      box-shadow: var(--input-shadow-focus);
    }

    .toggle-label {
      font-size: var(--text-sm);
      color: var(--text-color);
      line-height: 1.4;
    }

    /*
     * Dark mode se maneja automáticamente via tokens semánticos.
     * --border-color, --surface-background, --primary-color, --shadow-focus-primary
     * ya tienen valores apropiados para temas oscuros.
     */
  `]
})
export class ToggleComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() ariaLabel = 'Alternar opción';
  @Input() disabled = false;

  checked = false;
  onChange: (value: boolean) => void = () => { /* noop */ };
  onTouched: () => void = () => { /* noop */ };
  private readonly changeDetector = inject(ChangeDetectorRef);

  onToggleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.checked = target.checked;
    this.onChange(this.checked);
    this.onTouched();
  }

  writeValue(value: boolean): void {
    this.checked = value === true;
    this.changeDetector.markForCheck();
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.changeDetector.markForCheck();
  }
}
