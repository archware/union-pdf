import { Component, Input, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common'; // Important for NgClass

/** Avatar size options */
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Avatar online status indicator */
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';

/** Avatar color variants (for icon or background) */
export type AvatarVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="avatar"
      [ngClass]="['avatar-' + size, 'avatar-' + variant, rounded ? 'avatar-rounded' : '']"
      [style.background-color]="color ?? (!src && !icon && variant === 'default' ? colorFromName() : null)"
    >
      @if (src && !imageFailed()) {
        <img [src]="src" [alt]="name" (error)="onImageError()">
      } @else if (icon) {
        <i [class]="icon"></i>
      } @else if (initials || name) {
        <span class="avatar-initials">{{ computedInitials() }}</span>
      } @else {
        <span class="avatar-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </span>
      }
      @if (status) {
        <span class="avatar-status" [class]="'status-' + status" [attr.aria-label]="status"></span>
      }
    </div>
  `,
  styles: [`
    .avatar {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--surface-elevated);
      color: var(--text-color);
      overflow: hidden;
      flex-shrink: 0;
      aspect-ratio: 1;
    }

    .avatar-rounded {
      border-radius: var(--radius-md);
    }

    /* Variants */
    .avatar-primary { background-color: var(--primary-color-lighter); color: var(--primary-color); }
    .avatar-secondary { background-color: var(--secondary-color-lighter); color: var(--secondary-color); }
    .avatar-success { background-color: var(--success-color-lighter); color: var(--success-color); }
    .avatar-warning { background-color: var(--warning-color-lighter); color: var(--warning-color); }
    .avatar-danger { background-color: var(--danger-color-lighter); color: var(--danger-color); }
    .avatar-info { background-color: var(--info-color-lighter); color: var(--info-color); }

    .avatar-xs { width: var(--avatar-size-xs, var(--space-5)); height: var(--avatar-size-xs, var(--space-5)); font-size: var(--text-xs); }
    .avatar-sm { width: var(--avatar-size-sm, var(--space-6)); height: var(--avatar-size-sm, var(--space-6)); font-size: var(--text-xs); }
    .avatar-md { width: var(--avatar-size-md, 2.5rem); height: var(--avatar-size-md, 2.5rem); font-size: var(--text-sm); }
    .avatar-lg { width: var(--avatar-size-lg, var(--space-8)); height: var(--avatar-size-lg, var(--space-8)); font-size: var(--text-lg); }
    .avatar-xl { width: var(--avatar-size-xl, 4rem); height: var(--avatar-size-xl, 4rem); font-size: var(--text-xl); }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar i {
      font-size: 1.2em;
    }

    .avatar-initials {
      font-weight: 600;
      text-transform: uppercase;
      color: white;
    }

    /* Ensure initials in colored variants contrast well (usually dark on light bg or vice versa) */
    .avatar:not(.avatar-default) .avatar-initials {
       color: currentColor;
    }

    .avatar-placeholder {
      width: 60%;
      height: 60%;
      color: var(--text-color-muted);
    }

    .avatar-placeholder svg {
      width: 100%;
      height: 100%;
    }

    .avatar-status {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 25%;
      height: 25%;
      min-width: var(--space-2);
      min-height: var(--space-2);
      border-radius: var(--radius-full);
      border: var(--space-1) solid var(--surface-background);
    }

    .status-online { background: var(--success-color); }
    .status-offline { background: var(--text-color-secondary); }
    .status-busy { background: var(--danger-color); }
    .status-away { background: var(--warning-color); }

    /* Dark mode */
    :host-context(html.dark) .avatar-default,
    :host-context([data-theme="dark"]) .avatar-default {
      background: var(--surface-section);
    }

    :host-context(html.dark) .avatar-status,
    :host-context([data-theme="dark"]) .avatar-status {
      border-color: var(--surface-section);
    }
  `]
})
export class AvatarComponent {
  @Input() src?: string;
  @Input() name = '';
  @Input() initials?: string;
  @Input() color?: string;
  @Input() size: AvatarSize = 'md';
  @Input() rounded = false;
  @Input() status?: AvatarStatus;
  @Input() icon?: string; // New: Icon class support
  @Input() variant: AvatarVariant = 'default'; // New: Color variant

  imageFailed = signal(false);

  // Memoized computed values
  computedInitials = computed(() => {
    if (this.initials) return this.initials.slice(0, 2);
    if (!this.name) return '';
    return this.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  });

  private readonly colors = [
    'var(--purple-600)',
    'var(--sky-500)',
    'var(--green-500)',
    'var(--yellow-500)',
    'var(--blue-500)',
    'var(--pink-500)',
    'var(--purple-500)',
    'var(--teal-500)'
  ];

  colorFromName = computed(() => {
    if (!this.name) return 'var(--gray-500)';
    let hash = 0;
    for (let i = 0; i < this.name.length; i++) {
      hash = this.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return this.colors[Math.abs(hash) % this.colors.length];
  });

  onImageError() {
    this.imageFailed.set(true);
  }
}
