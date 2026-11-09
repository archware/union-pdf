import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';


export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';
export type AlertSize = 'sm' | 'md' | 'lg';

/**
 * AlertComponent — Mensaje de estado inline.
 * A diferencia del Toast (global/flotante), el Alert se embebe en el flujo del documento.
 *
 * @example
 * ```html
 * <app-alert variant="success" title="Guardado" message="Los cambios fueron guardados."></app-alert>
 * <app-alert variant="danger" [closable]="true" (closed)="onClose()">
 *   Error al procesar la solicitud.
 * </app-alert>
 * ```
 */
@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible) {
      <div
        class="alert"
        [class]="'alert--' + variant + ' alert--' + size"
        [class.alert--dismissible]="closable"
        role="alert"
        [attr.aria-live]="variant === 'danger' ? 'assertive' : 'polite'"
      >
        <!-- Icon -->
        <span class="alert__icon" aria-hidden="true">
          @switch (variant) {
            @case ('info')    { <i class="fa-solid fa-circle-info"></i> }
            @case ('success') { <i class="fa-solid fa-circle-check"></i> }
            @case ('warning') { <i class="fa-solid fa-triangle-exclamation"></i> }
            @case ('danger')  { <i class="fa-solid fa-circle-xmark"></i> }
          }
        </span>

        <!-- Body -->
        <div class="alert__body">
          @if (title) {
            <p class="alert__title">{{ title }}</p>
          }
          @if (message) {
            <p class="alert__message">{{ message }}</p>
          }
          <ng-content></ng-content>
        </div>

        <!-- Close button -->
        @if (closable) {
          <button
            type="button"
            class="alert__close"
            aria-label="Cerrar alerta"
            (click)="dismiss()"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        }
      </div>
    }
  `,
  styles: [`
    .alert {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      font-size: var(--text-sm);
      position: relative;
    }

    /* Sizes */
    .alert--sm { padding: var(--space-2) var(--space-3); font-size: var(--text-xs); }
    .alert--md { padding: var(--space-3) var(--space-4); }
    .alert--lg { padding: var(--space-4) var(--space-5); font-size: var(--text-base); }

    /* Variants */
    .alert--info {
      background-color: var(--color-info-50, #eff6ff);
      border-color: var(--color-info-200, #bfdbfe);
      color: var(--color-info-800, #1e40af);
    }
    .alert--success {
      background-color: var(--color-success-50, #f0fdf4);
      border-color: var(--color-success-200, #bbf7d0);
      color: var(--color-success-800, #166534);
    }
    .alert--warning {
      background-color: var(--color-warning-50, var(--gray-0)beb);
      border-color: var(--color-warning-200, #fde68a);
      color: var(--color-warning-800, #92400e);
    }
    .alert--danger {
      background-color: var(--color-danger-50, #fef2f2);
      border-color: var(--color-danger-200, #fecaca);
      color: var(--color-danger-800, #991b1b);
    }

    /* Icon */
    .alert__icon {
      flex-shrink: 0;
      font-size: var(--space-4);
      margin-top: 1px;
    }

    /* Body */
    .alert__body {
      flex: 1;
      min-width: 0;
    }

    .alert__title {
      margin: 0 0 var(--space-1);
      font-weight: var(--font-semibold, 600);
      line-height: 1.4;
    }

    .alert__message {
      margin: 0;
      opacity: 0.9;
      line-height: 1.5;
    }

    /* Close button */
    .alert--dismissible { padding-right: var(--space-10, 2.5rem); }

    .alert__close {
      position: absolute;
      top: var(--space-2);
      right: var(--space-2);
      background: none;
      border: none;
      cursor: pointer;
      padding: var(--space-1);
      border-radius: var(--radius-sm);
      opacity: 0.6;
      color: inherit;
      transition: opacity 150ms ease;
      line-height: 1;
    }
    .alert__close:hover { opacity: 1; }
    .alert__close:focus-visible {
      outline: var(--space-1) solid currentColor;
      outline-offset: 1px;
    }
  `],
})
export class AlertComponent {
  @Input() variant: AlertVariant = 'info';
  @Input() size: AlertSize = 'md';
  @Input() title = '';
  @Input() message = '';
  @Input() closable = false;

  @Output() closed = new EventEmitter<void>();

  protected visible = true;

  dismiss(): void {
    this.visible = false;
    this.closed.emit();
  }
}
