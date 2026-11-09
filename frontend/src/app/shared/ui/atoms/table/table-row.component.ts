import { Component, Input, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';


/**
 * TableRowComponent - Fila de tabla atómica
 * 
 * Usa tokens centralizados --table-* de table-tokens.css
 */
@Component({
  selector: 'tr[app-table-row]',
  standalone: true,
  imports: [],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  host: {
    '[class.selected]': 'selected'
  },
  styles: [`
    tr[app-table-row] {
      border-bottom: 1px solid var(--table-color-border-light);
      transition: 
        background-color var(--table-transition-duration) var(--table-transition-timing),
        box-shadow var(--table-transition-duration) var(--table-transition-timing),
        transform var(--table-transition-duration) var(--table-transition-timing);
      position: relative;
    }

    tr[app-table-row]:last-child {
      border-bottom: none;
    }

    /* Hover elevado */
    tr[app-table-row]:hover {
      background-color: var(--table-color-hover);
      box-shadow: var(--table-row-hover-shadow);
      transform: var(--table-row-hover-transform);
      z-index: 1;
    }

    tr[app-table-row].selected {
      background-color: var(--primary-50, var(--table-color-hover));
    }

    /* Asegurar que las celdas mantengan el efecto visual */
    tr[app-table-row]:hover td {
      position: relative;
    }
  `]
})
export class TableRowComponent {
  /** Indica si la fila está seleccionada */
  @Input() selected = false;
}
