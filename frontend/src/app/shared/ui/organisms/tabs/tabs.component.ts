import { Component, Input, Output, EventEmitter, signal, ContentChildren, QueryList, AfterContentInit, ElementRef, ViewChild, HostBinding } from '@angular/core';


/**
 * Individual tab content panel.
 * Must be used as child of `app-tabs`.
 */
@Component({
  selector: 'app-tab',
  standalone: true,
  template: `<ng-content></ng-content>`,
  styles: [`:host { display: none; } :host(.active) { display: block; }`]
})
export class TabComponent {
  /** Tab label displayed in the header */
  @Input() label = '';
  /** Emoji icon (optional) */
  @Input() icon?: string;
  /** CSS icon class (e.g., FontAwesome) */
  @Input() iconClass?: string;
  /** Whether this tab is disabled */
  @Input() disabled = false;

  @HostBinding('class.active') active = false;
}

/**
 * Tab container component for organizing content into tabbed sections.
 * 
 * @example
 * ```html
 * <app-tabs (tabChange)="onTabChange($event)">
 *   <app-tab label="General" icon="⚙️">Content 1</app-tab>
 *   <app-tab label="Profile" icon="👤">Content 2</app-tab>
 *   <app-tab label="Disabled" [disabled]="true">Disabled content</app-tab>
 * </app-tabs>
 * ```
 */
@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [],
  template: `
    <div class="tabs-container">
      <div class="tabs-header" #tabsHeader role="tablist" aria-label="Tabs">
        @for (tab of tabs; track tab.label; let i = $index) {
          <button 
            type="button"
            class="tab-button"
            role="tab"
            [id]="'tab-' + i"
            [attr.aria-selected]="activeIndex() === i"
            [attr.aria-controls]="'tabpanel-' + i"
            [attr.tabindex]="activeIndex() === i ? 0 : -1"
            [class.active]="activeIndex() === i"
            [class.disabled]="tab.disabled"
            (click)="!tab.disabled && selectTab(i, $event)"
          >
            @if (tab.iconClass) {
              <i [class]="tab.iconClass" class="tab-icon" aria-hidden="true"></i>
            } @else if (tab.icon) {
              <span class="tab-icon" aria-hidden="true">{{ tab.icon }}</span>
            }
            {{ tab.label }}
          </button>
        }
      </div>
      <div 
        class="tabs-content"
        role="tabpanel"
        [id]="'tabpanel-' + activeIndex()"
        [attr.aria-labelledby]="'tab-' + activeIndex()"
      >
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .tabs-container {
      width: 100%;
    }

    .tabs-header {
      display: flex;
      position: relative;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 0;
      gap: var(--space-2);
    }

    .tab-button {
      flex: 1;
      padding: var(--space-4) var(--space-5);
      
      /* Base Style (Inactive) */
      background: var(--surface-ground);
      border: 1px solid var(--border-color-strong);
      border-bottom: none;
      
      margin-bottom: -1px;
      font-size: var(--text-md);
      font-weight: 500;
      color: var(--text-color-secondary);
      cursor: pointer;
      transition: all 200ms ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      border-radius: var(--radius-md) var(--radius-md) 0 0;
    }

    /* Hover state */
    .tab-button:not(.disabled):not(.active):hover {
      color: var(--primary-color);
      background: var(--hover-background-subtle);
      border-color: var(--primary-color);
    }

    /* Pressed state effects */
    .tab-button:active {
      box-shadow: inset 0 1px 0 color-mix(in srgb, var(--primary-color), transparent 30%), 
                  0 1px var(--space-1) rgba(0, 0, 0, 0.2);
    }

    .tab-button.active {
      color: var(--text-color);
      font-weight: 600;
      background: var(--surface-background);
      
      /* Active: Thick Top Border + Sides matching content border */
      border-top: var(--space-1) solid var(--primary-color);
      border-left: 1px solid var(--border-color);
      border-right: 1px solid var(--border-color);
      border-bottom: 1px solid var(--surface-background);
    }

    .tab-button.disabled {
      cursor: not-allowed;
      background: var(--surface-section);
      border: 1px solid var(--border-color);
      border-bottom: none;
      opacity: 0.7;
      color: var(--text-color-muted);
    }

    .tab-icon {
      font-size: var(--text-lg);
    }

    .tabs-content {
      padding: var(--space-4);
      background: var(--surface-background);
      border-radius: 0 0 var(--radius-md) var(--radius-md);
      border: 1px solid var(--border-color);
      border-top: none;
    }

    /* 
     * Dark mode se maneja automáticamente via tokens semánticos.
     * --surface-ground, --surface-background, --border-color, --primary-color
     * ya tienen valores apropiados para temas oscuros.
     */

    /* RESPONSIVE: Compact scrollable tabs on mobile */
    @media (max-width: 768px) {
      .tabs-header {
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        gap: var(--space-1);
        padding-bottom: var(--space-0);
      }

      .tabs-header::-webkit-scrollbar {
        height: var(--space-1);
      }

      .tabs-header::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: var(--radius-xs);
      }

      .tab-button {
        flex: 0 0 auto;
        min-width: max-content;
        padding: var(--space-2) var(--space-3);
        font-size: var(--text-sm);
        white-space: nowrap;
      }

      .tab-icon {
        font-size: var(--text-md);
      }

      .tabs-content {
        padding: var(--space-3);
      }
    }
  `]
})
export class TabsComponent implements AfterContentInit {
  @ContentChildren(TabComponent) tabComponents!: QueryList<TabComponent>;
  @Input() defaultIndex = 0;
  @Output() tabChange = new EventEmitter<number>();

  activeIndex = signal(0);
  tabs: TabComponent[] = [];

  @ViewChild('tabsHeader', { static: false }) tabsHeader!: ElementRef<HTMLElement>;

  ngAfterContentInit() {
    this.tabs = this.tabComponents.toArray();
    this.activeIndex.set(this.defaultIndex);
    this.updateTabs();
  }

  private updateTabs() {
    this.tabs.forEach((tab, i) => tab.active = i === this.activeIndex());
  }

  selectTab(index: number, event?: MouseEvent) {
    this.activeIndex.set(index);
    this.updateTabs();
    this.tabChange.emit(index);

    // Auto-scroll horizontalmente (sin afectar scroll vertical del padre)
    if (event?.target && this.tabsHeader) {
      const button = event.target as HTMLElement;
      const container = this.tabsHeader.nativeElement;

      // Calcular posición para centrar el botón
      const scrollLeft = button.offsetLeft - (container.clientWidth / 2) + (button.clientWidth / 2);

      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth'
      });
    }
  }
}




