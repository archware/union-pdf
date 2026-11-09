import { Component, Input, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';


/**
 * TableCellComponent - Celda de tabla atómica
 *
 * Usa tokens centralizados --table-* de table-tokens.css
 *
 * @example
 * ```html
 * <td app-table-cell>Contenido</td>
 * <td app-table-cell align="right">Alineado derecha</td>
 * <td app-table-cell [dataLabel]="'Nombre'">Juan</td>
 * ```
 */
@Component({
  selector: '[app-table-cell]',
  standalone: true,
  imports: [],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  host: {
    '[class.align-left]': 'align === "left"',
    '[class.align-center]': 'align === "center"',
    '[class.align-right]': 'align === "right"',
    '[class.atomic-table-cell-wrap]': 'wrap',
    '[attr.data-label]': 'dataLabel'
  },
  styles: [`
    td[app-table-cell] {
      /* Usando tokens --table-* */
      padding: var(--table-cell-padding);
      vertical-align: middle;
      color: var(--table-color-text);
      font-size: var(--table-font-size);
    }

    th[app-table-header-cell] {
      text-align: left;
      font-weight: var(--table-font-weight-header);
    }

    /* Clases de alineación */
    td[app-table-cell].align-center,
    th[app-table-header-cell].align-center,
    .text-center {
      text-align: center;
    }

    td[app-table-cell].align-right,
    th[app-table-header-cell].align-right,
    .text-right {
      text-align: right;
    }

    td[app-table-cell].align-left,
    th[app-table-header-cell].align-left,
    .text-left {
      text-align: left;
    }
  `]
})
export class TableCellComponent {
  /** Alineación del contenido */
  @Input() align: 'left' | 'center' | 'right' = 'left';

  /** Label para vista mobile (cards) */
  @Input() dataLabel?: string;

  /** Permite envolver esta celda cuando la tabla usa truncado global. */
  @Input() wrap = false;
}
