import { Component, Input, Output, EventEmitter } from '@angular/core';

import { ScrollOverlayComponent } from '../../organisms/scroll-overlay/scroll-overlay.component';
import { FooterComponent } from '../../organisms/footer/footer.component';

@Component({
  selector: 'app-layout-shell',
  standalone: true,
  imports: [ScrollOverlayComponent, FooterComponent],
  templateUrl: './layout-shell.component.html',
  styleUrl: './layout-shell.component.css'
})
export class LayoutShellComponent {
  /** Whether the sidebar is visible */
  @Input() sidebarVisible = true;

  /** Sidebar width (default: 260px). Supports any CSS value: '260px', '25%', 'clamp(200px, 20%, 300px)' */
  @Input() sidebarWidth = '260px';

  /** Event emitted when sidebar backdrop is clicked */
  @Output() closeSidebar = new EventEmitter<void>();

  onOverlayClick() {
    this.closeSidebar.emit();
  }
}
