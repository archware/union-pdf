import { Component, Input, ChangeDetectionStrategy } from '@angular/core';


export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'primary' | 'secondary' | 'white' | 'current';

/**
 * SpinnerComponent — Indicador de carga inline minimalista.
 * Usa solo CSS; sin FontAwesome, sin SVG externo.
 * Ideal para botones, inputs y espacios reducidos.
 *
 * @example
 * ```html
 * <!-- En un botón -->
 * <app-button [disabled]="loading">
 *   @if (loading) {
 *     <app-spinner size="sm" variant="white"></app-spinner>
 *   }
 *   {{ loading ? 'Guardando…' : 'Guardar' }}
 * </app-button>
 *
 * <!-- Standalone -->
 * <app-spinner size="md" variant="primary"></app-spinner>
 * ```
 */
@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="spinner"
      [class]="'spinner--' + size + ' spinner--' + variant"
      [attr.role]="'status'"
      [attr.aria-label]="label"
      [attr.aria-live]="'polite'"
    >
      <span class="spinner__ring"></span>
      <span class="visually-hidden">{{ label }}</span>
    </span>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; justify-content: center; }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }

    .spinner {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    /* Sizes */
    .spinner--xs  { --sz: var(--icon-xs); --border: var(--border-width-thin); }
    .spinner--sm  { --sz: var(--icon-sm); --border: var(--border-width-medium); }
    .spinner--md  { --sz: var(--icon-md); --border: var(--border-width-medium); }
    .spinner--lg  { --sz: var(--icon-lg); --border: var(--border-width-thick); }
    .spinner--xl  { --sz: var(--space-7); --border: var(--space-1); }

    /* Variants — track color */
    .spinner--primary .spinner__ring  { border-color: var(--primary-color-alpha, rgba(59,130,246,.25)); border-top-color: var(--primary-color, #3b82f6); }
    .spinner--secondary .spinner__ring { border-color: var(--secondary-color-alpha, rgba(100,116,139,.25)); border-top-color: var(--secondary-color, #64748b); }
    .spinner--white .spinner__ring    { border-color: var(--border-color); border-top-color: var(--gray-0); }
    .spinner--current .spinner__ring  { border-color: transparent; border-top-color: currentColor; }

    .spinner__ring {
      display: block;
      width: var(--sz, var(--icon-md));
      height: var(--sz, var(--icon-md));
      border-width: var(--border, 2.5px);
      border-style: solid;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class SpinnerComponent {
  @Input() size: SpinnerSize = 'md';
  @Input() variant: SpinnerVariant = 'primary';
  @Input() label = 'Cargando…';
}
