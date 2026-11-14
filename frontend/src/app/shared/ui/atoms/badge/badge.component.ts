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
      box-sizing: border-box;
      border: var(--border-width-thin) solid transparent;
      font-weight: var(--font-weight-title);
      line-height: 1;
      border-radius: var(--radius-full, 9999px);
      white-space: nowrap;
      font-size: var(--text-xs);
      min-width: var(--space-5);
      height: var(--space-5);
      padding: 0 var(--space-2);
    }

    /* Sizes */
    .badge--sm { font-size: 0.625rem; min-width: var(--space-4); height: var(--space-4); padding: 0 var(--space-1); }
    .badge--md { font-size: var(--text-xs); min-width: var(--space-5); height: var(--space-5); }
    .badge--lg { font-size: var(--text-sm); min-width: var(--space-5); height: var(--space-5); padding: 0 var(--space-2); }

    /* Variants */
    .badge--default,
    .badge--neutral   { background-color: var(--badge-default-bg); border-color: var(--badge-default-border); color: var(--badge-default-text); }
    .badge--primary   { background-color: var(--badge-primary-bg); border-color: var(--badge-primary-border); color: var(--badge-primary-text); }
    .badge--secondary { background-color: var(--badge-secondary-bg); border-color: var(--badge-secondary-border); color: var(--badge-secondary-text); }
    .badge--success   { background-color: var(--badge-success-bg); border-color: var(--badge-success-border); color: var(--badge-success-text); }
    .badge--warning   { background-color: var(--badge-warning-bg); border-color: var(--badge-warning-border); color: var(--badge-warning-text); }
    .badge--danger,
    .badge--error     { background-color: var(--badge-danger-bg); border-color: var(--badge-danger-border); color: var(--badge-danger-text); }
    .badge--info      { background-color: var(--badge-info-bg); border-color: var(--badge-info-border); color: var(--badge-info-text); }
    .badge--outline   { background-color: var(--badge-outline-bg); border-color: var(--badge-outline-border); color: var(--badge-outline-text); }

    /* Dot variant (after variants to keep borderless dot sizing and vivid indicator fills) */
    .badge--dot { min-width: var(--space-2); height: var(--space-2); padding: 0; border-width: 0; border-radius: 50%; }
    .badge--dot.badge--sm { min-width: var(--space-2); height: var(--space-2); }
    .badge--dot.badge--lg { min-width: var(--space-3); height: var(--space-3); }
    .badge--dot.badge--default,
    .badge--dot.badge--neutral   { background-color: var(--text-color-secondary); }
    .badge--dot.badge--primary   { background-color: var(--primary-color); }
    .badge--dot.badge--secondary { background-color: var(--secondary-color); }
    .badge--dot.badge--success   { background-color: var(--success-color); }
    .badge--dot.badge--warning   { background-color: var(--warning-color); }
    .badge--dot.badge--danger,
    .badge--dot.badge--error     { background-color: var(--danger-color); }
    .badge--dot.badge--info      { background-color: var(--info-color); }

    /* Overlay positioning (after variants and dot so cutout border wins) */
    .badge--overlay {
      position: absolute;
      z-index: 1;
      border-width: var(--space-1);
      border-style: solid;
      border-color: var(--surface-background);
    }
    .badge--top-right  { top: calc(-1 * var(--space-1)); right: calc(-1 * var(--space-1)); transform: translate(25%, -25%); }
    .badge--top-left   { top: calc(-1 * var(--space-1)); left: calc(-1 * var(--space-1));  transform: translate(-25%, -25%); }
    .badge--bottom-right { bottom: calc(-1 * var(--space-1)); right: calc(-1 * var(--space-1)); transform: translate(25%, 25%); }
    .badge--bottom-left  { bottom: calc(-1 * var(--space-1)); left: calc(-1 * var(--space-1));  transform: translate(-25%, 25%); }
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
