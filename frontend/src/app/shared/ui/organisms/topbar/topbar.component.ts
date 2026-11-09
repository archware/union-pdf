import { Component, Input, Output, EventEmitter } from '@angular/core';

import { IconButtonComponent } from '../../atoms/icon-button/icon-button.component';
import { UserMenuComponent, UserMenuAction } from '../../molecules/user-menu/user-menu.component';
import { LanguageSwitcherComponent } from '../../atoms/language-switcher/language-switcher.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [IconButtonComponent, UserMenuComponent, LanguageSwitcherComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent {
  /** Page title displayed in the topbar */
  @Input() title = '';

  /** User initials for avatar */
  @Input() userInitials = 'U';

  /** User display name */
  @Input() userName = 'Usuario';

  /** User email */
  @Input() userEmail = 'usuario@email.com';

  /** Number of unread notifications */
  @Input() notificationCount = 0;

  /** Event emitted when sidebar toggle is clicked */
  @Output() toggleSidebar = new EventEmitter<void>();

  /** Event emitted when logout is clicked */
  @Output() logout = new EventEmitter<void>();

  /** Event emitted when any user menu action is clicked */
  @Output() userAction = new EventEmitter<UserMenuAction>();

  onUserAction(action: UserMenuAction): void {
    this.userAction.emit(action);
  }

  onLogout(): void {
    this.logout.emit();
  }
}
