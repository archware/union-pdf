import { Component, Input, Output, EventEmitter, signal, HostListener } from '@angular/core';


export interface UserMenuAction {
  id: string;
  label: string;
  icon: string;
  danger?: boolean;
}

import { AvatarComponent } from '../../atoms/avatar/avatar.component';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [AvatarComponent],
  template: `
    <div class="user-menu" [class.open]="isOpen()">
      <!-- Avatar Button -->
      <button type="button" class="user-menu__trigger" (click)="toggle()" (keydown.enter)="toggle()" (keydown.space)="toggle()" [attr.title]="'Menú de usuario'">
        <app-avatar [initials]="initials" [name]="userName" size="md"></app-avatar>
      </button>

      <!-- Dropdown Menu -->
      <div class="user-menu__dropdown">
        <!-- User Info Header -->
        <div class="user-menu__header">
          <app-avatar [initials]="initials" [name]="userName" size="lg"></app-avatar>
          <div class="user-menu__info">
            <span class="user-menu__name">{{ userName }}</span>
            <span class="user-menu__email">{{ userEmail }}</span>
          </div>
        </div>

        <!-- Divider -->
        <div class="user-menu__divider"></div>

        <!-- Menu Items -->
        @for (action of menuActions; track action.id) {
          <button type="button"
            class="user-menu__item"
            [class.user-menu__item--danger]="action.danger"
            (click)="onAction(action)"
            (keydown.enter)="onAction(action)"
            (keydown.space)="onAction(action)">
            <span class="user-menu__item-icon"><i [class]="action.icon"></i></span>
            <span class="user-menu__item-label">{{ action.label }}</span>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      position: relative;
    }

    .user-menu {
      position: relative;
    }

    /* === Trigger Button === */
    .user-menu__trigger {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--control-height);
      height: var(--control-height);
      padding: 0;
      background: transparent;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .user-menu__trigger:hover {
      transform: scale(1.05);
    }

    /* === Dropdown === */
    .user-menu__dropdown {
      position: absolute;
      top: calc(100% + var(--space-2));
      right: 0;
      /* min() evita que el dropdown desborde el viewport en pantallas pequeñas */
      min-width: min(220px, calc(100vw - var(--space-6)));
      max-width: calc(100vw - var(--space-4));
      background: var(--surface-background);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-dropdown);
      opacity: 0;
      visibility: hidden;
      transform: translateY(calc(-1 * var(--space-2)));
      transition: all 200ms ease;
      z-index: 1000;
      overflow: hidden;
    }

    .user-menu.open .user-menu__dropdown {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    /* === Header === */
    .user-menu__header {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-4);
    }

    .user-menu__info {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      min-width: 0;
    }

    .user-menu__name {
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-menu__email {
      font-size: var(--text-xs);
      color: var(--text-color-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* === Divider === */
    .user-menu__divider {
      height: 1px;
      background: var(--border-color);
      margin: 0;
    }

    /* === Menu Items === */
    .user-menu__item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      padding: var(--space-3) var(--space-4);
      background: transparent;
      border: none;
      color: var(--text-color);
      font-size: var(--text-sm);
      cursor: pointer;
      transition: background 0.15s ease;
      text-align: left;
    }

    .user-menu__item:hover {
      background: var(--surface-hover);
    }

    .user-menu__item--danger {
      color: var(--danger-color);
    }

    .user-menu__item--danger:hover {
      background: var(--danger-color-lighter);
    }

    .user-menu__item-icon {
      font-size: var(--text-md);
      width: var(--space-5);
      text-align: center;
    }

    .user-menu__item-label {
      flex: 1;
    }

    /*
     * Dark mode se maneja automáticamente via tokens semánticos.
     * --surface-background, --border-color, --shadow-dropdown, --surface-hover
     * ya tienen valores apropiados para temas oscuros.
     */
  `]
})
export class UserMenuComponent {
  /** User initials for avatar */
  @Input() initials = 'U';

  /** User display name */
  @Input() userName = 'Usuario';

  /** User email */
  @Input() userEmail = 'usuario@email.com';

  /** Menu actions */
  @Input() menuActions: UserMenuAction[] = [
    { id: 'profile', label: 'Mi Perfil', icon: 'fa-solid fa-user' },
    { id: 'settings', label: 'Configuración', icon: 'fa-solid fa-gear' },
    { id: 'password', label: 'Cambiar Contraseña', icon: 'fa-solid fa-key' },
    { id: 'logout', label: 'Cerrar Sesión', icon: 'fa-solid fa-arrow-right-from-bracket', danger: true }
  ];

  /** Action selected event */
  @Output() actionSelected = new EventEmitter<UserMenuAction>();

  /** Logout event (convenience) */
  @Output() logout = new EventEmitter<void>();

  isOpen = signal(false);

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  onAction(action: UserMenuAction): void {
    this.actionSelected.emit(action);
    if (action.id === 'logout') {
      this.logout.emit();
    }
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('app-user-menu')) {
      this.isOpen.set(false);
    }
  }
}
