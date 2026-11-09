import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';

export type ContextMenuAction = 'cut' | 'copy' | 'paste' | 'select-all';
export type ContextMenuFailureReason =
  'clipboard-unavailable' | 'clipboard-denied' | 'target-changed' | 'operation-failed';

export interface ContextMenuActionError {
  action: ContextMenuAction;
  reason: ContextMenuFailureReason;
}

class ContextMenuOperationError extends Error {
  constructor(readonly reason: ContextMenuFailureReason) {
    super(reason);
  }
}

interface ContextMenuItem {
  action: ContextMenuAction;
  label: string;
  icon: string;
  shortcut: string;
}

interface InputSelectionSnapshot {
  kind: 'input';
  start: number;
  end: number;
  direction: 'forward' | 'backward' | 'none';
  selectionSupported: boolean;
  textLength: number;
  revision: number;
}

interface EditableSelectionSnapshot {
  kind: 'editable';
  range: Range | null;
  textLength: number;
  revision: number;
}

type TextControl = HTMLInputElement | HTMLTextAreaElement | HTMLElement;
type SelectionSnapshot = InputSelectionSnapshot | EditableSelectionSnapshot;

interface TargetAriaSnapshot {
  controls: string | null;
  expanded: string | null;
  haspopup: string | null;
  activeDescendant: string | null;
}

const TEXT_INPUT_TYPES = new Set(['password', 'search', 'tel', 'text', 'url']);
const CONTEXT_MENU_POLICY_ATTRIBUTE = 'data-context-menu-policy';
const TEXT_EDIT_POLICY = 'text-edit';
const NATIVE_POLICY = 'native';
const VIEWPORT_PADDING = 8;
let nextContextMenuId = 0;

/**
 * Menú contextual accesible para controles de texto.
 *
 * El componente se monta una sola vez como sibling al final de la aplicación
 * y conserva el menú nativo fuera de inputs, textareas y regiones editables.
 * Las operaciones se mantienen en las APIs locales de edición y portapapeles
 * del navegador. Ningún contenido se transmite a servicios o al backend.
 *
 * @example
 * ```html
 * <app-context-menu />
 * ```
 */
@Component({
  selector: 'app-context-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div
        #menu
        [id]="menuId"
        class="context-menu"
        role="menu"
        aria-label="Opciones de edición"
        aria-orientation="vertical"
        tabindex="-1"
        [style.left.px]="position().left"
        [style.top.px]="position().top"
        (contextmenu)="suppressNestedContextMenu($event)"
      >
        @for (item of menuItems; track item.action) {
          <button
            type="button"
            class="context-menu__item"
            [class.context-menu__item--active]="activeAction() === item.action"
            [id]="itemId(item.action)"
            role="menuitem"
            tabindex="-1"
            [disabled]="isActionDisabled(item.action)"
            [attr.aria-disabled]="isActionDisabled(item.action)"
            [attr.aria-keyshortcuts]="item.shortcut"
            (mouseenter)="setActiveAction(item.action)"
            (pointerdown)="preserveTargetFocus($event)"
            (click)="executeAction(item.action)"
          >
            <i class="context-menu__icon" [class]="item.icon" aria-hidden="true"></i>
            <span class="context-menu__label">{{ item.label }}</span>
            <span class="context-menu__shortcut" aria-hidden="true">{{ item.shortcut }}</span>
          </button>
        }
      </div>
    }

    <span class="context-menu__feedback" role="status" aria-live="polite">
      {{ feedback() }}
    </span>
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .context-menu {
        position: fixed;
        z-index: 100000;
        display: flex;
        flex-direction: column;
        min-width: calc(var(--space-10) + var(--space-10) + var(--space-10));
        max-width: calc(100vw - var(--space-4));
        max-height: calc(100vh - var(--space-4));
        padding: var(--space-1);
        overflow: auto;
        color: var(--text-color);
        background: var(--dropdown-bg);
        border: var(--border-width-thin) solid var(--dropdown-border);
        border-radius: var(--radius-md);
        box-shadow: var(--dropdown-shadow);
      }

      .context-menu__item {
        display: grid;
        grid-template-columns: var(--space-5) minmax(0, 1fr) auto;
        align-items: center;
        gap: var(--space-2);
        width: 100%;
        min-height: var(--control-height-sm);
        padding: var(--space-2) var(--space-3);
        color: var(--text-color);
        font: inherit;
        font-size: var(--text-sm);
        text-align: left;
        white-space: nowrap;
        background: transparent;
        border: 0;
        border-radius: var(--radius-sm);
        cursor: pointer;
      }

      .context-menu__item:hover:not(:disabled),
      .context-menu__item:focus-visible,
      .context-menu__item--active:not(:disabled) {
        color: var(--text-color);
        background: var(--dropdown-item-hover);
        outline: none;
      }

      .context-menu__item:focus-visible {
        box-shadow: var(--focus-ring);
      }

      .context-menu__item:disabled {
        color: var(--input-disabled-text);
        cursor: not-allowed;
      }

      .context-menu__icon {
        width: var(--space-5);
        color: currentColor;
        text-align: center;
      }

      .context-menu__label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .context-menu__shortcut {
        margin-left: var(--space-3);
        color: var(--text-color-muted);
        font-size: var(--text-xs);
      }

      .context-menu__feedback {
        position: absolute;
        inline-size: var(--border-width-thin);
        block-size: var(--border-width-thin);
        padding: 0;
        margin: calc(-1 * var(--border-width-thin));
        overflow: hidden;
        white-space: nowrap;
        border: 0;
        clip-path: inset(50%);
      }
    `,
  ],
})
export class ContextMenuComponent implements OnChanges, OnInit, OnDestroy {
  private static readonly documentInstances = new WeakMap<Document, ContextMenuComponent[]>();

  /** Desactiva la sustitución del menú nativo. */
  @Input() disabled = false;

  /** Permite bloquear acciones concretas por reglas del consumidor. */
  @Input() disabledActions: readonly ContextMenuAction[] = [];

  /** Se emite después de completar una acción. */
  @Output() readonly actionSelected = new EventEmitter<ContextMenuAction>();

  /** Se emite sin incluir el contenido del portapapeles cuando una acción falla. */
  @Output() readonly actionError = new EventEmitter<ContextMenuActionError>();

  @ViewChild('menu') private menuRef?: ElementRef<HTMLElement>;

  readonly isOpen = signal(false);
  readonly position = signal({ left: VIEWPORT_PADDING, top: VIEWPORT_PADDING });
  readonly activeAction = signal<ContextMenuAction | null>(null);
  readonly feedback = signal('');
  readonly menuId = `context-menu-${nextContextMenuId++}`;

  readonly menuItems: readonly ContextMenuItem[] = [
    {
      action: 'cut',
      label: 'Cortar',
      icon: 'fa-solid fa-scissors',
      shortcut: 'Control+X',
    },
    {
      action: 'copy',
      label: 'Copiar',
      icon: 'fa-regular fa-copy',
      shortcut: 'Control+C',
    },
    {
      action: 'paste',
      label: 'Pegar',
      icon: 'fa-solid fa-paste',
      shortcut: 'Control+V',
    },
    {
      action: 'select-all',
      label: 'Seleccionar todo',
      icon: 'fa-solid fa-i-cursor',
      shortcut: 'Control+A',
    },
  ];

  private readonly document = inject(DOCUMENT);
  private target: TextControl | null = null;
  private selection: SelectionSnapshot | null = null;
  private targetAria: TargetAriaSnapshot | null = null;
  private requestedPosition = { left: VIEWPORT_PADDING, top: VIEWPORT_PADDING };
  private generation = 0;
  private pendingOperationGeneration: number | null = null;
  private layoutFrame: number | null = null;
  private readonly controlRevisions = new WeakMap<TextControl, number>();
  private registered = false;
  private readonly capturedScrollListener = (event: Event) => {
    const node = event.target;
    if (node instanceof Node && this.menuRef?.nativeElement.contains(node)) {
      return;
    }
    if (this.isOpen()) {
      this.closeMenu();
    }
  };
  private readonly visualViewportResizeListener = () => {
    if (this.isOpen()) {
      this.repositionMenu();
    }
  };
  private readonly capturedContextMenuListener = (event: MouseEvent) => this.onContextMenu(event);
  private readonly capturedKeydownListener = (event: KeyboardEvent) => this.onHostKeydown(event);
  private readonly capturedClipboardListener = (event: ClipboardEvent) =>
    this.onProtectedClipboardEvent(event);
  private readonly capturedBeforeInputListener = (event: InputEvent) =>
    this.onProtectedBeforeInput(event);
  private readonly capturedDragStartListener = (event: DragEvent) =>
    this.onProtectedDragStart(event);
  private readonly capturedPointerDownListener = (event: PointerEvent) =>
    this.onDocumentPointerDown(event);
  private readonly capturedInputListener = (event: Event) => this.onControlInput(event);
  private readonly capturedFocusInListener = (event: FocusEvent) => this.onDocumentFocusIn(event);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disabled'] && this.disabled && this.isOpen()) {
      this.closeMenu();
      return;
    }
    if (!changes['disabledActions'] || !this.isOpen()) {
      return;
    }
    const current = this.activeAction();
    const next =
      current && !this.isActionDisabled(current) ? current : (this.navigationActions()[0] ?? null);
    this.activeAction.set(next);
    if (!this.target) {
      return;
    }
    if (next) {
      this.target.setAttribute('aria-activedescendant', this.itemId(next));
    } else {
      this.target.removeAttribute('aria-activedescendant');
    }
  }

  ngOnInit(): void {
    const instances = ContextMenuComponent.documentInstances.get(this.document) ?? [];
    instances.push(this);
    ContextMenuComponent.documentInstances.set(this.document, instances);
    this.registered = true;
    this.document.addEventListener('scroll', this.capturedScrollListener, true);
    this.document.addEventListener('contextmenu', this.capturedContextMenuListener, true);
    this.document.addEventListener('keydown', this.capturedKeydownListener, true);
    this.document.addEventListener('copy', this.capturedClipboardListener, true);
    this.document.addEventListener('cut', this.capturedClipboardListener, true);
    this.document.addEventListener('beforeinput', this.capturedBeforeInputListener, true);
    this.document.addEventListener('dragstart', this.capturedDragStartListener, true);
    this.document.addEventListener('pointerdown', this.capturedPointerDownListener, true);
    this.document.addEventListener('input', this.capturedInputListener, true);
    this.document.addEventListener('focusin', this.capturedFocusInListener, true);
    const visualViewport = this.document.defaultView?.visualViewport;
    visualViewport?.addEventListener('scroll', this.capturedScrollListener);
    visualViewport?.addEventListener('resize', this.visualViewportResizeListener);
  }

  ngOnDestroy(): void {
    if (this.registered) {
      this.document.removeEventListener('scroll', this.capturedScrollListener, true);
      this.document.removeEventListener('contextmenu', this.capturedContextMenuListener, true);
      this.document.removeEventListener('keydown', this.capturedKeydownListener, true);
      this.document.removeEventListener('copy', this.capturedClipboardListener, true);
      this.document.removeEventListener('cut', this.capturedClipboardListener, true);
      this.document.removeEventListener('beforeinput', this.capturedBeforeInputListener, true);
      this.document.removeEventListener('dragstart', this.capturedDragStartListener, true);
      this.document.removeEventListener('pointerdown', this.capturedPointerDownListener, true);
      this.document.removeEventListener('input', this.capturedInputListener, true);
      this.document.removeEventListener('focusin', this.capturedFocusInListener, true);
      const visualViewport = this.document.defaultView?.visualViewport;
      visualViewport?.removeEventListener('scroll', this.capturedScrollListener);
      visualViewport?.removeEventListener('resize', this.visualViewportResizeListener);
      const instances = ContextMenuComponent.documentInstances.get(this.document) ?? [];
      const remaining = instances.filter((instance) => instance !== this);
      if (remaining.length === 0) {
        ContextMenuComponent.documentInstances.delete(this.document);
      } else {
        ContextMenuComponent.documentInstances.set(this.document, remaining);
      }
      this.registered = false;
    }
    this.closeMenu();
  }

  itemId(action: ContextMenuAction): string {
    return `${this.menuId}-${action}`;
  }

  setActiveAction(action: ContextMenuAction): void {
    if (this.menuItems.some((item) => item.action === action) && !this.isActionDisabled(action)) {
      this.activeAction.set(action);
      this.target?.setAttribute('aria-activedescendant', this.itemId(action));
    }
  }

  preserveTargetFocus(event: PointerEvent): void {
    event.preventDefault();
  }

  onContextMenu(event: MouseEvent): void {
    if (!this.isDocumentController()) {
      return;
    }
    if (this.menuRef?.nativeElement.contains(event.target as Node)) {
      event.preventDefault();
      return;
    }

    if (this.disabled) {
      this.closeMenu();
      return;
    }

    const target = this.resolveTextControl(event.target);
    if (!target) {
      this.closeMenu();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const point = this.resolveOpeningPoint(event.clientX, event.clientY, target);
    this.openMenu(target, point.left, point.top);
  }

  onHostKeydown(event: KeyboardEvent): void {
    if (!this.isDocumentController()) {
      return;
    }
    const clipboardKey = event.key.toLowerCase();
    if (
      this.isProtectedContext(event.target) &&
      (event.ctrlKey || event.metaKey) &&
      (clipboardKey === 'c' || clipboardKey === 'x')
    ) {
      this.blockEvent(event);
      return;
    }

    if (this.isOpen()) {
      if (this.isMenuInteractionKey(event.key)) {
        this.onMenuKeydown(event);
        return;
      }
      if (this.isEditingKey(event)) {
        this.closeMenu();
        return;
      }
      return;
    }

    const isContextMenuKey = event.key === 'ContextMenu';
    const isShiftF10 = event.shiftKey && event.key === 'F10';
    if (this.disabled || (!isContextMenuKey && !isShiftF10)) {
      return;
    }

    const target = this.resolveTextControl(event.target);
    if (!target) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const rect = target.getBoundingClientRect();
    this.openMenu(target, rect.left, rect.bottom);
  }

  onProtectedClipboardEvent(event: ClipboardEvent): void {
    if (!this.isDocumentController()) {
      return;
    }
    if (this.isProtectedContext(event.target)) {
      this.blockEvent(event);
      return;
    }
    if (this.isOpen() && this.isCurrentTextTarget(event.target)) {
      this.closeMenu();
    }
  }

  onProtectedBeforeInput(event: InputEvent): void {
    if (!this.isDocumentController()) {
      return;
    }
    if (event.inputType === 'deleteByCut' && this.isProtectedContext(event.target)) {
      this.blockEvent(event);
      return;
    }
    if (this.isOpen() && this.isCurrentTextTarget(event.target)) {
      this.closeMenu();
    }
  }

  onProtectedDragStart(event: DragEvent): void {
    if (this.isDocumentController() && this.isProtectedContext(event.target)) {
      this.blockEvent(event);
    }
  }

  onControlInput(event: Event): void {
    if (!this.isDocumentController()) {
      return;
    }
    const target = this.resolveTextControl(event.target);
    if (target) {
      if (this.isOpen() && target === this.target) {
        this.closeMenu();
      }
      this.controlRevisions.set(target, this.controlRevision(target) + 1);
    }
  }

  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.isDocumentController()) {
      return;
    }

    if (!this.isOpen()) {
      if (this.pendingOperationGeneration !== null) {
        this.generation += 1;
        this.pendingOperationGeneration = null;
      }
      return;
    }

    const node = event.target as Node | null;
    if (node && !this.menuRef?.nativeElement.contains(node)) {
      this.closeMenu();
    }
  }

  onDocumentFocusIn(event: FocusEvent): void {
    if (!this.isDocumentController() || !this.isOpen()) {
      return;
    }
    const node = event.target as Node | null;
    if (
      node &&
      node !== this.target &&
      !this.target?.contains(node) &&
      !this.menuRef?.nativeElement.contains(node)
    ) {
      this.closeMenu();
    }
  }

  @HostListener('window:resize')
  onViewportResize(): void {
    if (this.isDocumentController() && this.isOpen()) {
      this.repositionMenu();
    }
  }

  suppressNestedContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  isActionDisabled(action: ContextMenuAction): boolean {
    if (this.disabled || this.disabledActions.includes(action) || !this.target || !this.selection) {
      return true;
    }

    switch (action) {
      case 'cut':
        return (
          this.hasPasteOnlyPolicy(this.target) ||
          !this.isWritable(this.target) ||
          !this.hasSelectedText(this.selection)
        );
      case 'copy':
        return this.hasPasteOnlyPolicy(this.target) || !this.hasSelectedText(this.selection);
      case 'paste':
        return !this.isWritable(this.target);
      case 'select-all':
        return this.selection.textLength === 0;
    }
  }

  async executeAction(action: ContextMenuAction): Promise<void> {
    const target = this.target;
    const selection = this.selection;
    if (!target || !selection || this.isActionDisabled(action)) {
      return;
    }

    const operationGeneration = this.generation;
    let detached = false;

    try {
      this.assertOperationTarget(target, selection, operationGeneration);
      this.pendingOperationGeneration = operationGeneration;
      this.restoreSelection(target, selection);
      this.detachMenuForOperation();
      detached = true;
      switch (action) {
        case 'cut':
          await this.cut(target, selection, operationGeneration);
          break;
        case 'copy':
          await this.copy(target, selection);
          break;
        case 'paste':
          await this.paste(target, selection, operationGeneration);
          break;
        case 'select-all':
          this.selectAll(target);
          break;
      }
      this.actionSelected.emit(action);
      if (operationGeneration === this.generation) {
        this.feedback.set(this.successFeedback(action));
      }
    } catch (reason: unknown) {
      if (!detached && this.target === target) {
        this.closeMenu();
      }
      const failureReason = this.failureReason(reason);
      this.actionError.emit({ action, reason: failureReason });
      if (operationGeneration === this.generation) {
        this.feedback.set(this.failureFeedback(failureReason));
      }
    } finally {
      if (this.pendingOperationGeneration === operationGeneration) {
        this.pendingOperationGeneration = null;
      }
      this.releaseSelection(selection);
    }
  }

  onMenuKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeMenu(true);
      return;
    }

    if (event.key === 'Tab') {
      this.closeMenu();
      return;
    }

    const actions = this.navigationActions();
    if (actions.length === 0) {
      return;
    }

    const activeIndex = actions.indexOf(this.activeAction() as ContextMenuAction);
    let nextIndex: number | null = null;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        event.stopPropagation();
        void this.executeAction(actions[activeIndex < 0 ? 0 : activeIndex]!);
        return;
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = activeIndex < 0 ? 0 : (activeIndex + 1) % actions.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = activeIndex <= 0 ? actions.length - 1 : activeIndex - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = actions.length - 1;
        break;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      event.stopPropagation();
      const action = actions[nextIndex];
      if (action) {
        this.setActiveAction(action);
      }
    }
  }

  /** Recalcula la posición con las dimensiones reales del menú. */
  repositionMenu(): void {
    const menu = this.menuRef?.nativeElement;
    const view = this.document.defaultView;
    if (!menu || !view) {
      return;
    }

    const rect = menu.getBoundingClientRect();
    const visualViewport = view.visualViewport;
    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const viewportWidth =
      visualViewport?.width || this.document.documentElement.clientWidth || view.innerWidth;
    const viewportHeight =
      visualViewport?.height || this.document.documentElement.clientHeight || view.innerHeight;
    const width = rect.width || menu.offsetWidth;
    const height = rect.height || menu.offsetHeight;
    const minLeft = viewportLeft + VIEWPORT_PADDING;
    const minTop = viewportTop + VIEWPORT_PADDING;
    const maxLeft = Math.max(minLeft, viewportLeft + viewportWidth - width - VIEWPORT_PADDING);
    const maxTop = Math.max(minTop, viewportTop + viewportHeight - height - VIEWPORT_PADDING);
    const left = this.clamp(this.requestedPosition.left, minLeft, maxLeft);
    const top = this.clamp(this.requestedPosition.top, minTop, maxTop);

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    this.position.set({ left, top });
  }

  private openMenu(target: TextControl, left: number, top: number): void {
    if (this.isOpen() || this.target || this.selection) {
      this.closeMenu();
    }
    const openingGeneration = ++this.generation;
    this.target = target;
    this.selection = this.captureSelection(target);
    this.requestedPosition = { left, top };
    this.position.set({
      left: Math.max(VIEWPORT_PADDING, left),
      top: Math.max(VIEWPORT_PADDING, top),
    });
    this.isOpen.set(true);
    this.feedback.set('Menú de edición abierto.');
    const firstAction = this.navigationActions()[0] ?? null;
    this.activeAction.set(firstAction);
    this.attachTargetAria(target, firstAction);

    this.scheduleMenuLayout(openingGeneration);
  }

  private closeMenu(restoreFocus = false, invalidateGeneration = true): void {
    const target = this.target;
    const selection = this.selection;
    if (restoreFocus && target && selection) {
      this.restoreSelection(target, selection);
    }
    this.restoreTargetAria(target);
    this.cancelMenuLayout();
    this.isOpen.set(false);
    this.activeAction.set(null);
    this.target = null;
    this.selection = null;
    this.releaseSelection(selection);
    if (invalidateGeneration) {
      this.generation += 1;
      this.pendingOperationGeneration = null;
    }
  }

  private detachMenuForOperation(): void {
    this.restoreTargetAria(this.target);
    this.cancelMenuLayout();
    this.isOpen.set(false);
    this.activeAction.set(null);
    this.target = null;
    this.selection = null;
  }

  private navigationActions(): ContextMenuAction[] {
    return this.menuItems
      .map((item) => item.action)
      .filter((action) => !this.isActionDisabled(action));
  }

  private scheduleMenuLayout(openingGeneration: number, retries = 1): void {
    this.cancelMenuLayout();
    const view = this.document.defaultView;
    if (!view?.requestAnimationFrame) {
      queueMicrotask(() => this.repositionMenu());
      return;
    }
    this.layoutFrame = view.requestAnimationFrame(() => {
      this.layoutFrame = null;
      if (!this.isOpen() || openingGeneration !== this.generation) {
        return;
      }
      if (!this.menuRef && retries > 0) {
        this.scheduleMenuLayout(openingGeneration, retries - 1);
        return;
      }
      this.repositionMenu();
    });
  }

  private cancelMenuLayout(): void {
    if (this.layoutFrame === null) {
      return;
    }
    this.document.defaultView?.cancelAnimationFrame(this.layoutFrame);
    this.layoutFrame = null;
  }

  private resolveTextControl(eventTarget: EventTarget | null): TextControl | null {
    if (!(eventTarget instanceof Element)) {
      return null;
    }

    const policyElement = eventTarget.closest<HTMLElement>(`[${CONTEXT_MENU_POLICY_ATTRIBUTE}]`);
    const policy = policyElement?.getAttribute(CONTEXT_MENU_POLICY_ATTRIBUTE);
    if (policy === NATIVE_POLICY) {
      return null;
    }
    const explicitlyManaged = policy === TEXT_EDIT_POLICY;

    const nativeControl = eventTarget.closest<HTMLInputElement | HTMLTextAreaElement>(
      'textarea, input',
    );
    if (nativeControl?.isConnected) {
      if (nativeControl.disabled) {
        return null;
      }
      if (nativeControl instanceof HTMLInputElement && !TEXT_INPUT_TYPES.has(nativeControl.type)) {
        return null;
      }
      if (
        !explicitlyManaged &&
        (nativeControl.getAttribute('role') === 'combobox' ||
          nativeControl.hasAttribute('aria-controls') ||
          nativeControl.hasAttribute('aria-haspopup'))
      ) {
        return null;
      }
      return nativeControl;
    }

    let candidate: Element | null = eventTarget;
    while (candidate?.isConnected) {
      if (candidate.hasAttribute('contenteditable')) {
        const mode = (candidate.getAttribute('contenteditable') ?? '').toLowerCase();
        if (mode === 'false') {
          return null;
        }
        if (mode === '' || mode === 'true' || mode === 'plaintext-only') {
          return explicitlyManaged ? (candidate as HTMLElement) : null;
        }
      }
      candidate = candidate.parentElement;
    }
    return null;
  }

  private isDocumentController(): boolean {
    if (!this.registered) {
      return false;
    }
    const instances = ContextMenuComponent.documentInstances.get(this.document) ?? [];
    const controller = instances.find((instance) => instance.registered);
    if (controller !== this && this.isOpen()) {
      this.closeMenu();
    }
    if (controller !== this && this.pendingOperationGeneration !== null) {
      this.generation += 1;
      this.pendingOperationGeneration = null;
    }
    return controller === this;
  }

  private hasPasteOnlyPolicy(eventTarget: EventTarget | null): boolean {
    if (!(eventTarget instanceof Element)) {
      return false;
    }

    const passwordInput = eventTarget.closest<HTMLInputElement>('input[type="password"]');
    if (passwordInput?.isConnected) {
      return true;
    }

    const protectedTarget = eventTarget.closest<HTMLElement>(
      '[data-clipboard-policy="paste-only"]',
    );
    return Boolean(protectedTarget?.isConnected);
  }

  private isProtectedContext(eventTarget: EventTarget | null): boolean {
    return (
      this.hasPasteOnlyPolicy(eventTarget) ||
      Boolean(this.isOpen() && this.target && this.hasPasteOnlyPolicy(this.target))
    );
  }

  private isCurrentTextTarget(eventTarget: EventTarget | null): boolean {
    return (
      eventTarget instanceof Node &&
      Boolean(this.target && (eventTarget === this.target || this.target.contains(eventTarget)))
    );
  }

  private isEditingKey(event: KeyboardEvent): boolean {
    const key = event.key.toLowerCase();
    if (key === 'backspace' || key === 'delete' || event.isComposing) {
      return true;
    }
    if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x', 'y', 'z'].includes(key)) {
      return true;
    }
    return event.key.length === 1 && !event.metaKey && (!event.ctrlKey || event.altKey);
  }

  private isMenuInteractionKey(key: string): boolean {
    return [
      'Escape',
      'Tab',
      'ArrowDown',
      'ArrowRight',
      'ArrowUp',
      'ArrowLeft',
      'Home',
      'End',
      'Enter',
      ' ',
    ].includes(key);
  }

  private blockEvent(event: Event): void {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  private resolveOpeningPoint(
    clientX: number,
    clientY: number,
    target: TextControl,
  ): { left: number; top: number } {
    if (clientX !== 0 || clientY !== 0) {
      return { left: clientX, top: clientY };
    }

    const rect = target.getBoundingClientRect();
    return { left: rect.left, top: rect.bottom };
  }

  private captureSelection(target: TextControl): SelectionSnapshot {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const selectionSupported = target.selectionStart !== null && target.selectionEnd !== null;
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? start;
      return {
        kind: 'input',
        start,
        end,
        direction: target.selectionDirection ?? 'none',
        selectionSupported,
        textLength: target.value.length,
        revision: this.controlRevision(target),
      };
    }

    const selection = this.document.defaultView?.getSelection();
    const activeRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const range =
      activeRange && target.contains(activeRange.commonAncestorContainer)
        ? activeRange.cloneRange()
        : null;
    return {
      kind: 'editable',
      range,
      textLength: target.textContent?.length ?? 0,
      revision: this.controlRevision(target),
    };
  }

  private restoreSelection(target: TextControl, snapshot: SelectionSnapshot): void {
    if (!target.isConnected) {
      return;
    }
    this.focusTarget(target);
    if (snapshot.kind === 'input') {
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        if (!snapshot.selectionSupported) {
          return;
        }
        try {
          target.setSelectionRange(snapshot.start, snapshot.end, snapshot.direction);
        } catch {
          return;
        }
      }
      return;
    }

    if (!snapshot.range || !snapshot.range.startContainer.isConnected) {
      return;
    }
    const selection = this.document.defaultView?.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(snapshot.range);
  }

  private hasSelectedText(snapshot: SelectionSnapshot): boolean {
    return snapshot.kind === 'input'
      ? snapshot.end > snapshot.start
      : Boolean(snapshot.range && !snapshot.range.collapsed);
  }

  private selectedText(target: TextControl, snapshot: SelectionSnapshot): string {
    if (snapshot.kind === 'input') {
      return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
        ? target.value.slice(snapshot.start, snapshot.end)
        : '';
    }
    return snapshot.range?.toString() ?? '';
  }

  private isWritable(target: TextControl): boolean {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      return !target.disabled && !target.readOnly;
    }
    return target.getAttribute('contenteditable') !== 'false';
  }

  private attachTargetAria(target: TextControl, activeAction: ContextMenuAction | null): void {
    this.targetAria = {
      controls: target.getAttribute('aria-controls'),
      expanded: target.getAttribute('aria-expanded'),
      haspopup: target.getAttribute('aria-haspopup'),
      activeDescendant: target.getAttribute('aria-activedescendant'),
    };
    target.setAttribute('aria-controls', this.menuId);
    target.setAttribute('aria-expanded', 'true');
    target.setAttribute('aria-haspopup', 'menu');
    if (activeAction) {
      target.setAttribute('aria-activedescendant', this.itemId(activeAction));
    } else {
      target.removeAttribute('aria-activedescendant');
    }
  }

  private restoreTargetAria(target: TextControl | null): void {
    const snapshot = this.targetAria;
    this.targetAria = null;
    if (!target || !snapshot) {
      return;
    }
    this.restoreAttribute(target, 'aria-controls', snapshot.controls);
    this.restoreAttribute(target, 'aria-expanded', snapshot.expanded);
    this.restoreAttribute(target, 'aria-haspopup', snapshot.haspopup);
    this.restoreAttribute(target, 'aria-activedescendant', snapshot.activeDescendant);
  }

  private restoreAttribute(target: HTMLElement, name: string, value: string | null): void {
    if (value === null) {
      target.removeAttribute(name);
    } else {
      target.setAttribute(name, value);
    }
  }

  private releaseSelection(snapshot: SelectionSnapshot | null): void {
    if (snapshot?.kind === 'editable') {
      snapshot.range?.detach();
      snapshot.range = null;
    }
  }

  private async copy(target: TextControl, selection: SelectionSnapshot): Promise<void> {
    if (this.executeDocumentCommand('copy')) {
      return;
    }
    const clipboard = this.resolveBrowserClipboard();
    if (!clipboard) {
      throw new ContextMenuOperationError('clipboard-unavailable');
    }
    let text = this.selectedText(target, selection);
    try {
      await clipboard.writeText(text);
    } catch {
      throw new ContextMenuOperationError('clipboard-denied');
    } finally {
      text = '';
    }
  }

  private async cut(
    target: TextControl,
    selection: SelectionSnapshot,
    operationGeneration: number,
  ): Promise<void> {
    if (this.executeDocumentCommand('cut')) {
      return;
    }
    const clipboard = this.resolveBrowserClipboard();
    if (!clipboard) {
      throw new ContextMenuOperationError('clipboard-unavailable');
    }
    let text = this.selectedText(target, selection);
    try {
      await clipboard.writeText(text);
    } catch {
      throw new ContextMenuOperationError('clipboard-denied');
    } finally {
      text = '';
    }
    this.assertOperationTarget(target, selection, operationGeneration);
    if (!this.deleteSelection(target, selection)) {
      throw new ContextMenuOperationError('operation-failed');
    }
  }

  private async paste(
    target: TextControl,
    selection: SelectionSnapshot,
    operationGeneration: number,
  ): Promise<void> {
    const clipboard = this.resolveBrowserClipboard();
    if (!clipboard) {
      if (this.executeDocumentCommand('paste')) {
        return;
      }
      throw new ContextMenuOperationError('clipboard-unavailable');
    }

    let text = '';
    try {
      text = await clipboard.readText();
    } catch {
      throw new ContextMenuOperationError('clipboard-denied');
    }
    try {
      this.assertOperationTarget(target, selection, operationGeneration);
      if (!this.insertText(target, selection, text)) {
        throw new ContextMenuOperationError('operation-failed');
      }
    } finally {
      text = '';
    }
  }

  private deleteSelection(target: TextControl, selection: SelectionSnapshot): boolean {
    if (!this.dispatchBeforeInputEvent(target, 'deleteByCut')) {
      return false;
    }
    if (selection.kind === 'input') {
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        if (selection.selectionSupported) {
          target.setRangeText('', selection.start, selection.end, 'start');
        } else {
          target.value = target.value.slice(0, selection.start) + target.value.slice(selection.end);
        }
        this.dispatchInputEvent(target, 'deleteByCut');
        return true;
      }
      return false;
    }

    if (!selection.range) {
      return false;
    }
    selection.range.deleteContents();
    this.dispatchInputEvent(target, 'deleteByCut');
    return true;
  }

  private insertText(
    target: TextControl,
    selection: SelectionSnapshot,
    clipboardText: string,
  ): boolean {
    const text = this.truncatePasteText(target, selection, clipboardText);
    if (text.length === 0 && !this.hasSelectedText(selection)) {
      return true;
    }
    if (!this.dispatchBeforeInputEvent(target, 'insertFromPaste', text)) {
      return false;
    }
    if (selection.kind === 'input') {
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        if (selection.selectionSupported) {
          target.setRangeText(text, selection.start, selection.end, 'end');
        } else {
          target.value =
            target.value.slice(0, selection.start) + text + target.value.slice(selection.end);
        }
        this.dispatchInputEvent(target, 'insertFromPaste', text);
        return true;
      }
      return false;
    }

    const range = selection.range ?? this.document.createRange();
    if (!selection.range) {
      range.selectNodeContents(target);
      range.collapse(false);
    } else {
      range.deleteContents();
    }
    const textNode = this.document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    const browserSelection = this.document.defaultView?.getSelection();
    browserSelection?.removeAllRanges();
    browserSelection?.addRange(range);
    this.dispatchInputEvent(target, 'insertFromPaste', text);
    return true;
  }

  private selectAll(target: TextControl): void {
    this.focusTarget(target);
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      target.select();
      return;
    }

    const range = this.document.createRange();
    range.selectNodeContents(target);
    const selection = this.document.defaultView?.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  private resolveBrowserClipboard(): Clipboard | null {
    try {
      return this.document.defaultView?.navigator.clipboard ?? null;
    } catch {
      return null;
    }
  }

  private focusTarget(target: TextControl): void {
    try {
      target.focus({ preventScroll: true });
    } catch {
      target.focus();
    }
  }

  private executeDocumentCommand(command: 'copy' | 'cut' | 'paste'): boolean {
    try {
      return typeof this.document.execCommand === 'function' && this.document.execCommand(command);
    } catch {
      return false;
    }
  }

  private dispatchBeforeInputEvent(
    target: TextControl,
    inputType: 'deleteByCut' | 'insertFromPaste',
    data: string | null = null,
  ): boolean {
    const InputEventConstructor = this.document.defaultView?.InputEvent;
    const event = InputEventConstructor
      ? new InputEventConstructor('beforeinput', {
          bubbles: true,
          cancelable: true,
          data,
          inputType,
        })
      : new Event('beforeinput', { bubbles: true, cancelable: true });
    return target.dispatchEvent(event);
  }

  private dispatchInputEvent(
    target: TextControl,
    inputType: 'deleteByCut' | 'insertFromPaste',
    data: string | null = null,
  ): void {
    const InputEventConstructor = this.document.defaultView?.InputEvent;
    const event = InputEventConstructor
      ? new InputEventConstructor('input', { bubbles: true, data, inputType })
      : new Event('input', { bubbles: true });
    target.dispatchEvent(event);
  }

  private truncatePasteText(
    target: TextControl,
    selection: SelectionSnapshot,
    text: string,
  ): string {
    const normalizedText =
      target instanceof HTMLInputElement ? text.replace(/\r\n?|\n/g, ' ') : text;
    if (
      selection.kind !== 'input' ||
      !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) ||
      target.maxLength < 0
    ) {
      return normalizedText;
    }
    const selectedLength = selection.end - selection.start;
    const capacity = Math.max(0, target.maxLength - (target.value.length - selectedLength));
    return normalizedText.slice(0, capacity);
  }

  private assertOperationTarget(
    target: TextControl,
    selection: SelectionSnapshot,
    operationGeneration: number,
  ): void {
    const activeElement = this.document.activeElement;
    if (
      operationGeneration !== this.generation ||
      !target.isConnected ||
      (activeElement !== target && !target.contains(activeElement)) ||
      selection.revision !== this.controlRevision(target)
    ) {
      throw new ContextMenuOperationError('target-changed');
    }

    if (selection.kind === 'input') {
      if (
        !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) ||
        target.value.length !== selection.textLength ||
        (selection.selectionSupported &&
          (target.selectionStart !== selection.start || target.selectionEnd !== selection.end))
      ) {
        throw new ContextMenuOperationError('target-changed');
      }
      return;
    }

    const range = selection.range;
    const browserSelection = this.document.defaultView?.getSelection();
    const currentRange = browserSelection?.rangeCount ? browserSelection.getRangeAt(0) : null;
    if (
      !range ||
      !range.startContainer.isConnected ||
      target.textContent?.length !== selection.textLength ||
      !currentRange ||
      currentRange.startContainer !== range.startContainer ||
      currentRange.startOffset !== range.startOffset ||
      currentRange.endContainer !== range.endContainer ||
      currentRange.endOffset !== range.endOffset
    ) {
      throw new ContextMenuOperationError('target-changed');
    }
  }

  private controlRevision(target: TextControl): number {
    return this.controlRevisions.get(target) ?? 0;
  }

  private failureReason(reason: unknown): ContextMenuFailureReason {
    return reason instanceof ContextMenuOperationError ? reason.reason : 'operation-failed';
  }

  private successFeedback(action: ContextMenuAction): string {
    switch (action) {
      case 'cut':
        return 'Texto cortado.';
      case 'copy':
        return 'Texto copiado.';
      case 'paste':
        return 'Texto pegado.';
      case 'select-all':
        return 'Texto seleccionado.';
    }
  }

  private failureFeedback(reason: ContextMenuFailureReason): string {
    switch (reason) {
      case 'clipboard-unavailable':
        return 'El portapapeles no está disponible.';
      case 'clipboard-denied':
        return 'El sistema no permitió acceder al portapapeles.';
      case 'target-changed':
        return 'La acción se canceló porque el control cambió.';
      case 'operation-failed':
        return 'No se pudo completar la acción de edición.';
    }
  }

  private clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
  }
}
