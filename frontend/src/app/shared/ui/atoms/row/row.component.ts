import { Component, Input } from '@angular/core';


/** Horizontal alignment options */
export type RowAlign = 'left' | 'center' | 'right' | 'stretch';

/** Justify content options */
export type RowJustify = 'start' | 'center' | 'end' | 'between' | 'around';

/** Vertical alignment options */
export type RowVerticalAlign = 'top' | 'center' | 'bottom' | 'stretch' | 'baseline';

/** Layout variant */
export type RowVariant = 'default' | 'form';

/**
 * RowComponent - Unified layout component for grids
 * 
 * Replaces both legacy app-row and app-form-row with a single component.
 * 
 * @example
 * ```html
 * <!-- Default grid -->
 * <app-row columns="1fr 1fr 1fr">...</app-row>
 * 
 * <!-- Form layout (2 columns, form spacing) -->
 * <app-row variant="form">...</app-row>
 * 
 * <!-- Responsive auto-wrap -->
 * <app-row [responsive]="true" minColumnWidth="200px">...</app-row>
 * ```
 */
@Component({
  selector: 'app-row',
  standalone: true,
  imports: [],
  template: `
    <div 
      class="row"
      [class.row--variant-form]="variant === 'form'"
      [class.row--responsive]="responsive"
      [class.row--align-left]="align === 'left'"
      [class.row--align-center]="align === 'center'"
      [class.row--align-right]="align === 'right'"
      [class.row--align-stretch]="align === 'stretch'"
      [class.row--justify-start]="justify === 'start'"
      [class.row--justify-center]="justify === 'center'"
      [class.row--justify-end]="justify === 'end'"
      [class.row--justify-between]="justify === 'between'"
      [class.row--justify-around]="justify === 'around'"
      [class.row--valign-top]="verticalAlign === 'top'"
      [class.row--valign-center]="verticalAlign === 'center'"
      [class.row--valign-bottom]="verticalAlign === 'bottom'"
      [class.row--valign-stretch]="verticalAlign === 'stretch'"
      [class.row--valign-baseline]="verticalAlign === 'baseline'"
      [class.row--wrap]="wrap === 'wrap'"
      [style.grid-template-columns]="computedColumns"
      [style.gap]="computedGap"
    >
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    /* Form variant: add margin-bottom for form spacing */
    :host:has(.row--variant-form) {
      margin-bottom: var(--space-5); /* 2var(--space-1) vertical */
    }

    .row {
      display: grid;
      width: 100%;
      box-sizing: border-box;
      align-items: stretch;
    }

    /* === Form Variant === */
    .row--variant-form {
      align-items: start; /* Align fields to top for validation messages */
    }

    /* === Responsive Mode === */
    .row--responsive {
      /* Handled via computedColumns with auto-fit */
    }

    /* === Wrap Mode (Flexbox) === */
    .row--wrap {
      display: flex;
      flex-wrap: wrap;
    }

    .row--wrap > * {
      flex: 1 1 auto;
    }

    /* === Horizontal Alignment (justify-items) === */
    .row--align-left { justify-items: start; }
    .row--align-center { justify-items: center; }
    .row--align-right { justify-items: end; }
    .row--align-stretch { justify-items: stretch; }

    /* === Justify (justify-content) === */
    .row--justify-start { justify-content: start; }
    .row--justify-center { justify-content: center; }
    .row--justify-end { justify-content: end; }
    .row--justify-between { justify-content: space-between; }
    .row--justify-around { justify-content: space-around; }

    /* === Vertical Alignment (align-items) === */
    .row--valign-top { align-items: start; }
    .row--valign-center { align-items: center; }
    .row--valign-bottom { align-items: end; }
    .row--valign-stretch { align-items: stretch; }
    .row--valign-baseline { align-items: baseline; }

    /* === Individual Column Alignment (utility classes) === */
    ::ng-deep .justify-start { justify-self: start !important; }
    ::ng-deep .justify-center { justify-self: center !important; }
    ::ng-deep .justify-end { justify-self: end !important; }
    ::ng-deep .align-self-start { align-self: start !important; }
    ::ng-deep .align-self-center { align-self: center !important; }
    ::ng-deep .align-self-end { align-self: end !important; }

    /* === Responsive: Stack on mobile === */
    @media (max-width: 640px) {
      .row:not(.row--responsive) {
        grid-template-columns: 1fr !important;
        gap: var(--space-5) !important; /* 2var(--space-1) vertical on mobile */
      }
    }
  `]
})
export class RowComponent {
  /** 
   * CSS Grid template columns (e.g., '1fr 1fr', 'repeat(3, 1fr)')
   * When not specified, form variant uses '1fr 1fr', others use '1fr'
   */
  @Input() columns?: string;

  /** Gap between columns */
  @Input() gap = 'var(--space-7)'; /* 3var(--space-2) default horizontal gap */

  /** Horizontal column content alignment */
  @Input() align: RowAlign = 'stretch';

  /** Vertical alignment of items */
  @Input() verticalAlign: RowVerticalAlign = 'stretch';

  /** Justify content across the row */
  @Input() justify: RowJustify = 'start';

  /** 
   * Layout variant
   * - 'default': Standard grid layout
   * - 'form': Form layout (1fr 1fr, gap var(--space-5), margin-bottom)
   */
  @Input() variant: RowVariant = 'default';

  /** 
   * Enable responsive auto-fit wrapping
   * When true, uses CSS auto-fit to wrap columns automatically
   */
  @Input() responsive = false;

  /** 
   * Minimum column width for responsive mode
   * Only used when responsive=true
   */
  @Input() minColumnWidth = '200px';

  /** 
   * Flex wrap mode (uses flexbox instead of grid)
   * Values: 'nowrap' | 'wrap'
   */
  @Input() wrap: 'nowrap' | 'wrap' = 'nowrap';

  /** Computed grid-template-columns based on variant and responsive settings */
  get computedColumns(): string {
    // Responsive mode: use auto-fit for wrapping
    if (this.responsive) {
      return `repeat(auto-fit, minmax(${this.minColumnWidth}, 1fr))`;
    }

    // If columns was explicitly set, always use it (highest priority)
    if (this.columns !== undefined) {
      return this.columns;
    }

    // Form variant default: 2 equal columns
    if (this.variant === 'form') {
      return '1fr 1fr';
    }

    // Default: single column
    return '1fr';
  }

  /** Computed gap based on variant */
  get computedGap(): string {
    if (this.variant === 'form') {
      return 'var(--space-5) var(--space-7)'; /* 2var(--space-1) vertical, 3var(--space-2) horizontal */
    }
    return this.gap;
  }
}
