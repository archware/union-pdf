import { Component, Input, ChangeDetectionStrategy } from '@angular/core';


/**
 * A divider component to separate content.
 * Supports optional text in the center.
 *
 * @example
 * ```html
 * <!-- Simple line -->
 * <app-divider></app-divider>
 *
 * <!-- With text -->
 * <app-divider text="OR"></app-divider>
 * ```
 */
@Component({
  selector: 'app-divider',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="divider"
         [class.divider--vertical]="orientation === 'vertical'"
         [class.divider--light]="variant === 'light'"
         [class.divider--strong]="variant === 'strong'"
         [class.divider--dashed]="variant === 'dashed'"
         role="separator">
      @if (label || text) {
        <span class="divider-text">{{ label || text }}</span>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      margin: var(--space-6) 0;
    }

    :host-context(.vertical), :host(.divider-vertical) {
      width: auto;
      height: 100%;
      margin: 0 var(--space-6);
    }

    .divider {
      display: flex;
      align-items: center;
      width: 100%;
      color: var(--border-color);
    }

    .divider--vertical {
      flex-direction: column;
      width: auto;
      height: 100%;
      min-height: var(--space-5);
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background-color: currentColor;
    }

    .divider--vertical::before,
    .divider--vertical::after {
      height: auto;
      width: 1px;
      flex: 1;
      min-height: var(--space-3);
    }

    /* Variants */
    .divider--light { opacity: 0.4; }

    .divider--strong::before,
    .divider--strong::after { height: var(--space-1); }
    .divider--strong.divider--vertical::before,
    .divider--strong.divider--vertical::after { width: var(--space-1); height: auto; }

    .divider--dashed::before,
    .divider--dashed::after {
      height: 0;
      background: none;
      border-top: 1px dashed currentColor;
    }
    .divider--dashed.divider--vertical::before,
    .divider--dashed.divider--vertical::after {
      width: 0;
      height: auto;
      border-top: none;
      border-left: 1px dashed currentColor;
      background: none;
    }

    .divider-text {
      padding: 0 var(--space-3);
      font-size: var(--text-xs);
      font-weight: var(--font-weight-body);
      color: var(--text-color-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }

    .divider--vertical .divider-text {
      padding: var(--space-3) 0;
    }
  `]
})
export class DividerComponent {
  /** Optional text to display in the middle of the divider */
  @Input() text = '';
  /** Label text to display in the middle (alias for text) */
  @Input() label = '';
  /** Visual style of the divider */
  @Input() variant: 'default' | 'light' | 'strong' | 'dashed' = 'default';
  /** Orientation of the divider */
  @Input() orientation: 'horizontal' | 'vertical' = 'horizontal';
}
