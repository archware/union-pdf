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
      box-sizing: border-box;
      gap: var(--space-1);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-full);
      font-size: var(--text-xs);
      font-weight: var(--font-weight-title);
      line-height: 1.1;
      transition: all 150ms ease;
      border: var(--border-width-thin) solid transparent;
    }

    .chip-sm { padding: var(--space-1) var(--space-2); font-size: var(--text-xs); }
    .chip-md { padding: var(--space-1) var(--space-2); font-size: var(--text-xs); }
    .chip-lg { padding: var(--space-1) var(--space-3); font-size: var(--text-sm); }

    .chip-default {
      background-color: var(--chip-default-bg);
      border-color: var(--chip-default-border);
      color: var(--chip-default-text);
    }

    .chip-primary {
      background-color: var(--chip-primary-bg);
      border-color: var(--chip-primary-border);
      color: var(--chip-primary-text);
    }

    .chip-secondary {
      background-color: var(--chip-secondary-bg);
      border-color: var(--chip-secondary-border);
      color: var(--chip-secondary-text);
    }

    .chip-success {
      background-color: var(--chip-success-bg);
      border-color: var(--chip-success-border);
      color: var(--chip-success-text);
    }

    .chip-warning {
      background-color: var(--chip-warning-bg);
      border-color: var(--chip-warning-border);
      color: var(--chip-warning-text);
    }

    .chip-error {
      background-color: var(--chip-error-bg);
      border-color: var(--chip-error-border);
      color: var(--chip-error-text);
    }

    .chip-info {
      background-color: var(--chip-info-bg);
      border-color: var(--chip-info-border);
      color: var(--chip-info-text);
    }

    .chip-outline {
      background-color: var(--chip-outline-bg);
      border-color: var(--chip-outline-border);
      color: var(--chip-outline-text);
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
      background-color: var(--badge-primary-bg);
      border-color: var(--badge-primary-border);
      color: var(--badge-primary-text);
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
