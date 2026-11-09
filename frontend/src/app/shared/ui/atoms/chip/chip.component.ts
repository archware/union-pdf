import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

/**
 * Available chip color variants.
 * @remarks Maps to semantic colors from the design system.
 */
export type ChipVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'outline';

/** Chip size options */
export type ChipSize = 'sm' | 'md' | 'lg';

/**
 * Chip/Tag component for displaying status, categories, or labels.
 * Supports interactive behavior (clickable) and removal functionality.
 * 
 * @example
 * ```html
 * <!-- Basic status chip -->
 * <app-chip variant="success">Active</app-chip>
 * 
 * <!-- Removable chip -->
 * <app-chip variant="primary" [removable]="true" (remove)="onRemove()">
 *   Tag Name
 * </app-chip>
 * 
 * <!-- Clickable chip -->
 * <app-chip variant="outline" [clickable]="true" (chipClick)="onSelect()">
 *   Filter Option
 * </app-chip>
 * ```
 * 
 * @see {@link ChipVariant} for available color variants
 */
@Component({
  selector: 'app-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span 
      class="chip"
      [class]="'chip-' + variant + ' chip-' + size"
      [class.chip-interactive]="clickable"
      [class.chip-selected]="selected"
      (click)="onClick()"
      (keydown.enter)="onClick()"
      (keydown.space)="onClick()"
      [attr.role]="clickable ? 'button' : null"
      [attr.tabindex]="clickable ? 0 : null"
    >
      @if (icon) {
        <span class="chip-icon">{{ icon }}</span>
      }
      <span class="chip-label"><ng-content></ng-content></span>
      @if (removable) {
        <button type="button"
          class="chip-remove" 
          (click)="onRemove($event)"
          (keydown.enter)="onRemove($event)"
          (keydown.space)="onRemove($event)"
          aria-label="Eliminar"
        >×</button>
      }
    </span>
  `,
  styles: [`
    .chip {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-full);
      font-size: var(--text-xs);
      font-weight: 600;
      line-height: 1.1;
      transition: all 150ms ease;
      border: 1px solid transparent;
    }

    .chip-sm { padding: var(--space-1) var(--space-2); font-size: var(--text-xs); }
    .chip-md { padding: var(--space-1) var(--space-2); font-size: var(--text-xs); }
    .chip-lg { padding: var(--space-1) var(--space-3); font-size: var(--text-sm); }

    .chip-default {
      background: var(--surface-elevated);
      color: var(--text-color-secondary);
    }

    .chip-primary {
      background: var(--primary-color-lighter);
      background: color-mix(in srgb, var(--primary-color) 12%, var(--surface-elevated, transparent));
      border-color: color-mix(in srgb, var(--primary-color) 28%, var(--border-color, transparent));
      color: color-mix(in srgb, var(--primary-color) 72%, var(--text-color));
    }

    .chip-secondary {
      background: var(--secondary-color-light, var(--secondary-color-lighter));
      color: var(--secondary-color-text, var(--secondary-color));
    }

    .chip-success {
      background: var(--success-color-light);
      color: var(--success-color-text, var(--success-color));
    }

    .chip-warning {
      background: var(--warning-color-light);
      color: var(--warning-color-text, var(--warning-color));
    }

    .chip-error {
      background: var(--danger-color-light);
      color: var(--danger-color-text, var(--danger-color));
    }

    .chip-info {
      background: var(--info-color-light);
      color: var(--info-color-text, var(--info-color));
    }

    .chip-outline {
      background: transparent;
      border-color: var(--border-color);
      color: var(--text-color);
    }

    .chip-interactive {
      cursor: pointer;
    }

    .chip-interactive:hover {
      filter: brightness(0.95);
    }

    .chip-interactive:focus {
      outline: none;
      box-shadow: var(--focus-ring);
    }

    .chip-selected {
      background: var(--primary-color);
      color: var(--gray-0);
    }

    .chip-icon {
      font-size: var(--text-sm);
    }

    .chip-remove {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--space-4);
      height: var(--space-4);
      margin-left: var(--space-0);
      padding: 0;
      background: none;
      border: none;
      border-radius: var(--radius-full);
      font-size: var(--text-sm);
      color: currentColor;
      opacity: 0.7;
      cursor: pointer;
      transition: all 100ms ease;
    }

    .chip-remove:hover {
      opacity: 1;
      background: var(--hover-background-subtle);
    }

    /* Dark mode overrides handled by semantic tokens */

  `]
})
export class ChipComponent {
  @Input() variant: ChipVariant = 'default';
  @Input() size: ChipSize = 'md';
  @Input() icon?: string;
  @Input() removable = false;
  @Input() clickable = false;
  @Input() selected = false;

  @Output() chipClick = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();

  onClick() {
    if (this.clickable) {
      this.chipClick.emit();
    }
  }

  onRemove(event: Event) {
    event.stopPropagation();
    this.remove.emit();
  }
}
