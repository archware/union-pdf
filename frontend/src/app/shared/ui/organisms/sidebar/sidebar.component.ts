import { Component, Input, Output, EventEmitter, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AvatarComponent } from '../../atoms/avatar/avatar.component';

export interface SidebarMenuItem {
  id?: string;
  label: string;
  icon: string;
  iconColor?: string;
  active?: boolean;
  route?: string;
  badge?: string | number;
}

export interface SidebarUser {
  name: string;
  role: string;
  initials?: string;
  photo?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [AvatarComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  private readonly platformId = inject(PLATFORM_ID);

  /** Menu items to display */
  @Input() menuItems: SidebarMenuItem[] = [];

  /** Current user information */
  @Input() user?: SidebarUser | null;

  /** Check if the sidebar is expanded (visual mode) */
  @Input() collapsed = false;

  /** Logo text */
  @Input() logoText = 'Atomic UI';

  /** Logo icon */
  @Input() logoIcon = 'fa-solid fa-atom';

  /** Event emitted when a menu item is clicked */
  @Output() navigate = new EventEmitter<SidebarMenuItem>();

  focusedIndex = 0;

  onItemClick(item: SidebarMenuItem, index?: number) {
    if (index !== undefined) {
      this.focusedIndex = index;
    }
    this.navigate.emit(item);
  }

  handleKeydown(event: KeyboardEvent) {
    if (!this.menuItems.length) return;

    switch (event.key) {
      case 'ArrowDown':
        this.focusedIndex = (this.focusedIndex + 1) % this.menuItems.length;
        this.focusItem(this.focusedIndex);
        event.preventDefault();
        break;
      case 'ArrowUp':
        this.focusedIndex = (this.focusedIndex - 1 + this.menuItems.length) % this.menuItems.length;
        this.focusItem(this.focusedIndex);
        event.preventDefault();
        break;
      case 'Enter':
      case ' ':
        if (this.focusedIndex >= 0) {
          this.onItemClick(this.menuItems[this.focusedIndex], this.focusedIndex);
          event.preventDefault();
        }
        break;
    }
  }

  private focusItem(index: number) {
    if (!isPlatformBrowser(this.platformId)) return;
    const items = document.querySelectorAll('.sidebar-nav .nav-link');
    (items[index] as HTMLElement)?.focus();
  }
}


