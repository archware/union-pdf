import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';

import { RouterModule } from '@angular/router';
import { BadgeComponent } from '../../atoms/badge/badge.component';

export interface NavBarItem {
  id?: string;
  label: string;
  icon?: string;
  route?: string;
  active?: boolean;
  badge?: string | number;
  children?: NavBarItem[];
}

export interface NavBarBrand {
  logo?: string;
  name: string;
  route?: string;
}

/**
 * NavBarComponent — Barra de navegación horizontal.
 * Alternativa al Sidebar para aplicaciones con pocas secciones o navegación plana.
 *
 * @example
 * ```html
 * <app-navbar
 *   [brand]="{ name: 'Mi App', logo: '/logo.svg' }"
 *   [items]="menuItems"
 *   [activeId]="activeRoute"
 *   (navigate)="onNavigate($event)"
 * ></app-navbar>
 * ```
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, BadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="navbar"
         [class.navbar--sticky]="sticky"
         [class.navbar--dark]="variant === 'dark'"
         [class.navbar--primary]="variant === 'primary'"
         [class.navbar--transparent]="variant === 'transparent'"
         role="navigation" [attr.aria-label]="ariaLabel">
      <!-- Brand -->
      @if (brand) {
        <div class="navbar__brand">
          @if (brand.logo) {
            <img [src]="brand.logo" [alt]="brand.name" class="navbar__logo" />
          }
          <span class="navbar__brand-name">{{ brand.name }}</span>
        </div>
      }

      <!-- Nav items (desktop) -->
      <ul class="navbar__nav" role="list">
        @for (item of items; track item.id ?? item.label) {
          <li class="navbar__item" role="listitem">
            <button
              type="button"
              class="navbar__link"
              [class.navbar__link--active]="item.active || activeId === (item.id ?? item.label)"
              (click)="onItemClick(item)"
              [attr.aria-current]="(item.active || activeId === (item.id ?? item.label)) ? 'page' : null"
            >
              @if (item.icon) {
                <i [class]="item.icon" class="navbar__icon" aria-hidden="true"></i>
              }
              <span>{{ item.label }}</span>
              @if (item.badge) {
                <app-badge [count]="toBadgeCount(item.badge)" variant="danger" size="sm"></app-badge>
              }
            </button>
          </li>
        }
      </ul>

      <!-- Right slot -->
      <div class="navbar__actions">
        <ng-content select="[slot=actions]"></ng-content>
      </div>

      <!-- Mobile toggle -->
      <button
        type="button"
        class="navbar__mobile-toggle"
        [attr.aria-expanded]="mobileOpen"
        aria-label="Abrir menú"
        (click)="mobileOpen = !mobileOpen"
      >
        <i class="fa-solid" [class.fa-bars]="!mobileOpen" [class.fa-xmark]="mobileOpen"></i>
      </button>
    </nav>

    <!-- Mobile menu -->
    @if (mobileOpen) {
      <div class="navbar__mobile-menu">
        <ul role="list">
          @for (item of items; track item.id ?? item.label) {
            <li>
              <button
                type="button"
                class="navbar__mobile-link"
                [class.navbar__mobile-link--active]="item.active || activeId === (item.id ?? item.label)"
                (click)="onItemClick(item); mobileOpen = false"
              >
                @if (item.icon) {
                  <i [class]="item.icon" aria-hidden="true"></i>
                }
                {{ item.label }}
                @if (item.badge) {
                  <app-badge [count]="toBadgeCount(item.badge)" variant="danger" size="sm"></app-badge>
                }
              </button>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    /* ======= NAVBAR ======= */
    .navbar {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      height: 60px;
      padding: 0 var(--space-6);
      background: var(--surface-background);
      border-bottom: 1px solid var(--border-color);
      position: relative;
      z-index: 100;
    }

    .navbar--sticky { position: sticky; top: 0; }

    .navbar--dark {
      background: var(--surface-dark, #1f2937);
      border-color: transparent;
    }
    .navbar--dark .navbar__brand-name,
    .navbar--dark .navbar__link { color: rgba(255,255,255,.9); }
    .navbar--dark .navbar__link:hover { background: var(--hover-background-subtle); color: var(--gray-0); }
    .navbar--dark .navbar__link--active { background: var(--hover-background-subtle); color: var(--gray-0); }
    .navbar--dark .navbar__mobile-toggle { color: rgba(255,255,255,.9); }

    .navbar--primary {
      background: var(--primary-color);
      border-color: transparent;
    }
    .navbar--primary .navbar__brand-name,
    .navbar--primary .navbar__link { color: rgba(255,255,255,.9); }
    .navbar--primary .navbar__link:hover { background: var(--hover-background-subtle); color: var(--gray-0); }
    .navbar--primary .navbar__link--active { background: var(--button-primary-bg-hover); color: var(--gray-0); }
    .navbar--primary .navbar__mobile-toggle { color: rgba(255,255,255,.9); }

    .navbar--transparent {
      background: transparent;
      border-color: transparent;
    }

    /* Brand */
    .navbar__brand {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      text-decoration: none;
      flex-shrink: 0;
    }
    .navbar__logo { height: 28px; width: auto; }
    .navbar__brand-name {
      font-size: var(--text-base);
      font-weight: var(--font-semibold, 600);
      color: var(--text-color);
      white-space: nowrap;
    }

    /* Nav list */
    .navbar__nav {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      list-style: none;
      margin: 0;
      padding: 0;
      flex: 1;
    }

    .navbar__link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border: none;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--text-color-secondary);
      font-size: var(--text-sm);
      font-weight: var(--font-medium, 500);
      cursor: pointer;
      white-space: nowrap;
      transition: background 150ms ease, color 150ms ease;
      position: relative;
    }
    .navbar__link:hover {
      background: var(--surface-hover, rgba(0,0,0,.05));
      color: var(--text-color);
    }
    .navbar__link--active {
      background: var(--primary-color-light, rgba(59,130,246,.1));
      color: var(--primary-color);
    }

    .navbar__icon { font-size: var(--text-sm); }

    /* Actions */
    .navbar__actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-left: auto;
    }

    /* Mobile toggle */
    .navbar__mobile-toggle {
      display: none;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--text-color);
      cursor: pointer;
      font-size: var(--text-lg);
      margin-left: auto;
    }

    /* Mobile menu */
    .navbar__mobile-menu {
      display: none;
      padding: var(--space-2) var(--space-4) var(--space-4);
      background: var(--surface-background);
      border-bottom: 1px solid var(--border-color);
    }
    .navbar__mobile-menu ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-1); }

    .navbar__mobile-link {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      padding: var(--space-2) var(--space-3);
      border: none;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--text-color-secondary);
      font-size: var(--text-sm);
      text-align: left;
      cursor: pointer;
      transition: background 150ms ease;
    }
    .navbar__mobile-link:hover,
    .navbar__mobile-link--active {
      background: var(--primary-color-light, rgba(59,130,246,.1));
      color: var(--primary-color);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .navbar__nav { display: none; }
      .navbar__actions { display: none; }
      .navbar__mobile-toggle { display: flex; }
      .navbar__mobile-menu { display: block; }
    }
  `],
})
export class NavBarComponent {
  @Input() brand?: NavBarBrand;
  @Input() items: NavBarItem[] = [];
  @Input() activeId = '';
  @Input() sticky = false;
  @Input() variant: 'light' | 'dark' | 'primary' | 'transparent' = 'light';
  @Input() ariaLabel = 'Navegación principal';

  @Output() navigate = new EventEmitter<NavBarItem>();

  protected mobileOpen = false;

  onItemClick(item: NavBarItem): void {
    this.navigate.emit(item);
  }

  protected toBadgeCount(value?: string | number): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
}
