import { Component, Input, Output, EventEmitter, HostBinding, HostListener, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SortDirection = 'asc' | 'desc' | null;

@Component({
  selector: 'th[app-table-header-cell]',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="th-content" [class.sortable]="sortable">
      <ng-content></ng-content>
      @if (sortable) {
        <span class="sort-indicator" [class.active]="sortDirection !== null">
          @if (sortDirection === 'asc') {
            <i class="fa-solid fa-sort-up"></i>
          } @else if (sortDirection === 'desc') {
            <i class="fa-solid fa-sort-down"></i>
          } @else {
            <i class="fa-solid fa-sort"></i>
          }
        </span>
      }
    </div>
  `,
  styles: [`
    th[app-table-header-cell] {
      /* Estilos base heredados de table-head.component.ts */
    }

    th[app-table-header-cell].sortable-cell {
      cursor: pointer;
      user-select: none;
      transition: filter 0.2s ease, background-color 0.2s ease, color 0.2s ease;
      --hover-brightness: 0.96; /* Oscurece 4% en modo claro */
    }

    [data-theme="dark"] th[app-table-header-cell].sortable-cell,
    .theme-dark th[app-table-header-cell].sortable-cell,
    html.dark th[app-table-header-cell].sortable-cell {
      --hover-brightness: 1.2; /* Ilumina 20% en modo oscuro */
    }

    th[app-table-header-cell].sortable-cell:hover {
      filter: brightness(var(--hover-brightness));
    }

    .th-content {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .sort-indicator {
      font-size: 0.85em;
      opacity: 0.3;
      transition: opacity 0.2s ease, transform 0.2s ease, color 0.2s ease;
      color: var(--text-color-muted, #9ca3af);
    }

    .sort-indicator.active {
      opacity: 1;
      color: var(--primary-color, #3b82f6);
    }

    th[app-table-header-cell].sortable-cell:hover .sort-indicator {
      opacity: 0.8;
      transform: scale(1.1);
    }
    
    th[app-table-header-cell].sortable-cell:hover .sort-indicator.active {
      opacity: 1;
    }
  `]
})
export class TableHeaderCellComponent {
  @Input() sortable = false;
  @Input() sortDirection: SortDirection = null;
  @Output() sortChange = new EventEmitter<SortDirection>();

  @HostBinding('class.sortable-cell') get isSortable() {
    return this.sortable;
  }

  @HostListener('click')
  onClick() {
    if (!this.sortable) return;
    
    let newDirection: SortDirection = 'asc';
    if (this.sortDirection === 'asc') {
      newDirection = 'desc';
    } else if (this.sortDirection === 'desc') {
      newDirection = null; // Toggle off or loop back to asc? Usually asc -> desc -> null
    }

    this.sortChange.emit(newDirection);
  }
}
