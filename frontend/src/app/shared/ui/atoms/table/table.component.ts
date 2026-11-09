import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { ScrollOverlayComponent } from '../../organisms/scroll-overlay/scroll-overlay.component';

export type TableCellOverflow = 'wrap' | 'truncate';
export type TableScrollbarMode = 'overlay' | 'native';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [ScrollOverlayComponent],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-scroll-overlay
      class="atomic-table-container so-block"
      [class.atomic-table-striped]="striped"
      [class.atomic-table-unified-scroll]="unifiedScroll"
      [class.atomic-table-bounded-scroll]="hasBoundedScroll"
      [class.atomic-table-truncate-cells]="cellOverflow === 'truncate'"
      [maxBodyHeight]="maxHeight"
      [minColumnWidth]="40"
      [columnTemplate]="columnTemplate"
      [lockColumnTemplate]="!!columnTemplate"
      [verticalSelector]="unifiedScroll || maxHeight ? null : 'tbody'"
      [nativeScrollbars]="scrollbarMode === 'native'"
      [resetKey]="scrollResetKey"
      [scrollAreaAriaLabel]="scrollViewportLabel"
    >
      <table class="atomic-table">
        <ng-content></ng-content>
      </table>
    </app-scroll-overlay>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .atomic-table-container {
        width: 100%;
        overflow: hidden;
      }

      .atomic-table td:last-child {
        padding-right: var(--space-6);
      }

      .atomic-table {
        width: 100%;
        display: table;
        border-collapse: separate;
        border-spacing: 0;
        text-align: left;
        font-family: var(--table-font-family);
        font-size: var(--table-font-size);
        color: var(--table-color-text);
        table-layout: auto;
      }

      .atomic-table tbody {
        display: table-row-group;
      }

      .atomic-table th,
      .atomic-table td {
        padding: var(--table-cell-padding, var(--space-3) var(--space-4));
        vertical-align: middle;
        border-bottom: 1px solid var(--table-color-border-light, rgba(0, 0, 0, 0.05));
      }

      .so-root.atomic-table-truncate-cells[data-so-table] .atomic-table th,
      .so-root.atomic-table-truncate-cells[data-so-table] .atomic-table td {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .so-root.atomic-table-truncate-cells[data-so-table] .atomic-table td.atomic-table-cell-wrap,
      .so-root.atomic-table-truncate-cells[data-so-table] .atomic-table th.atomic-table-cell-wrap {
        overflow: visible;
        overflow-wrap: anywhere;
        text-overflow: clip;
        white-space: normal;
      }

      .so-root[data-so-table][data-so-sync-columns]
        .atomic-table
        tbody
        td[app-table-cell]:has(> app-chip:only-child) {
        display: flex;
        align-items: center;
      }

      .atomic-table tbody tr {
        background-color: var(--table-color-background);
        transition:
          background-color var(--table-transition-duration, 0.2s)
            var(--table-transition-timing, ease),
          transform var(--table-transition-duration, 0.2s) var(--table-transition-timing, ease),
          box-shadow var(--table-transition-duration, 0.2s) var(--table-transition-timing, ease);
      }

      .atomic-table tbody tr:hover {
        background-color: var(--table-row-hover, rgba(0, 0, 0, 0.02));
        box-shadow: var(
          --table-row-hover-shadow,
          0 var(--space-1) var(--space-3) rgba(0, 0, 0, 0.08)
        );
        transform: var(--table-row-hover-transform, translateY(calc(-1 * var(--space-1))));
        z-index: 1;
        position: relative;
      }

      .atomic-table thead th {
        position: sticky;
        top: 0;
        z-index: 2;
        color: var(--table-header-color);
        font-size: var(--table-font-size-header, var(--space-3));
        font-weight: var(--table-font-weight-header, 600);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        background: var(--table-header-bg);
        border-top: var(--table-header-border-width, var(--space-1))
          var(--table-header-border-style, solid)
          var(--table-header-border-color, var(--table-color-border));
        border-bottom: var(--table-header-border-width, var(--space-1))
          var(--table-header-border-style, solid)
          var(--table-header-border-color, var(--table-color-border));
      }

      .atomic-table thead th:first-child {
        border-left: var(--table-header-border-width, var(--space-1))
          var(--table-header-border-style, solid)
          var(--table-header-border-color, var(--table-color-border));
        border-top-left-radius: var(--table-header-radius, var(--space-2));
        border-bottom-left-radius: var(--table-header-radius, var(--space-2));
      }

      .atomic-table thead th:last-child {
        border-right: var(--table-header-border-width, var(--space-1))
          var(--table-header-border-style, solid)
          var(--table-header-border-color, var(--table-color-border));
        border-top-right-radius: var(--table-header-radius, var(--space-2));
        border-bottom-right-radius: var(--table-header-radius, var(--space-2));
      }

      .atomic-table-striped .atomic-table tbody tr:nth-child(odd) {
        background-color: var(--table-color-stripe);
      }

      .atomic-table-striped .atomic-table tbody tr:nth-child(odd):hover {
        background-color: var(--table-color-hover, var(--table-row-hover));
      }

      /* ============================================
       RESPONSIVE: Cards en móvil (Sin usar !important)
       Usamos selectores de alta especificidad para anular ScrollOverlay
       ============================================ */
      @media screen and (max-width: 768px) {
        .so-root[data-so-table].atomic-table-container,
        .atomic-table-container {
          border: none;
          border-radius: 0;
          overflow: auto;
          max-height: none;
        }

        .so-root[data-so-table].atomic-table-container.atomic-table-unified-scroll,
        .so-root[data-so-table].atomic-table-container.atomic-table-bounded-scroll,
        .so-root[data-so-table].atomic-table-container.atomic-table-unified-scroll .so-scroll-area,
        .so-root[data-so-table].atomic-table-container.atomic-table-bounded-scroll .so-scroll-area {
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: visible !important;
          overscroll-behavior: auto;
        }

        .so-root[data-so-table].atomic-table-container.atomic-table-unified-scroll .atomic-table,
        .so-root[data-so-table].atomic-table-container.atomic-table-bounded-scroll .atomic-table {
          width: 100% !important;
          min-width: 0 !important;
        }

        .so-root[data-so-table] .atomic-table,
        .atomic-table,
        .so-root[data-so-table] .atomic-table > app-table-head,
        .atomic-table > app-table-head,
        .so-root[data-so-table] .atomic-table tbody,
        .atomic-table tbody {
          display: block;
        }

        .so-root[data-so-table][data-so-sync-columns] .atomic-table thead,
        .so-root[data-so-table] .atomic-table thead,
        .atomic-table thead,
        .atomic-table .atomic-thead {
          position: absolute !important;
          width: var(--border-width-thin) !important;
          height: var(--border-width-thin) !important;
          padding: 0 !important;
          margin: calc(-1 * var(--border-width-thin)) !important;
          overflow: hidden !important;
          clip: rect(0 0 0 0) !important;
          clip-path: inset(50%) !important;
          white-space: nowrap !important;
        }

        .so-root[data-so-table][data-so-sync-columns] .atomic-table tbody tr,
        .so-root[data-so-table] .atomic-table tbody tr,
        .atomic-table tbody tr {
          display: flex;
          flex-direction: column;
          width: 100%;
          background: var(--table-color-background);
          border: 1px solid var(--table-color-border);
          border-radius: var(--table-border-radius);
          padding: var(--table-card-padding);
          margin-bottom: var(--table-card-gap);
          box-shadow: var(--table-card-shadow);
        }

        .so-root[data-so-table][data-so-sync-columns] .atomic-table tbody tr:hover,
        .so-root[data-so-table] .atomic-table tbody tr:hover,
        .atomic-table tbody tr:hover {
          transform: none;
          box-shadow: var(--table-card-shadow);
        }

        .so-root[data-so-table] .atomic-table tbody td,
        .atomic-table tbody td {
          display: flex;
          padding: var(--space-2) 0;
          border-bottom: 1px solid var(--table-color-border-light);
        }

        .so-root[data-so-table] .atomic-table tbody td:last-child,
        .atomic-table tbody td:last-child {
          border-bottom: none;
        }

        .so-root[data-so-table] .atomic-table tbody td[data-label]::before,
        .atomic-table tbody td[data-label]::before {
          content: attr(data-label);
          display: block;
          font-weight: var(--table-font-weight-label);
          color: var(--table-color-primary);
          flex: 0 0 120px;
          margin-right: var(--space-3);
        }

        .so-root[data-so-table] .atomic-table tbody td.actions-cell,
        .atomic-table tbody td.actions-cell {
          justify-content: flex-end;
          padding-top: var(--space-3);
          border-top: 1px solid var(--table-color-border);
          border-bottom: none;
        }
      }
    `,
  ],
})
export class TableComponent implements OnInit, OnDestroy {
  @Input() striped = false;
  @Input() maxHeight?: number | string;
  @Input() columnTemplate?: string;
  @Input() unifiedScroll = false;
  @Input() scrollResetKey: unknown;
  @Input() ariaLabel = '';
  @Input() cellOverflow: TableCellOverflow = 'wrap';
  @Input() scrollbarMode: TableScrollbarMode = 'overlay';

  isResponsiveCardLayout = false;

  private readonly changeDetector = inject(ChangeDetectorRef);
  private responsiveMediaQuery?: MediaQueryList;
  private readonly handleResponsiveChange = (event: MediaQueryListEvent): void => {
    this.isResponsiveCardLayout = event.matches;
    this.changeDetector.markForCheck();
  };

  get hasBoundedScroll(): boolean {
    if (typeof this.maxHeight === 'number') {
      return Number.isFinite(this.maxHeight) && this.maxHeight > 0;
    }
    return typeof this.maxHeight === 'string' && this.maxHeight.trim().length > 0;
  }

  get scrollViewportLabel(): string | null {
    const label = this.ariaLabel.trim();
    const ownsScroll = this.unifiedScroll || this.hasBoundedScroll;
    return ownsScroll && !this.isResponsiveCardLayout && label ? label : null;
  }

  ngOnInit(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    this.responsiveMediaQuery = window.matchMedia('(max-width: 768px)');
    this.isResponsiveCardLayout = this.responsiveMediaQuery.matches;
    this.responsiveMediaQuery.addEventListener('change', this.handleResponsiveChange);
  }

  ngOnDestroy(): void {
    this.responsiveMediaQuery?.removeEventListener('change', this.handleResponsiveChange);
  }
}
