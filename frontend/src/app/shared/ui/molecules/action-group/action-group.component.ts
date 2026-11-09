import {
  Component, Input, Output, EventEmitter, signal, HostListener,
  ElementRef, ChangeDetectionStrategy, inject,
  ViewEncapsulation, OnInit, OnDestroy, Renderer2
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

/**
 * Representa una acción individual en el grupo
 */
export interface ActionItem {
  /** Identificador único de la acción */
  id: string;
  /** Clase de icono FontAwesome, e.g. 'fa-solid fa-eye' */
  icon: string;
  /** Texto del tooltip y label en el menú */
  label: string;
  /** Variante de color */
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'info';
  /** Si la acción está deshabilitada */
  disabled?: boolean;
}

type MenuPosition = 'auto' | 'top' | 'bottom' | 'left' | 'right';

/**
 * ActionGroupComponent - Grupo de acciones con overflow inteligente
 * 
 * Características:
 * - Muestra los primeros N botones directamente (default 3)
 * - Oculta el resto en un menú desplegable al hacer clic en "⋮"
 * - Posicionamiento inteligente que evita solapamiento con bordes de pantalla
 * - Soporte para modo compacto (todas las acciones en menú)
 * 
 * @example
 * ```html
 * <app-action-group
 *   [actions]="[
 *     { id: 'view', icon: 'fa-solid fa-eye', label: 'Ver' },
 *     { id: 'edit', icon: 'fa-solid fa-pen', label: 'Editar', variant: 'primary' },
 *     { id: 'delete', icon: 'fa-solid fa-trash', label: 'Eliminar', variant: 'danger' }
 *   ]"
 *   [maxVisible]="3"
 *   (actionClick)="onAction($event)">
 * </app-action-group>
 * ```
 */
@Component({
  selector: 'app-action-group',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="action-group" [class.compact]="compact" [class]="'action-group--' + size">
      <!-- Visible Actions -->
      @if (!compact) {
        @for (action of visibleActions(); track action.id) {
          <button
            type="button"
            class="action-btn"
            [class]="'action-btn--' + (action.variant || 'default')"
            [class.disabled]="action.disabled"
            [title]="action.label"
            [disabled]="action.disabled"
            (click)="onActionClick(action)"
            (keydown.enter)="onActionClick(action)"
            (keydown.space)="onActionClick(action); $event.preventDefault()"
          >
            <i [class]="action.icon"></i>
          </button>
        }
      }

      <!-- More Button (if there are overflow actions or compact mode) -->
      @if (hasOverflow() || compact) {
        <div class="more-wrapper" [class.open]="isOpen()">
          <button
            type="button"
            class="action-btn action-btn--more"
            [title]="compact ? 'Acciones' : 'Más acciones'"
            (click)="toggleMenu($event)"
            (keydown.enter)="toggleMenu($event)"
            (keydown.space)="toggleMenu($event); $event.preventDefault()"
            [attr.aria-expanded]="isOpen()"
            aria-haspopup="menu"
          >
            <i class="fa-solid fa-ellipsis-vertical"></i>
          </button>
          <!-- Menu se crea dinámicamente en document.body -->
        </div>
      }
    </div>
  `,
  styles: [`
    app-action-group {
      display: inline-flex;
    }

    .action-group {
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }

    /* ============================================ */
    /* ACTION BUTTONS                              */
    /* ============================================ */
    .action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--action-btn-size);
      height: var(--action-btn-size);
      padding: 0;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      font-size: calc(var(--action-btn-size) * 0.55);
      cursor: pointer;
      transition: all 150ms ease;
      color: var(--text-color-secondary);
    }

    .action-btn i {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 65%;
      height: 65%;
      font-size: inherit;
      line-height: 1;
    }

    /* Size variants */
    .action-group--sm { --action-btn-size: 1.75rem; }  /* 2var(--space-2) */
    .action-group--md { --action-btn-size: var(--space-7); }  /* 3var(--space-2) */
    .action-group--lg { --action-btn-size: var(--space-11); }  /* 4var(--space-1) */

    .action-btn:hover:not(:disabled) {
      background: var(--surface-hover);
      color: var(--text-color);
    }

    .action-btn:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }

    .action-btn.disabled,
    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Variants */
    .action-btn--primary { color: var(--primary-color); }
    .action-btn--primary:hover:not(:disabled) { 
      background: var(--primary-color-lighter); 
      color: var(--primary-color);
    }

    .action-btn--secondary { color: var(--secondary-color); }
    .action-btn--secondary:hover:not(:disabled) { 
      background: var(--secondary-color-lighter); 
      color: var(--secondary-color);
    }

    .action-btn--danger { color: var(--danger-color); }
    .action-btn--danger:hover:not(:disabled) { 
      background: var(--danger-color-lighter); 
      color: var(--danger-color);
    }

    .action-btn--warning { color: var(--warning-color); }
    .action-btn--warning:hover:not(:disabled) { 
      background: var(--warning-color-lighter); 
      color: var(--warning-color);
    }

    .action-btn--success { color: var(--success-color); }
    .action-btn--success:hover:not(:disabled) { 
      background: var(--success-color-lighter); 
      color: var(--success-color);
    }

    .action-btn--info { color: var(--info-color); }
    .action-btn--info:hover:not(:disabled) { 
      background: var(--info-color-lighter); 
      color: var(--info-color);
    }

    .action-btn--more {
      color: var(--text-color-muted);
    }

    .more-wrapper.open .action-btn--info { color: var(--info-color); }
    .action-btn--info:hover:not(:disabled) { 
      background: var(--info-color-lighter); 
      color: var(--info-color);
    }

    .action-btn--more {
      background: var(--surface-hover);
      color: var(--primary-color);
    }

    /* ============================================ */
    /* DROPDOWN MENU                               */
    /* ============================================ */
    .more-wrapper {
      position: relative;
    }

    .action-menu {
      position: fixed;
      z-index: 9999;
      min-width: max-content;
      background: var(--surface-background);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-dropdown);
      padding: var(--space-1);
      animation: menuFadeIn 150ms ease;
    }

    /* Portal: menú creado en document.body */
    .action-menu-portal {
      position: fixed;
      z-index: 99999;
      min-width: max-content;
      background: var(--surface-background);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-dropdown);
      padding: var(--space-1);
      animation: menuFadeIn 150ms ease;
    }

    .action-menu-portal.horizontal {
      display: flex;
      flex-direction: row;
      gap: var(--space-1);
    }

    /* Horizontal layout */
    .action-menu.horizontal {
      display: flex;
      flex-direction: row;
      gap: var(--space-1);
    }

    .action-menu.horizontal .menu-item {
      padding: var(--space-2);
    }

    .action-menu.horizontal .menu-item-label {
      display: none;
    }

    @keyframes menuFadeIn {
      from { 
        opacity: 0; 
        transform: translateY(calc(-1 * var(--space-1))); 
      }
      to { 
        opacity: 1; 
        transform: translateY(0); 
      }
    }

    /* ============================================ */
    /* MENU ITEMS                                  */
    /* ============================================ */
    .menu-item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      padding: var(--space-2) var(--space-3);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      font-size: var(--text-sm);
      color: var(--text-color);
      cursor: pointer;
      transition: all 100ms ease;
      text-align: left;
      white-space: nowrap;
    }

    .menu-item:hover:not(:disabled) {
      background: var(--surface-hover);
    }

    .menu-item:focus-visible {
      outline: none;
      background: var(--surface-hover);
    }

    .menu-item.disabled,
    .menu-item:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .menu-item i {
      width: var(--space-4);
      text-align: center;
    }

    /* Menu item variants */
    .menu-item--primary { color: var(--primary-color); }
    .menu-item--primary:hover:not(:disabled) { background: var(--primary-color-lighter); }

    .menu-item--secondary { color: var(--secondary-color); }  
    .menu-item--secondary:hover:not(:disabled) { background: var(--secondary-color-lighter); }

    .menu-item--danger { color: var(--danger-color); }
    .menu-item--danger:hover:not(:disabled) { background: var(--danger-color-lighter); }

    .menu-item--warning { color: var(--warning-color); }
    .menu-item--warning:hover:not(:disabled) { background: var(--warning-color-lighter); }

    .menu-item--success { color: var(--success-color); }
    .menu-item--success:hover:not(:disabled) { background: var(--success-color-lighter); }

    .menu-item-label {
      flex: 1;
    }
  `]
})
export class ActionGroupComponent implements OnInit, OnDestroy {
  /** Lista de acciones a mostrar */
  @Input() actions: ActionItem[] = [];

  /** Número máximo de acciones visibles antes de overflow */
  @Input() maxVisible = 3;

  /** Dirección del menú desplegable: vertical (con labels) u horizontal (solo iconos) */
  @Input() direction: 'vertical' | 'horizontal' = 'vertical';

  /** Posición preferida del menú (auto = calcula automáticamente) */
  @Input() menuPosition: MenuPosition = 'auto';

  /** Modo compacto: oculta todas las acciones en el menú */
  @Input() compact = false;

  /** Tamaño de los botones: sm (2var(--space-2)), md (3var(--space-2)), lg (4var(--space-1)) */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  /** Emitido cuando se hace clic en una acción */
  @Output() actionClick = new EventEmitter<string>();

  /** Estado del menú */
  isOpen = signal(false);


  private readonly elementRef = inject(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly document = inject(DOCUMENT);

  // Elemento del menú en el body
  private menuElement: HTMLElement | null = null;

  // Bound listeners para poder removerlos
  private scrollListener = () => this.onScrollOrResize();
  private resizeListener = () => this.onScrollOrResize();

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', this.scrollListener, true);
      window.addEventListener('resize', this.resizeListener);
    }
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.scrollListener, true);
      window.removeEventListener('resize', this.resizeListener);
    }
    // Limpiar menú si existe
    this.destroyMenu();
  }

  /** Destruir menú del body */
  private destroyMenu(): void {
    if (this.menuElement) {
      this.renderer.removeChild(this.document.body, this.menuElement);
      this.menuElement = null;
    }
  }

  /** Recalcular posición en scroll/resize */
  private onScrollOrResize(): void {
    if (this.isOpen()) {
      this.updatePosition();
    }
  }

  /** Acciones visibles (primeras N) */
  visibleActions(): ActionItem[] {
    if (this.compact) return [];
    return this.actions.slice(0, this.maxVisible);
  }

  /** Acciones en el menú overflow */
  menuActions(): ActionItem[] {
    if (this.compact) return this.actions;
    return this.actions.slice(this.maxVisible);
  }

  /** ¿Hay acciones en overflow? */
  hasOverflow(): boolean {
    return this.actions.length > this.maxVisible;
  }

  /** Toggle del menú */
  toggleMenu(event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    const wasOpen = this.isOpen();

    if (wasOpen) {
      // Cerrar menú
      this.isOpen.set(false);
      this.destroyMenu();
    } else {
      // Abrir menú
      this.isOpen.set(true);
      this.createMenuInBody();
    }
  }

  /** Crear menú en document.body */
  private createMenuInBody(): void {
    const moreBtn = this.elementRef.nativeElement.querySelector('.action-btn--more');
    if (!moreBtn) return;

    // Crear elemento del menú
    this.menuElement = this.renderer.createElement('div');
    this.renderer.addClass(this.menuElement, 'action-menu-portal');
    if (this.direction === 'horizontal') {
      this.renderer.addClass(this.menuElement, 'horizontal');
    }

    // Crear items del menú
    const actions = this.menuActions();
    actions.forEach(action => {
      const btn = this.renderer.createElement('button');
      this.renderer.setAttribute(btn, 'type', 'button');
      this.renderer.addClass(btn, 'menu-item');
      if (action.variant) {
        this.renderer.addClass(btn, `menu-item--${action.variant}`);
      }
      if (action.disabled) {
        this.renderer.addClass(btn, 'disabled');
        this.renderer.setAttribute(btn, 'disabled', 'true');
      }
      this.renderer.setAttribute(btn, 'role', 'menuitem');

      // Icono
      const icon = this.renderer.createElement('i');
      action.icon.split(' ').forEach(cls => this.renderer.addClass(icon, cls));
      this.renderer.appendChild(btn, icon);

      // Label (para vertical o compact)
      if (this.direction === 'vertical' || this.compact) {
        const label = this.renderer.createElement('span');
        this.renderer.addClass(label, 'menu-item-label');
        const text = this.renderer.createText(action.label);
        this.renderer.appendChild(label, text);
        this.renderer.appendChild(btn, label);
      }

      // Event listener
      this.renderer.listen(btn, 'click', (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        if (!action.disabled) {
          this.actionClick.emit(action.id);
          this.isOpen.set(false);
          this.destroyMenu();
        }
      });

      this.renderer.appendChild(this.menuElement, btn);
    });

    // Añadir al body
    this.renderer.appendChild(this.document.body, this.menuElement);

    // Calcular posición
    requestAnimationFrame(() => {
      this.updatePosition();
    });
  }

  /** Click en acción visible */
  onActionClick(action: ActionItem): void {
    if (action.disabled) return;
    this.actionClick.emit(action.id);
  }



  /** Cerrar menú al hacer clic fuera */
  @HostListener('document:mousedown', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Verificar si el click fue fuera del componente Y fuera del menú portal
    const isOutsideComponent = !this.elementRef.nativeElement.contains(target);
    const isOutsideMenu = !this.menuElement || !this.menuElement.contains(target);

    if (isOutsideComponent && isOutsideMenu) {
      this.isOpen.set(false);
      this.destroyMenu();
    }
  }

  /** Cerrar menú con Escape */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isOpen.set(false);
    this.destroyMenu();
  }

  /** Calcular posición óptima del menú (position: fixed) */
  private updatePosition(): void {
    if (!this.menuElement) return;

    const moreBtn = this.elementRef.nativeElement.querySelector('.action-btn--more');
    if (!moreBtn) return;

    const rect = moreBtn.getBoundingClientRect();
    const menuRect = this.menuElement.getBoundingClientRect();
    const menuHeight = menuRect.height || 180;
    const menuWidth = menuRect.width || 160;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.right;

    const preferredPosition = this.menuPosition;
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

    const computeAutoVertical = () => spaceBelow >= menuHeight ? 'bottom' : 'top';
    const computeAutoHorizontal = () => spaceRight >= menuWidth ? 'right' : 'left';

    const positionToUse = preferredPosition === 'auto'
      ? computeAutoVertical()
      : preferredPosition;

    let top: number;
    let left: number;

    switch (positionToUse) {
      case 'top':
        top = rect.top - menuHeight - 4;
        left = rect.left;
        break;
      case 'bottom':
        top = rect.bottom + 4;
        left = rect.left;
        break;
      case 'left':
        top = rect.top + (rect.height - menuHeight) / 2;
        left = rect.left - menuWidth - 4;
        break;
      case 'right':
        top = rect.top + (rect.height - menuHeight) / 2;
        left = rect.right + 4;
        break;
      default: {
        // Fallback: decide vertical first, then horizontal to keep menu visible
        const vertical = computeAutoVertical();
        const horizontal = computeAutoHorizontal();
        top = vertical === 'bottom' ? rect.bottom + 4 : rect.top - menuHeight - 4;
        left = horizontal === 'right' ? rect.right - menuWidth : rect.left;
      }
    }

    // Asegurar que no se salga de la pantalla
    top = clamp(top, 8, window.innerHeight - menuHeight - 8);
    left = clamp(left, 8, window.innerWidth - menuWidth - 8);

    // Aplicar estilos directamente al elemento
    this.renderer.setStyle(this.menuElement, 'top', `${top}px`);
    this.renderer.setStyle(this.menuElement, 'left', `${left}px`);
  }
}


