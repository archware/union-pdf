import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgePosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

/**
 * BadgeComponent — Contador numérico o indicador de estado superpuesto a otro elemento.
 * Soporta modo standalone y modo overlay (anclado a un contenedor padre).
 *
 * @example — Standalone
 * ```html
 * <app-badge [count]="5" variant="danger"></app-badge>
 * ```
 *
 * @example — Overlay sobre ícono
 * ```html
 * <div style="position:relative; display:inline-block;">
 *   <i class="fa-solid fa-bell"></i>
 *   <app-badge [count]="12" variant="danger" [overlay]="true"></app-badge>
 * </div>
 * ```
 *
 * @example — Punto indicador (sin número)
 * ```html
 * <app-badge variant="success" [dot]="true"></app-badge>
 * ```
 */
@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible) {
      <span
        class="badge"
        [ngClass]="badgeClasses"
        [attr.aria-label]="ariaLabel || (count ? count + ' notificaciones' : null)"
      >
        @if (!dot) {
          {{ displayCount }}
        }
      </span>
    }
    @if (!visible && overlay) {
      <ng-content></ng-content>
    }
  `,
  styles: [`
    :host { display: inline-flex; }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: var(--font-weight-emphasis);
      line-height: 1;
      border-radius: var(--radius-full, 9999px);
      white-space: nowrap;
      font-size: var(--text-xs);
      min-width: var(--space-5);
      height: var(--space-5);
      padding: 0 var(--space-1-5, var(--space-2));
    }

    /* Sizes */
    .badge--sm { font-size: 0.625rem; min-width: var(--space-4); height: var(--space-4); padding: 0 var(--space-1); }
    .badge--md { font-size: var(--text-xs); min-width: var(--space-5); height: var(--space-5); }
    .badge--lg { font-size: var(--text-sm); min-width: var(--space-5); height: var(--space-5); padding: 0 var(--space-2); }

    /* Dot variant */
    .badge--dot { min-width: var(--space-2); height: var(--space-2); padding: 0; border-radius: 50%; }
    .badge--dot.badge--sm { min-width: var(--space-2); height: var(--space-2); }
    .badge--dot.badge--lg { min-width: var(--space-3); height: var(--space-3); }

    /* Overlay positioning */
    .badge--overlay {
      position: absolute;
      z-index: 1;
      border: var(--space-1) solid var(--surface-background, white);
    }
    .badge--top-right  { top: calc(-1 * var(--space-1)); right: calc(-1 * var(--space-1)); transform: translate(25%, -25%); }
    .badge--top-left   { top: calc(-1 * var(--space-1)); left: calc(-1 * var(--space-1));  transform: translate(-25%, -25%); }
    .badge--bottom-right { bottom: calc(-1 * var(--space-1)); right: calc(-1 * var(--space-1)); transform: translate(25%, 25%); }
    .badge--bottom-left  { bottom: calc(-1 * var(--space-1)); left: calc(-1 * var(--space-1));  transform: translate(-25%, 25%); }

    /* Variants */
    .badge--default   { background: var(--surface-section); color: var(--text-color-secondary); }
    .badge--primary   { background: var(--primary-color); color: white; }
    .badge--secondary { background: var(--secondary-color); color: white; }
    .badge--success   { background: var(--success-color); color: white; }
    .badge--warning   { background: var(--warning-color); color: white; }
    .badge--danger    { background: var(--danger-color); color: white; }
    .badge--info      { background: var(--info-color, #3b82f6); color: white; }
  `]
})
export class BadgeComponent {
  /** Number to display. Set to 0 to hide. */
  @Input() count: number | null = null;

  /** Maximum count to display before showing "max+" */
  @Input() max = 99;

  /** Color variant */
  @Input() variant: BadgeVariant = 'danger';

  /** Size variant */
  @Input() size: BadgeSize = 'md';

  /** Show as a small dot without number */
  @Input() dot = false;

  /** Position absolute over parent (parent needs position:relative) */
  @Input() overlay = false;

  /** Corner position when overlay is true */
  @Input() position: BadgePosition = 'top-right';

  /** Show or hide the badge */
  @Input() visible = true;

  /** Custom aria-label */
  @Input() ariaLabel = '';

  get displayCount(): string {
    if (this.count === null) return '';
    return this.count > this.max ? `${this.max}+` : `${this.count}`;
  }

  get badgeClasses(): Record<string, boolean> {
    return {
      [`badge--${this.variant}`]: true,
      [`badge--${this.size}`]: true,
      'badge--dot': this.dot,
      'badge--overlay': this.overlay,
      [`badge--${this.position}`]: this.overlay,
    };
  }
}
