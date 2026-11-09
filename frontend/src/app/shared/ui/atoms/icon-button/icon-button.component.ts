import { Component, input, output, HostBinding } from '@angular/core';
import { normalizeFontAwesomeIconClass } from '../button/button.component';

export type IconButtonVariant =
  | 'default'
  | 'ghost'
  | 'avatar'
  | 'close'
  | 'close-ghost'
  | 'close-soft'
  | 'hanging-close';
export type IconButtonAnimation = 'rotate' | 'grow' | 'none' | 'custom';
export type IconButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-icon-button',
  standalone: true,
  imports: [],
  templateUrl: './icon-button.component.html',
  styleUrl: './icon-button.component.css'
})
export class IconButtonComponent {
  /** Button variant */
  readonly variant = input<IconButtonVariant>('default');

  /** Button size */
  readonly size = input<IconButtonSize>('md');

  /** FontAwesome icon class (when not using projected content) */
  readonly icon = input('');

  @HostBinding('class.is-hanging-close')
  get isHangingClose(): boolean {
    return this.variant() === 'hanging-close';
  }

  get isCloseVariant(): boolean {
    const currentVariant = this.variant();
    return (
      currentVariant === 'close' ||
      currentVariant === 'close-ghost' ||
      currentVariant === 'close-soft' ||
      currentVariant === 'hanging-close'
    );
  }

  /** Hover animation for the icon: defaults to 'none' (no animation) */
  readonly animation = input<IconButtonAnimation>('none');

  /** Tooltip text */
  readonly tooltip = input('');

  /** Native title alias */
  readonly title = input('');

  /** Accessibility label */
  readonly ariaLabel = input('');

  /** Badge count (for notifications) */
  readonly badge = input(0);

  /** Disabled state */
  readonly disabled = input(false);

  /** Click event */
  readonly clicked = output<MouseEvent>();

  get resolvedTitle(): string {
    return this.tooltip() || this.title() || this.ariaLabel() || (this.isCloseVariant ? 'Cerrar' : '');
  }

  get resolvedAriaLabel(): string {
    return this.ariaLabel() || this.tooltip() || this.title() || (this.isCloseVariant ? 'Cerrar' : '');
  }

  get resolvedIcon(): string {
    return normalizeFontAwesomeIconClass(this.icon());
  }
}
