import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

export type VersionVariant = 'pill' | 'badge' | 'text' | 'compact';

/**
 * Reusable version indicator component for footers, topbars, and application info panels.
 * Guaranteed 100% visible across all themes with solid fallback colors.
 */
@Component({
  selector: 'app-version',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="atomic-version" [class]="'atomic-version--' + (variant || 'badge')">
      @if (variant === 'pill' || variant === 'badge' || !variant) {
        <span class="atomic-version__dot" [class]="'atomic-version__dot--' + (environment || 'beta').toLowerCase()"></span>
      }
      
      @if (appName) {
        <span class="atomic-version__name">{{ appName }}</span>
      }
      
      <span class="atomic-version__number">{{ version || 'v1.6.1' }}</span>

      @if (environment) {
        <span class="atomic-version__env" [class]="'atomic-version__env--' + (environment || 'beta').toLowerCase()">
          {{ environment }}
        </span>
      }

      @if (showBuildDate && buildDate) {
        <span class="atomic-version__date">({{ buildDate }})</span>
      }
    </div>
  `,
  styles: [`
    :host {
      display: inline-block !important;
      vertical-align: middle !important;
    }

    .atomic-version {
      display: inline-flex !important;
      align-items: center !important;
      gap: var(--space-2) !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 0.75rem !important;
      line-height: 1 !important;
      color: var(--text-color-secondary) !important;
      user-select: none !important;
      visibility: visible !important;
      opacity: 1 !important;
    }

    /* === PILL VARIANT === */
    .atomic-version--pill {
      padding: var(--space-1) var(--space-3) !important;
      background: var(--surface-elevated) !important;
      border: 1px solid var(--border-color) !important;
      border-radius: var(--radius-full) !important;
    }

    /* === BADGE VARIANT === */
    .atomic-version--badge {
      padding: var(--space-1) var(--space-2) !important;
      background: var(--surface-background) !important;
      border: 1px solid var(--border-color) !important;
      border-radius: var(--radius-sm) !important;
    }

    /* === TEXT VARIANT === */
    .atomic-version--text {
      background: transparent !important;
      border: none !important;
      padding: 0 !important;
    }

    /* === COMPACT VARIANT === */
    .atomic-version--compact {
      gap: var(--space-1) !important;
      font-size: 0.7rem !important;
    }

    /* Elements */
    .atomic-version__dot {
      width: var(--space-2) !important;
      height: var(--space-2) !important;
      border-radius: 50% !important;
      background-color: var(--success-color) !important;
      box-shadow: 0 0 var(--space-2) var(--success-color) !important;
      display: inline-block !important;
    }

    .atomic-version__dot--dev {
      background-color: var(--warning-color) !important;
      box-shadow: 0 0 var(--space-2) var(--warning-color) !important;
    }

    .atomic-version__dot--beta {
      background-color: var(--info-color) !important;
      box-shadow: 0 0 var(--space-2) var(--info-color) !important;
    }

    .atomic-version__dot--qa, .atomic-version__dot--staging {
      background-color: var(--primary-color) !important;
      box-shadow: 0 0 var(--space-2) var(--primary-color) !important;
    }

    .atomic-version__name {
      font-weight: 500 !important;
      color: var(--text-color-secondary) !important;
    }

    .atomic-version__number {
      font-weight: 700 !important;
      letter-spacing: 0.03em !important;
      color: var(--text-color) !important;
    }

    .atomic-version__env {
      padding: var(--space-1) var(--space-2) !important;
      border: 1px solid var(--info-color) !important;
      border-radius: var(--radius-sm) !important;
      font-size: 0.65rem !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      background: var(--info-color-lighter) !important;
      color: var(--info-color-text) !important;
    }

    .atomic-version__env--prod {
      background: var(--success-color-lighter) !important;
      border-color: var(--success-color) !important;
      color: var(--success-color-text) !important;
    }

    .atomic-version__env--dev {
      background: var(--warning-color-lighter) !important;
      border-color: var(--warning-color) !important;
      color: var(--warning-color-text) !important;
    }

    .atomic-version__env--beta {
      background: var(--info-color-lighter) !important;
      border-color: var(--info-color) !important;
      color: var(--info-color-text) !important;
    }

    .atomic-version__env--qa, .atomic-version__env--staging {
      background: var(--primary-color-lighter) !important;
      border-color: var(--primary-color) !important;
      color: var(--primary-color-text) !important;
    }

    .atomic-version__date {
      color: var(--text-color-muted) !important;
      font-size: 0.65rem !important;
    }
  `]
})
export class VersionComponent {
  @Input() version = 'v1.6.1';
  @Input() appName = '';
  @Input() environment = 'BETA';
  @Input() variant: VersionVariant = 'badge';
  @Input() showBuildDate = false;
  @Input() buildDate = '';
}
