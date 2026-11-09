import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';

import { PanelComponent } from '../../surfaces/panel/panel.component';
import { ButtonComponent } from '../../atoms/button/button.component';

/**
 * FiltersComponent — Organismo genérico para paneles de filtros.
 *
 * Usa ng-content para proyectar campos personalizados.
 * No impone estructura interna: cada app define sus propios filtros.
 *
 * @example
 * ```html
 * <app-filters title="Buscar registros" (filter)="onFilter()" (clear)="onClear()">
 *   <app-floating-input label="Nombre" [(ngModel)]="nombre"></app-floating-input>
 *   <app-select2 [options]="estados" [(ngModel)]="estado" label="Estado"></app-select2>
 *   <app-datepicker [(ngModel)]="fecha" label="Fecha"></app-datepicker>
 * </app-filters>
 * ```
 */
@Component({
  selector: 'app-filters',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PanelComponent, ButtonComponent],
  template: `
    <app-panel [title]="title" icon="🔍" variant="default" padding="md">
      <div class="filter-bar">
        <ng-content></ng-content>
        <div class="filter-actions">
          <app-button variant="primary" (buttonClick)="onFilter()">
            <i icon-left class="fa-solid fa-magnifying-glass"></i>
            {{ filterLabel }}
          </app-button>
          @if (showClear) {
            <app-button variant="ghost" (buttonClick)="onClear()">
              {{ clearLabel }}
            </app-button>
          }
        </div>
      </div>
    </app-panel>
  `,
  styles: [`
    :host { display: block; }

    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--space-4);
      /* Anula min-width interno de componentes para permitir flex shrinking */
      --select2-min-width: 0;
      --fi-min-width: 0;
    }

    /* Cada campo proyectado crece pero no baja de 160px */
    .filter-bar > ::ng-deep * {
      flex: 1 1 160px;
      min-width: 0;
    }

    /* El botón no crece: tamaño fijo */
    .filter-actions {
      flex: 0 0 auto;
      display: flex;
      gap: var(--space-2);
      align-items: center;
    }

    /* Móvil: stack vertical completo */
    @media (max-width: 639px) {
      .filter-bar > ::ng-deep * {
        flex: 1 1 100%;
      }
      .filter-actions {
        width: 100%;
      }
    }
  `]
})
export class FiltersComponent {
  /** Título del panel de filtros */
  @Input() title = 'Filtros';

  /** Texto del botón principal */
  @Input() filterLabel = 'Filtrar';

  /** Texto del botón limpiar */
  @Input() clearLabel = 'Limpiar';

  /** Mostrar botón de limpiar */
  @Input() showClear = false;

  /** Emitido al hacer clic en Filtrar */
  @Output() filter = new EventEmitter<void>();

  /** Emitido al hacer clic en Limpiar */
  @Output() clear = new EventEmitter<void>();

  onFilter() { this.filter.emit(); }
  onClear() { this.clear.emit(); }
}
