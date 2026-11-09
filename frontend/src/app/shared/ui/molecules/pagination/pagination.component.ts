import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Select2Component } from '../select2/select2.component';


/**
 * Pagination component for navigating through pages of data.
 *
 * @example
 * ```html
 * <app-pagination
 *   [total]="100"
 *   [pageSize]="10"
 *   [page]="currentPage"
 *   (pageChange)="onPageChange($event)">
 * </app-pagination>
 * ```
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [FormsModule, Select2Component],
  template: `
    <div class="pagination-wrapper">
      <div class="pagination-info">
        <span class="info-text">
          Mostrando <strong>{{ firstItem() }}</strong> - <strong>{{ lastItem() }}</strong> de <strong>{{ _total() }}</strong> registros
        </span>
        <div class="page-size-selector">
          <label [for]="'pageSize' + variant">Mostrar:</label>
          <div style="width: 80px;">
            <app-select2 
              [options]="pageSizeOptions()" 
              [ngModel]="_pageSize()" 
              (ngModelChange)="onPageSizeChange($event)"
              [searchable]="false">
            </app-select2>
          </div>
        </div>
      </div>
      <nav class="pagination" [class]="'pagination-' + size + ' pagination-' + variant" aria-label="Paginación">
        @if (variant === 'minimal') {
          <button type="button"
            class="page-btn page-text-btn"
            [disabled]="currentPage() <= 1"
            (click)="goToPage(currentPage() - 1)"
          >
            <i class="fa-solid fa-arrow-left" aria-hidden="true" style="margin-right: var(--space-2)"></i> Anterior
          </button>
          
          <span class="page-minimal-text">
            Página <strong>{{ currentPage() }}</strong> de <strong>{{ totalPages() }}</strong>
          </span>

          <button type="button"
            class="page-btn page-text-btn"
            [disabled]="currentPage() >= totalPages()"
            (click)="goToPage(currentPage() + 1)"
          >
            Siguiente <i class="fa-solid fa-arrow-right" aria-hidden="true" style="margin-left: var(--space-2)"></i>
          </button>
        } @else {
          <button type="button"
            class="page-btn page-prev"
            [disabled]="currentPage() <= 1"
            (click)="goToPage(currentPage() - 1)"
            aria-label="Página anterior"
          >
            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
          </button>

          @for (page of visiblePages(); track page) {
            @if (page === '...') {
              <span class="page-ellipsis" aria-hidden="true">...</span>
            } @else {
              <button type="button"
                class="page-btn page-number"
                [class.active]="page === currentPage()"
                [attr.aria-current]="page === currentPage() ? 'page' : null"
                [attr.aria-label]="'Página ' + page"
                (click)="goToPage(+page)"
              >
                {{ page }}
              </button>
            }
          }

          <button type="button"
            class="page-btn page-next"
            [disabled]="currentPage() >= totalPages()"
            (click)="goToPage(currentPage() + 1)"
            aria-label="Página siguiente"
          >
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
          </button>
        }
      </nav>
    </div>
  `,
  styles: [`
    .pagination-wrapper {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      width: 100%;
    }

    .pagination-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-3);
      padding-bottom: var(--space-2);
      border-bottom: 1px solid var(--border-color);
    }

    .info-text {
      font-size: var(--text-sm);
      color: var(--text-color-secondary);
    }

    .info-text strong {
      color: var(--text-color);
      font-weight: 600;
    }

    .page-size-selector {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .page-size-selector label {
      font-size: var(--text-sm);
      color: var(--text-color-secondary);
    }

    .page-size-select {
      height: var(--control-height-sm);
      padding: 0 var(--space-2);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      background-color: var(--surface-background);
      color: var(--text-color);
      font-size: var(--text-sm);
      cursor: pointer;
      outline: none;
      transition: all 150ms ease;
    }

    .page-size-select:focus,
    .page-size-select:hover {
      border-color: var(--primary-color);
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-1);
    }

    /* En móvil con muchas páginas, el nav hace scroll horizontal */
    @media (max-width: 639px) {
      :host {
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        padding-bottom: var(--space-1); /* Espacio para la barra de scroll */
      }

      .pagination {
        width: max-content; /* Evita que el flex container comprima los botones */
        min-width: 100%;
      }

      .page-btn,
      .page-ellipsis {
        flex-shrink: 0;
      }
    }

    .page-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: var(--control-height-sm);
      height: var(--control-height-sm);
      padding: 0 var(--space-2);
      background: var(--surface-background);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
      font-size: var(--text-sm);
      color: var(--text-color);
      cursor: pointer;
      transition: all 150ms ease;
    }

    .pagination-sm .page-btn {
      min-width: 1.75rem;
      height: 1.75rem;
      font-size: var(--text-xs);
    }

    .pagination-lg .page-btn {
      min-width: 2.5rem;
      height: 2.5rem;
      font-size: var(--text-md);
    }

    .page-btn:hover:not(:disabled):not(.active) {
      background: var(--surface-hover);
      border-color: var(--primary-color);
    }

    .page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .page-btn.active {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: var(--text-color-on-primary);
    }

    .page-ellipsis {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--control-height-sm);
      color: var(--text-color-muted);
      font-size: var(--text-sm);
    }

    /* Minimal Variant */
    .pagination-minimal {
      justify-content: space-between;
      width: 100%;
      gap: var(--space-4);
    }

    .page-text-btn {
      padding: 0 var(--space-4);
      background: transparent;
      border: 1px solid var(--border-color);
      min-width: auto;
    }

    .page-minimal-text {
      font-size: var(--text-sm);
      color: var(--text-color-secondary);
    }

    .page-minimal-text strong {
      color: var(--text-color);
      font-weight: 600;
    }

    /* Rounded Variant */
    .pagination-rounded .page-btn {
      border-radius: var(--radius-full); /* Fully rounded */
      border: none;
      background: transparent;
    }

    .pagination-rounded .page-btn:hover:not(:disabled):not(.active) {
      background: var(--surface-hover);
    }

    .pagination-rounded .page-btn.active {
      background: var(--primary-color);
      color: var(--text-color-on-primary);
      box-shadow: 0 var(--space-1) var(--space-1) rgba(var(--primary-rgb), 0.3);
    }

    /* Cards Variant */
    .pagination-cards .page-btn {
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      box-shadow: 0 1px var(--space-1) rgba(0,0,0,0.05);
      background: var(--surface-background);
      margin: 0 var(--space-1);
    }

    .pagination-cards .page-btn.active {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
      background: var(--primary-50);
      color: var(--primary-700);
    }

    /*
     * Dark mode se maneja automáticamente via tokens semánticos.
     */
  `]
})
export class PaginationComponent {
  @Input() variant: 'standard' | 'minimal' | 'rounded' | 'cards' = 'standard';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  private _maxVisible = 5;
  @Input() set maxVisible(value: number) {
    this._maxVisible = Number.isInteger(value) && value >= 3 ? value : 5;
  }
  get maxVisible(): number {
    return this._maxVisible;
  }
  
  _total = signal(0);
  @Input() set total(val: number) {
    const total = Number.isFinite(val) && val >= 0 ? Math.floor(val) : 0;
    this._total.set(total);
    this.currentPage.update((page) => Math.min(Math.max(page, 1), this.totalPages()));
  }
  
  _pageSize = signal(10);
  @Input() set pageSize(val: number) {
    const size = Number.isInteger(val) && val > 0 ? val : 10;
    this._pageSize.set(size);
    this.currentPage.update((page) => Math.min(Math.max(page, 1), this.totalPages()));
  }

  @Input() set page(value: number) {
    const page = Number.isInteger(value) && value > 0 ? value : 1;
    this.currentPage.set(Math.min(page, this.totalPages()));
  }
  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  currentPage = signal(1);

  totalPages = computed(() => Math.max(1, Math.ceil(this._total() / this._pageSize())));
  firstItem = computed(() =>
    this._total() === 0 ? 0 : ((this.currentPage() - 1) * this._pageSize()) + 1
  );
  lastItem = computed(() => Math.min(this.currentPage() * this._pageSize(), this._total()));

  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const max = this.maxVisible;
    const pages: (number | string)[] = [];

    if (total <= max) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      const half = Math.floor(max / 2);
      let start = Math.max(1, current - half);
      const end = Math.min(total, start + max - 1);

      if (end - start < max - 1) {
        start = Math.max(1, end - max + 1);
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== total) pages.push(i);
      }

      if (end < total) {
        if (end < total - 1) pages.push('...');
        pages.push(total);
      }
    }

    return pages;
  });

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.currentPage.set(page);
      this.pageChange.emit(page);
    }
  }

  pageSizeOptions = computed(() => [
    { value: 10, label: '10' },
    { value: 20, label: '20' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
    { value: 500, label: '500' }
  ]);

  onPageSizeChange(newSize: number | string) {
    const size = typeof newSize === 'string' ? parseInt(newSize, 10) : newSize;
    if (Number.isInteger(size) && size > 0) {
      this.pageSize = size;
      this.pageSizeChange.emit(size);
    }
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
