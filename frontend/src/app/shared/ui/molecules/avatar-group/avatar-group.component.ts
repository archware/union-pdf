import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { AvatarComponent } from '../../atoms/avatar/avatar.component';

export interface AvatarGroupItem {
  name: string;
  initials?: string;
  photo?: string;
  color?: string;
  status?: 'online' | 'offline' | 'away' | 'busy';
  tooltip?: string;
}

/**
 * AvatarGroupComponent — Stack de avatares superpuestos.
 * Muestra los primeros `max` avatares y un contador "+N" si hay más.
 *
 * @example
 * ```html
 * <app-avatar-group [items]="collaborators" [max]="4" size="sm"></app-avatar-group>
 * ```
 */
@Component({
  selector: 'app-avatar-group',
  standalone: true,
  imports: [AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="avatar-group" [class]="'avatar-group-' + size">
      @for (item of visible; track item.name; let i = $index) {
        <div
          class="avatar-group-item"
          [style.z-index]="visible.length - i"
          [title]="item.tooltip || item.name"
        >
          <app-avatar
            [initials]="item.initials || getInitials(item.name)"
            [src]="item.photo"
            [status]="item.status"
            [size]="size"
            [color]="item.color"
          ></app-avatar>
        </div>
      }
      @if (overflow > 0) {
        <div class="avatar-group-item avatar-group-overflow" [title]="'+' + overflow + ' más'">
          <div class="overflow-badge" [class]="'overflow-' + size">+{{ overflow }}</div>
        </div>
      }
    </div>
  `,
  styles: [`
    .avatar-group {
      display: flex;
      flex-direction: row;
    }

    .avatar-group-item {
      /* margin-inline-start: propiedad lógica — funciona correctamente en LTR y RTL */
      margin-inline-start: calc(-1 * var(--space-2));
      position: relative;
      border-radius: 50%;
      border: var(--space-1) solid var(--surface-background, var(--gray-0));
      transition: transform 150ms ease, z-index 0ms;
    }

    .avatar-group-sm .avatar-group-item { margin-inline-start: calc(-1 * var(--space-2)); }
    .avatar-group-lg .avatar-group-item { margin-inline-start: -0.625rem; } /* -10px */
    .avatar-group-xl .avatar-group-item { margin-inline-start: calc(-1 * var(--space-3)); }

    .avatar-group-item:first-child { margin-left: 0; }

    .avatar-group-item:hover {
      transform: translateY(calc(-1 * var(--space-1)));
      z-index: 99 !important;
    }

    /* Overflow badge */
    .overflow-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--color-neutral-200, #e5e7eb);
      color: var(--text-color-secondary, #6b7280);
      font-weight: 600;
      font-size: var(--text-xs, var(--space-3));
      user-select: none;
    }

    /* Tamaños del badge de overflow en rem (alineados con avatar-size tokens) */
    .overflow-sm  { width: 1.75rem;  height: 1.75rem;  font-size: 0.65rem; }  /* 2var(--space-2) */
    .overflow-md  { width: var(--space-7);  height: var(--space-7);  font-size: var(--space-3); }  /* 3var(--space-2) */
    .overflow-lg  { width: var(--space-8);     height: var(--space-8);     font-size: 0.875rem; } /* 4var(--space-2) */
    .overflow-xl  { width: 4rem;     height: 4rem;     font-size: var(--space-4); }     /* 6var(--space-1) */
  `]
})
export class AvatarGroupComponent {
  /** Lista completa de avatares */
  @Input() items: AvatarGroupItem[] = [];

  /** Máximo de avatares visibles antes de mostrar contador */
  @Input() max = 5;

  /** Tamaño de los avatares */
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  get visible(): AvatarGroupItem[] {
    return this.items.slice(0, this.max);
  }

  get overflow(): number {
    return Math.max(0, this.items.length - this.max);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }
}
