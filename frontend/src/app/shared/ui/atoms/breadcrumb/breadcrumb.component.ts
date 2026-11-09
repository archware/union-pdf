import { Component, Input, ChangeDetectionStrategy } from '@angular/core';


export interface BreadcrumbItem {
  label: string;
  /** Ruta o URL. Si se omite, el ítem se renderiza como texto (último nivel). */
  route?: string;
  icon?: string;
}

/**
 * BreadcrumbComponent — Rastro de navegación jerárquica.
 *
 * @example
 * ```html
 * <app-breadcrumb [items]="[
 *   { label: 'Inicio', route: '/' },
 *   { label: 'Usuarios', route: '/usuarios' },
 *   { label: 'Perfil' }
 * ]"></app-breadcrumb>
 * ```
 */
@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <ol class="breadcrumb-list">
        @for (item of items; track item.label; let last = $last) {
          <li class="breadcrumb-item" [class.breadcrumb-item--active]="last">
            @if (!last && item.route) {
              <a class="breadcrumb-link" [href]="item.route">
                @if (item.icon) {
                  <i [class]="item.icon" class="breadcrumb-icon" aria-hidden="true"></i>
                }
                {{ item.label }}
              </a>
            } @else {
              <span class="breadcrumb-text" [attr.aria-current]="last ? 'page' : null">
                @if (item.icon) {
                  <i [class]="item.icon" class="breadcrumb-icon" aria-hidden="true"></i>
                }
                {{ item.label }}
              </span>
            }
            @if (!last) {
              <span class="breadcrumb-separator" aria-hidden="true">
                {{ separator }}
              </span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: [`
    :host { display: block; }

    .breadcrumb-list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      list-style: none;
      margin: 0;
      padding: 0;
      gap: 0;
    }

    .breadcrumb-item {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-sm);
    }

    .breadcrumb-link {
      color: var(--color-primary);
      text-decoration: none;
      transition: color 150ms ease;
    }
    .breadcrumb-link:hover { color: var(--color-primary-hover, var(--color-primary)); text-decoration: underline; }

    .breadcrumb-text {
      color: var(--text-color-secondary);
    }

    .breadcrumb-item--active .breadcrumb-text {
      color: var(--text-color);
      font-weight: var(--font-weight-body);
    }

    .breadcrumb-separator {
      margin: 0 var(--space-2);
      color: var(--text-color-muted);
      user-select: none;
    }

    .breadcrumb-icon {
      font-size: 0.75em;
      vertical-align: middle;
    }
  `]
})
export class BreadcrumbComponent {
  /** Lista de ítems de navegación */
  @Input() items: BreadcrumbItem[] = [];

  /** Separador entre ítems */
  @Input() separator = '/';
}
