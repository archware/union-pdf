import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  ViewEncapsulation,
  inject,
} from '@angular/core';

type ListenerUnsubscriber = () => void;
export type ScrollOverlayVariant = 'default' | 'brand';

@Component({
  selector: 'app-scroll-overlay',
  standalone: true,
  templateUrl: './scroll-overlay.component.html',
  styleUrl: './scroll-overlay.component.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'so-root',
  },
})
export class ScrollOverlayComponent implements AfterViewInit, OnDestroy {
  /**
   * Visual palette variant for the overlay scrollbars.
   * 'default' renders the neutral thumb and auto-hides at rest.
   * 'brand' renders the primary-to-secondary brand gradient thumb with a soft tinted track visible at rest.
   */
  @Input()
  set variant(value: ScrollOverlayVariant) {
    const normalized: ScrollOverlayVariant = value === 'brand' ? 'brand' : 'default';
    this._variant = normalized;
    if (this.hostEl) {
      this.hostEl.classList.toggle('so-variant-brand', normalized === 'brand');
    }
  }
  get variant(): ScrollOverlayVariant {
    return this._variant;
  }

  /**
   * CSS selector used to locate the element that controls the vertical scroll.
   * Defaults to content marked explicitly with `data-scroll-overlay-vertical`.
   */
  @Input() verticalSelector: string | null = '[data-scroll-overlay-vertical]';

  /**
   * CSS selector used to locate the element that controls horizontal scroll.
   * Defaults to the internal scroll area wrapper.
   */
  @Input() horizontalSelector: string | null = '[data-scroll-overlay-horizontal]';

  /** Minimum size (in px) for the scrollbar thumbs. */
  @Input() minThumbSize = 28;

  /** Thickness (in px) of the overlay tracks. */
  @Input() trackSize = 7;

  /** Delay (in ms) before auto-hiding the scrollbars after interaction. */
  @Input() autoHideDelay = 800;

  /**
   * Uses the browser scrollbars on the resolved owners and suppresses the decorative overlay rails.
   * The scrollbar palette is provided by the canonical theme tokens.
   */
  @Input()
  set nativeScrollbars(value: boolean) {
    this._nativeScrollbars = !!value;
    if (this.hostEl) {
      this.hostEl.classList.toggle('so-native-scrollbars', this._nativeScrollbars);
      this.updateNativeScrollbarMarkers();
      this.hideBar();
    }
  }
  get nativeScrollbars(): boolean {
    return this._nativeScrollbars;
  }

  /** Accessible name for the internal viewport when it is the real scroll owner. */
  @Input() scrollAreaAriaLabel: string | null = null;

  /** Resets both axes of every resolved owner whenever its identity changes. */
  @Input()
  set resetKey(value: unknown) {
    const changed = !Object.is(this._resetKey, value);
    this._resetKey = value;
    if (changed && this.hostEl) {
      this.resetScrollPosition();
    }
  }
  get resetKey(): unknown {
    return this._resetKey;
  }

  /** When true, the component will not override a custom --so-column-template value. */
  private _lockColumnTemplate = false;
  private _columnTemplate: string | null = null;
  private _lastColumnTemplate = '';

  /**
   * When true, the component will keep any user-provided column template intact and will not
   * attempt to measure and override column widths automatically.
   */
  @Input()
  set lockColumnTemplate(value: boolean) {
    const coerced = !!value;
    this._lockColumnTemplate = coerced;
    if (this.hostEl) {
      this.hostEl.classList.toggle('so-lock-template', coerced);
      if (coerced && this._columnTemplate) {
        this.applyColumnTemplate();
      } else if (!coerced && !this._columnTemplate) {
        this.hostEl.style.removeProperty('--so-column-template');
      }
      this.syncGeometry();
    }
  }
  get lockColumnTemplate(): boolean {
    return this._lockColumnTemplate;
  }

  /** Custom grid template columns definition applied when locking the template. */
  @Input()
  set columnTemplate(value: string | null | undefined) {
    const normalized = typeof value === 'string' ? value.trim() : '';
    const template = normalized ? normalized : null;
    if (this._columnTemplate === template) {
      return;
    }
    this._columnTemplate = template;
    if (this.hostEl) {
      this.applyColumnTemplate();
      this.syncGeometry();
    }
  }
  get columnTemplate(): string | null {
    return this._columnTemplate;
  }

  /**
   * When true the component will measure table columns (thead/tbody) to keep header and body aligned.
   */
  @Input() syncTableColumns = true;

  /**
   * When true, skip auto-detection of tbody and use the internal scroll area directly.
   * Useful for layout containers that should NOT control nested table scrolls.
   */
  @Input() skipTableDetection = false;

  /** Minimum width (in px) applied when syncing table columns. */
  @Input()
  set minColumnWidth(value: number) {
    const parsed = Number(value);
    this._minColumnWidth = Number.isFinite(parsed) && parsed > 0 ? parsed : 140;
    this.applyMinColumnWidth();
    if (this.hostEl) {
      this.syncGeometry();
    }
  }
  get minColumnWidth(): number {
    return this._minColumnWidth;
  }

  /** Provide a max height for the vertical scroller (number in px or any CSS size). */
  @Input()
  set maxBodyHeight(value: number | string | null | undefined) {
    const parsed = typeof value === 'string' ? value.trim() : value;
    this._maxBodyHeight =
      parsed === '' || parsed === null || parsed === undefined ? undefined : parsed;
    this.applyMaxHeight();
    if (this.hostEl) {
      this.syncGeometry();
    }
  }
  get maxBodyHeight(): number | string | null | undefined {
    return this._maxBodyHeight;
  }

  /** Disable the custom vertical overlay. */
  @Input()
  set disableVertical(value: boolean) {
    this._disableVertical = value;
    if (this.hostEl) {
      this.hostEl.classList.toggle('so-no-vertical', !!value);
      if (value) {
        this.hostEl.classList.remove('so-has-overflow-y');
      }
      this.updateThumbs();
      this.updateScrollAreaOverflow();
    }
  }
  get disableVertical(): boolean {
    return this._disableVertical;
  }

  /** Disable the custom horizontal overlay. */
  @Input()
  set disableHorizontal(value: boolean) {
    this._disableHorizontal = value;
    if (this.hostEl) {
      this.hostEl.classList.toggle('so-no-horizontal', !!value);
      if (value) {
        this.hostEl.classList.remove('so-has-overflow-x');
      }
      this.updateThumbs();
    }
  }
  get disableHorizontal(): boolean {
    return this._disableHorizontal;
  }

  @ViewChild('scrollArea', { static: true }) private scrollAreaRef!: ElementRef<HTMLElement>;
  @ViewChild('barY', { static: true }) private barYRef!: ElementRef<HTMLElement>;
  @ViewChild('barX', { static: true }) private barXRef!: ElementRef<HTMLElement>;
  @ViewChild('thumbY', { static: true }) private thumbYRef!: ElementRef<HTMLElement>;
  @ViewChild('thumbX', { static: true }) private thumbXRef!: ElementRef<HTMLElement>;

  private readonly listeners: ListenerUnsubscriber[] = [];
  private readonly isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  private readonly horizontalBarGap = 3;
  private readonly verticalBarGap = 10;

  private hostEl!: HTMLElement;
  private verticalScroller?: HTMLElement;
  private horizontalScroller?: HTMLElement;
  private tableHead?: HTMLElement | null;
  private headerRow?: HTMLElement | null;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private verticalThumbSize = this.minThumbSize;
  private horizontalThumbSize = this.minThumbSize;
  private verticalBarHeight = 0;
  private horizontalBarWidth = 0;
  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;
  private readonly observedContentElements = new Set<Element>();
  private geometryFrameId?: number;

  private draggingY = false;
  private draggingX = false;
  private dragStartClientY = 0;
  private dragStartClientX = 0;
  private dragStartScrollTop = 0;
  private dragStartScrollLeft = 0;
  private dragPointerIdY?: number;
  private dragPointerIdX?: number;

  private _variant: ScrollOverlayVariant = 'default';
  private _maxBodyHeight: number | string | undefined;
  private _minColumnWidth = 140;
  private _disableVertical = false;
  private _disableHorizontal = false;
  private _nativeScrollbars = false;
  private _resetKey: unknown;

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.hostEl = this.elementRef.nativeElement;
    this.hostEl.style.setProperty('--so-track-size', `${this.trackSize}px`);
    this.hostEl.classList.toggle('so-variant-brand', this._variant === 'brand');
    this.hostEl.classList.toggle('so-lock-template', this._lockColumnTemplate);
    this.hostEl.classList.toggle('so-native-scrollbars', this._nativeScrollbars);
    this.applyMinColumnWidth();
    this.applyColumnTemplate();
    this.resolveScrollElements(true);
    this.applyMaxHeight();
    if (!this.horizontalScroller) {
      this.horizontalScroller = this.scrollAreaRef.nativeElement;
    }
    this.updateNativeScrollbarMarkers();

    if (this.disableVertical) {
      this.hostEl.classList.add('so-no-vertical');
    }
    if (this.disableHorizontal) {
      this.hostEl.classList.add('so-no-horizontal');
    }

    this.attachListeners();
    this.syncGeometry();
    this.showBar();
  }

  ngOnDestroy(): void {
    this.clearHideTimer();
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.length = 0;
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.observedContentElements.clear();
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    if (this.geometryFrameId !== undefined) {
      cancelAnimationFrame(this.geometryFrameId);
      this.geometryFrameId = undefined;
    }
    if (this.verticalScroller?.hasAttribute('data-so-vertical-temp')) {
      this.verticalScroller.removeAttribute('data-so-vertical');
      this.verticalScroller.removeAttribute('data-so-vertical-temp');
    }
    if (this.horizontalScroller?.hasAttribute('data-so-horizontal-temp')) {
      this.horizontalScroller.removeAttribute('data-so-horizontal');
      this.horizontalScroller.removeAttribute('data-so-horizontal-temp');
    }
    this.removeManagedScrollbarMarker(this.verticalScroller);
    if (this.horizontalScroller !== this.verticalScroller) {
      this.removeManagedScrollbarMarker(this.horizontalScroller);
    }
    this.removeNativeScrollbarMarkers();
  }

  /** Restores the beginning of both axes without assuming a shared owner. */
  resetScrollPosition(): void {
    const owners = new Set<HTMLElement>();
    owners.add(this.scrollAreaRef.nativeElement);
    if (this.verticalScroller) {
      owners.add(this.verticalScroller);
    }
    if (this.horizontalScroller) {
      owners.add(this.horizontalScroller);
    }

    owners.forEach((owner) => {
      owner.scrollTop = 0;
      owner.scrollLeft = 0;
    });
    this.updateThumbs();
  }

  private applyMinColumnWidth(): void {
    if (!this.hostEl) {
      return;
    }
    this.hostEl.style.setProperty('--so-min-column-width', `${this._minColumnWidth}px`);
  }

  private applyColumnTemplate(): void {
    if (!this.hostEl) {
      return;
    }

    if (this._columnTemplate) {
      this.hostEl.style.setProperty('--so-column-template', this._columnTemplate);
    } else if (!this._lockColumnTemplate) {
      this.hostEl.style.removeProperty('--so-column-template');
    }
  }

  private applyMaxHeight(): void {
    if (!this.hostEl) {
      return;
    }

    const value = this.normalizeCssSize(this._maxBodyHeight);
    if (!value) {
      this.hostEl.removeAttribute('data-so-max-height');
      this.hostEl.style.removeProperty('--so-max-height');
      this.hostEl.style.removeProperty('--so-body-height');
      this.updateVerticalMaxHeight(null);
      return;
    }

    this.hostEl.setAttribute('data-so-max-height', 'true');
    this.hostEl.style.setProperty('--so-max-height', value);
    this.hostEl.style.setProperty('--so-body-height', value);
    this.updateVerticalMaxHeight(value);
  }

  private resolveScrollElements(_isInitial = false): void {
    const host = this.elementRef.nativeElement;
    const belongsToCurrentOverlay = (element: Element): boolean =>
      element.closest('.so-root') === host;

    host.querySelectorAll('[data-so-horizontal-temp]').forEach((el) => {
      if (!belongsToCurrentOverlay(el)) {
        return;
      }
      el.removeAttribute('data-so-horizontal');
      el.removeAttribute('data-so-horizontal-temp');
    });
    host.querySelectorAll('[data-so-vertical-temp]').forEach((el) => {
      if (!belongsToCurrentOverlay(el)) {
        return;
      }
      el.removeAttribute('data-so-vertical');
      el.removeAttribute('data-so-vertical-temp');
      const element = el as HTMLElement;
      element.style.removeProperty('--so-body-height');
      element.style.removeProperty('max-height');
      element.style.removeProperty('height');
      element.style.removeProperty('min-height');
      element.style.removeProperty('display');
      element.style.removeProperty('overflow-y');
      element.style.removeProperty('overflow-x');
      element.style.removeProperty('box-sizing');
    });
    host.querySelectorAll('[data-so-managed-scrollbar-temp]').forEach((el) => {
      if (belongsToCurrentOverlay(el)) {
        el.removeAttribute('data-so-managed-scrollbar');
        el.removeAttribute('data-so-managed-scrollbar-temp');
      }
    });

    // Helper: Check if element is inside a nested scroll-overlay (not this one)
    const isInsideNestedScrollOverlay = (el: Element): boolean => {
      let parent = el.parentElement;
      while (parent && parent !== host) {
        if (parent.classList.contains('so-root')) {
          return true; // Element is inside a nested scroll-overlay
        }
        parent = parent.parentElement;
      }
      return false;
    };

    // Helper: Find first element matching selector that is NOT inside a nested scroll-overlay
    const searchDirect = (selector: string | null | undefined): HTMLElement | null => {
      if (!selector) {
        return null;
      }
      const parts = selector
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      for (const part of parts) {
        const candidates = Array.from(host.querySelectorAll(part)) as HTMLElement[];
        const directMatch = candidates.find((el) => !isInsideNestedScrollOverlay(el));
        if (directMatch) {
          return directMatch;
        }
      }
      return null;
    };

    const scrollArea = this.scrollAreaRef.nativeElement;
    scrollArea.setAttribute('data-so-horizontal', 'true');

    const resolvedHorizontal = searchDirect(this.horizontalSelector);
    this.horizontalScroller = resolvedHorizontal ?? scrollArea;
    if (this.horizontalScroller !== scrollArea) {
      this.horizontalScroller.setAttribute('data-so-horizontal', 'true');
      this.horizontalScroller.setAttribute('data-so-horizontal-temp', 'true');
    } else {
      this.horizontalScroller.removeAttribute('data-so-horizontal-temp');
    }
    this.markManagedScrollbar(this.horizontalScroller);

    const vertical = searchDirect(this.verticalSelector);
    // If vertical is explicitly set via selector, use it. Otherwise, always use scrollArea.
    // We intentionally DO NOT default to tbody anymore, to avoid browser bugs with table height limits.
    this.verticalScroller = vertical ?? scrollArea;
    if (this.verticalScroller) {
      if (!this.verticalScroller.hasAttribute('data-so-vertical')) {
        this.verticalScroller.setAttribute('data-so-vertical', 'true');
        this.verticalScroller.setAttribute('data-so-vertical-temp', 'true');
      } else {
        this.verticalScroller.removeAttribute('data-so-vertical-temp');
      }
      this.markManagedScrollbar(this.verticalScroller);
      this.applyVerticalScrollerDefaults();
    }

    // Find table that is a DIRECT descendant (not inside nested scroll-overlay)
    // Skip table detection if explicitly disabled
    if (!this.skipTableDetection) {
      const allTables = Array.from(host.querySelectorAll('table')) as HTMLElement[];
      const directTable = allTables.find((t) => !isInsideNestedScrollOverlay(t));
      this.tableHead = directTable?.querySelector('thead') as HTMLElement | null;
      this.headerRow = this.tableHead?.querySelector('tr') as HTMLElement | null;
    } else {
      this.tableHead = null;
      this.headerRow = null;
    }

    if (this.tableHead) {
      host.setAttribute('data-so-table', 'true');
      if (this.syncTableColumns) {
        host.setAttribute('data-so-sync-columns', 'true');
      } else {
        host.removeAttribute('data-so-sync-columns');
      }
    } else {
      host.removeAttribute('data-so-table');
      host.removeAttribute('data-so-sync-columns');
    }

    this.updateScrollAreaOverflow();
    const value = this.normalizeCssSize(this._maxBodyHeight);
    this.updateVerticalMaxHeight(value);

    this.ensureSingleScrollbar();
  }

  private attachListeners(): void {
    const host = this.hostEl;
    const barY = this.barYRef.nativeElement;
    const barX = this.barXRef.nativeElement;
    const thumbY = this.thumbYRef.nativeElement;
    const thumbX = this.thumbXRef.nativeElement;

    const addListener = (
      target: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: AddEventListenerOptions,
    ) => {
      target.addEventListener(type, listener, options);
      this.listeners.push(() => target.removeEventListener(type, listener, options));
    };

    const vertical = this.verticalScroller;
    const horizontal = this.horizontalScroller;

    const handleScroll = () => {
      this.updateThumbs();
      this.showBar();
    };

    const handlePointer = () => {
      this.updateThumbs();
      this.showBar();
    };

    const handleScrollerLeave = (event: Event) => {
      const related = (event as MouseEvent).relatedTarget;
      if (related instanceof Node && this.hostEl.contains(related)) {
        return;
      }
      this.hideBar();
    };

    addListener(host, 'mouseenter', handlePointer);
    addListener(host, 'mouseleave', () => this.hideBar());
    addListener(host, 'load', () => this.scheduleGeometrySync(), {
      capture: true,
      passive: true,
    });
    addListener(host, 'wheel', (event) => this.handleWheel(event as WheelEvent), {
      passive: false,
    });

    if (typeof window !== 'undefined') {
      addListener(window, 'resize', () => this.scheduleGeometrySync(), { passive: true });
    }

    if (!this.disableVertical && vertical) {
      addListener(vertical, 'scroll', handleScroll, { passive: true });
      addListener(vertical, 'wheel', handlePointer, { passive: true });
      addListener(vertical, 'mouseenter', handlePointer);
      addListener(vertical, 'mouseleave', handleScrollerLeave);
      addListener(vertical, 'touchstart', handlePointer, { passive: true });
      addListener(vertical, 'touchmove', handlePointer, { passive: true });
    }

    if (!this.disableHorizontal && horizontal) {
      addListener(horizontal, 'scroll', handleScroll, { passive: true });
      addListener(horizontal, 'wheel', handlePointer, { passive: true });
      addListener(horizontal, 'mouseenter', handlePointer);
      addListener(horizontal, 'mouseleave', handleScrollerLeave);
      addListener(horizontal, 'touchstart', handlePointer, { passive: true });
      addListener(horizontal, 'touchmove', handlePointer, { passive: true });
    }

    if (!this.disableVertical) {
      addListener(barY, 'mouseenter', handlePointer);
      addListener(barY, 'pointerdown', (event) =>
        this.handleTrackPointerDownY(event as PointerEvent),
      );
      addListener(thumbY, 'pointerdown', (event) => this.startDragY(event as PointerEvent));
      addListener(thumbY, 'pointermove', (event) => this.moveDragY(event as PointerEvent));
      addListener(thumbY, 'pointerup', (event) => this.endDragY(event as PointerEvent));
      addListener(thumbY, 'pointercancel', (event) => this.endDragY(event as PointerEvent));
    }

    if (!this.disableHorizontal) {
      addListener(barX, 'mouseenter', handlePointer);
      addListener(barX, 'pointerdown', (event) =>
        this.handleTrackPointerDownX(event as PointerEvent),
      );
      addListener(thumbX, 'pointerdown', (event) => this.startDragX(event as PointerEvent));
      addListener(thumbX, 'pointermove', (event) => this.moveDragX(event as PointerEvent));
      addListener(thumbX, 'pointerup', (event) => this.endDragX(event as PointerEvent));
      addListener(thumbX, 'pointercancel', (event) => this.endDragX(event as PointerEvent));
    }

    const supportsResize = typeof ResizeObserver !== 'undefined';
    const supportsMutation = typeof MutationObserver !== 'undefined';

    if (supportsResize) {
      this.resizeObserver = new ResizeObserver(() => this.scheduleGeometrySync());

      // Observe the host element for container size changes
      this.resizeObserver.observe(this.hostEl);

      if (vertical) {
        this.resizeObserver.observe(vertical);
      }
      if (horizontal && horizontal !== vertical) {
        this.resizeObserver.observe(horizontal);
      }
      const table = this.tableHead?.closest('table');
      if (table) {
        this.resizeObserver.observe(table);
      }
      if (this.headerRow) {
        this.resizeObserver.observe(this.headerRow);
      }
      this.observeScrollerChildren();
    }

    if (supportsMutation && this.verticalScroller) {
      this.mutationObserver = new MutationObserver(() => {
        this.observeScrollerChildren();
        this.scheduleGeometrySync();
      });
      this.mutationObserver.observe(this.verticalScroller, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'style', 'class', 'hidden', 'width', 'height'],
      });
    }
  }

  private observeScrollerChildren(): void {
    if (!this.resizeObserver) {
      return;
    }

    const nextChildren = new Set<Element>();
    const collectChildren = (scroller: HTMLElement | undefined) => {
      if (!scroller) {
        return;
      }
      for (const child of Array.from(scroller.children)) {
        if (!child.classList.contains('so-scrollbar')) {
          nextChildren.add(child);
        }
      }
    };

    collectChildren(this.verticalScroller);
    if (this.horizontalScroller !== this.verticalScroller) {
      collectChildren(this.horizontalScroller);
    }

    for (const existing of Array.from(this.observedContentElements)) {
      if (!nextChildren.has(existing)) {
        this.resizeObserver.unobserve(existing);
        this.observedContentElements.delete(existing);
      }
    }

    for (const child of nextChildren) {
      if (!this.observedContentElements.has(child)) {
        this.resizeObserver.observe(child);
        this.observedContentElements.add(child);
      }
    }
  }

  private handleTrackPointerDownY(event: PointerEvent): void {
    const barY = this.barYRef.nativeElement;
    if (
      event.target !== barY ||
      event.button === 1 ||
      event.button === 2 ||
      !this.verticalScroller ||
      this.disableVertical
    ) {
      return;
    }

    const barRect = this.getSafeRect(barY);
    const trackHeight = this.getVerticalTrackHeight(this.verticalScroller.clientHeight);
    const maxThumbOffset = Math.max(1, trackHeight - this.verticalThumbSize);
    const clickOffset = Math.min(
      maxThumbOffset,
      Math.max(0, event.clientY - barRect.top - this.verticalThumbSize / 2),
    );
    const maxScrollTop = Math.max(
      1,
      this.verticalScroller.scrollHeight - this.verticalScroller.clientHeight,
    );
    this.verticalScroller.scrollTop = (clickOffset / maxThumbOffset) * maxScrollTop;
    this.updateThumbs();
    this.showBar();
    event.preventDefault();
  }

  private handleTrackPointerDownX(event: PointerEvent): void {
    const barX = this.barXRef.nativeElement;
    if (
      event.target !== barX ||
      event.button === 1 ||
      event.button === 2 ||
      !this.horizontalScroller ||
      this.disableHorizontal
    ) {
      return;
    }

    const barRect = this.getSafeRect(barX);
    const trackWidth = this.getHorizontalTrackWidth(this.horizontalScroller.clientWidth);
    const maxThumbOffset = Math.max(1, trackWidth - this.horizontalThumbSize);
    const clickOffset = Math.min(
      maxThumbOffset,
      Math.max(0, event.clientX - barRect.left - this.horizontalThumbSize / 2),
    );
    const maxScrollLeft = Math.max(
      1,
      this.horizontalScroller.scrollWidth - this.horizontalScroller.clientWidth,
    );
    this.horizontalScroller.scrollLeft = (clickOffset / maxThumbOffset) * maxScrollLeft;
    this.updateThumbs();
    this.showBar();
    event.preventDefault();
  }

  /**
   * Routes wheel gestures from the whole content surface to the overlay owner.
   * Native nested scrollers keep priority while they can consume the gesture;
   * once they reach an edge, the gesture can continue through the parent overlay.
   */
  private handleWheel(event: WheelEvent): void {
    if (this.nativeScrollbars || event.defaultPrevented || event.ctrlKey || event.metaKey) {
      return;
    }

    const target = event.target instanceof Element ? event.target : null;
    if (!target || !this.hostEl.contains(target)) {
      return;
    }

    const shiftToHorizontal = event.shiftKey && Math.abs(event.deltaX) < 0.01;
    const verticalDelta = shiftToHorizontal
      ? 0
      : this.normalizeWheelDelta(
          event.deltaY,
          event.deltaMode,
          this.verticalScroller?.clientHeight ?? 0,
        );
    const horizontalDelta = this.normalizeWheelDelta(
      shiftToHorizontal ? event.deltaY : event.deltaX,
      event.deltaMode,
      this.horizontalScroller?.clientWidth ?? 0,
    );

    if (this.descendantCanConsumeWheel(target, horizontalDelta, verticalDelta)) {
      this.showBar();
      return;
    }

    let consumed = false;
    if (!this.disableVertical && this.verticalScroller && Math.abs(verticalDelta) > 0.01) {
      consumed = this.scrollElementBy(this.verticalScroller, 'vertical', verticalDelta) || consumed;
    }
    if (!this.disableHorizontal && this.horizontalScroller && Math.abs(horizontalDelta) > 0.01) {
      consumed =
        this.scrollElementBy(this.horizontalScroller, 'horizontal', horizontalDelta) || consumed;
    }

    if (!consumed) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.updateThumbs();
    this.showBar();
  }

  private descendantCanConsumeWheel(
    target: Element,
    horizontalDelta: number,
    verticalDelta: number,
  ): boolean {
    let candidate: HTMLElement | null =
      target instanceof HTMLElement ? target : target.parentElement;

    while (candidate && candidate !== this.hostEl) {
      const isOwnedScroller =
        candidate === this.verticalScroller || candidate === this.horizontalScroller;
      if (!isOwnedScroller) {
        if (
          (Math.abs(verticalDelta) > 0.01 &&
            this.canElementConsumeWheel(candidate, 'vertical', verticalDelta)) ||
          (Math.abs(horizontalDelta) > 0.01 &&
            this.canElementConsumeWheel(candidate, 'horizontal', horizontalDelta))
        ) {
          return true;
        }
      }
      candidate = candidate.parentElement;
    }

    return false;
  }

  private canElementConsumeWheel(
    element: HTMLElement,
    axis: 'horizontal' | 'vertical',
    delta: number,
  ): boolean {
    const current = axis === 'vertical' ? element.scrollTop : element.scrollLeft;
    const maximum =
      axis === 'vertical'
        ? element.scrollHeight - element.clientHeight
        : element.scrollWidth - element.clientWidth;
    if (maximum <= 1) {
      return false;
    }

    const styles = getComputedStyle(element);
    const overflow = axis === 'vertical' ? styles.overflowY : styles.overflowX;
    if (!/(auto|scroll|overlay)/.test(overflow)) {
      return false;
    }

    return maximum > 1 && (delta < 0 ? current > 0 : current < maximum);
  }

  private scrollElementBy(
    element: HTMLElement,
    axis: 'horizontal' | 'vertical',
    delta: number,
  ): boolean {
    const current = axis === 'vertical' ? element.scrollTop : element.scrollLeft;
    const maximum = Math.max(
      0,
      axis === 'vertical'
        ? element.scrollHeight - element.clientHeight
        : element.scrollWidth - element.clientWidth,
    );
    const next = Math.min(maximum, Math.max(0, current + delta));
    if (Math.abs(next - current) < 0.01) {
      return false;
    }

    if (axis === 'vertical') {
      element.scrollTop = next;
    } else {
      element.scrollLeft = next;
    }
    return true;
  }

  private normalizeWheelDelta(delta: number, deltaMode: number, pageSize: number): number {
    if (deltaMode === 1) {
      return delta * 16;
    }
    if (deltaMode === 2) {
      return delta * Math.max(pageSize, 1);
    }
    return delta;
  }

  private scheduleGeometrySync(): void {
    if (this.geometryFrameId !== undefined) {
      return;
    }

    this.geometryFrameId = requestAnimationFrame(() => {
      this.geometryFrameId = undefined;
      this.syncGeometry();
    });
  }

  private showBar(): void {
    if (this.nativeScrollbars || (this.disableVertical && this.disableHorizontal)) {
      return;
    }

    this.hostEl.classList.add('so-scrolling');
    this.clearHideTimer();
    if (this.draggingY || this.draggingX) {
      return;
    }
    this.hideTimer = setTimeout(() => {
      this.hostEl.classList.remove('so-scrolling');
      this.hideTimer = undefined;
    }, this.autoHideDelay);
  }

  private hideBar(): void {
    if (this.draggingY || this.draggingX) {
      return;
    }
    this.hostEl.classList.remove('so-scrolling');
    this.clearHideTimer();
  }

  private clearHideTimer(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
    }
  }

  private updateVerticalThumb(): void {
    const vertical = this.verticalScroller;
    const bar = this.barYRef.nativeElement;
    const thumb = this.thumbYRef.nativeElement;

    if (!vertical || this.disableVertical) {
      this.hostEl.classList.remove('so-has-overflow-y');
      bar.style.opacity = '0';
      bar.style.pointerEvents = 'none';
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = vertical;
    const hasOverflow = scrollHeight > clientHeight + 1;

    if (!hasOverflow) {
      this.hostEl.classList.remove('so-has-overflow-y');
      this.verticalThumbSize = clientHeight;
      thumb.style.height = `${clientHeight}px`;
      thumb.style.transform = 'translateY(0)';
      bar.style.opacity = '0';
      bar.style.pointerEvents = 'none';
      return;
    }

    this.hostEl.classList.add('so-has-overflow-y');
    bar.style.opacity = '';
    bar.style.pointerEvents = 'auto';

    const trackHeight = this.getVerticalTrackHeight(clientHeight);
    const thumbHeight = Math.max(this.minThumbSize, (trackHeight * clientHeight) / scrollHeight);
    this.verticalThumbSize = thumbHeight;
    thumb.style.height = `${thumbHeight}px`;

    const maxThumbOffset = Math.max(1, trackHeight - thumbHeight);
    const maxScrollTop = Math.max(1, scrollHeight - clientHeight);
    const offset = (scrollTop / maxScrollTop) * maxThumbOffset;
    thumb.style.transform = `translateY(${offset}px)`;
  }

  private updateHorizontalThumb(): void {
    const horizontal = this.horizontalScroller;
    const bar = this.barXRef.nativeElement;
    const thumb = this.thumbXRef.nativeElement;

    if (!horizontal || this.disableHorizontal) {
      this.hostEl.classList.remove('so-has-overflow-x');
      bar.style.opacity = '0';
      bar.style.pointerEvents = 'none';
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = horizontal;
    const hasOverflow = scrollWidth > clientWidth + 1;

    if (!hasOverflow) {
      this.hostEl.classList.remove('so-has-overflow-x');
      this.horizontalThumbSize = clientWidth;
      thumb.style.width = `${clientWidth}px`;
      thumb.style.transform = 'translateX(0)';
      bar.style.opacity = '0';
      bar.style.pointerEvents = 'none';
      return;
    }

    this.hostEl.classList.add('so-has-overflow-x');
    bar.style.opacity = '';
    bar.style.pointerEvents = 'auto';

    const trackWidth = this.getHorizontalTrackWidth(clientWidth);
    const thumbWidth = Math.max(this.minThumbSize, (trackWidth * clientWidth) / scrollWidth);
    this.horizontalThumbSize = thumbWidth;
    thumb.style.width = `${thumbWidth}px`;

    const maxThumbOffset = Math.max(1, trackWidth - thumbWidth);
    const maxScrollLeft = Math.max(1, scrollWidth - clientWidth);
    const offset = (scrollLeft / maxScrollLeft) * maxThumbOffset;
    thumb.style.transform = `translateX(${offset}px)`;
  }

  private getVerticalTrackHeight(clientHeight: number): number {
    return this.verticalBarHeight > 0 ? this.verticalBarHeight : clientHeight;
  }

  private getHorizontalTrackWidth(clientWidth: number): number {
    if (this.horizontalBarWidth > 0) {
      return this.horizontalBarWidth;
    }

    if (this.hasVerticalScrollOverflow() && !this.disableVertical) {
      return Math.max(0, clientWidth - this.trackSize - this.horizontalBarGap);
    }

    return clientWidth;
  }

  private updateThumbs(): void {
    this.updateHorizontalThumb();
    this.updateVerticalThumb();
  }

  private syncGeometry(): void {
    this.syncColumnTemplate();
    this.updateScrollAreaDimensions();

    // Crucial for grid alignment: prevent CSS Grid from squashing fixed tracks
    // by allowing the table to expand naturally to the grid's max-content width.
    if (this.hostEl.hasAttribute('data-so-table')) {
      const table = this.hostEl.querySelector('table') as HTMLElement;
      if (table) {
        table.style.width = 'max-content';
        table.style.minWidth = '100%';
        const thead = table.querySelector('thead') as HTMLElement;
        const tbody = table.querySelector('tbody') as HTMLElement;
        if (thead) thead.style.width = '100%';
        if (tbody) tbody.style.width = '100%';
      }
    }

    const hostRect = this.getSafeRect(this.hostEl);
    this.verticalBarHeight = 0;
    this.horizontalBarWidth = 0;

    // Primero actualizar overflow horizontal (.so-has-overflow-x controla padding-bottom) antes de medir el vertical
    const hasHorizontalOverflow = this.hasHorizontalScrollOverflow();
    this.hostEl.classList.toggle('so-has-overflow-x', hasHorizontalOverflow);
    const hasVerticalOverflow = this.hasVerticalScrollOverflow();

    let horizontalRect: DOMRect | null = null;
    let horizontalBarTop: number | null = null;
    if (this.horizontalScroller && !this.disableHorizontal) {
      horizontalRect = this.getSafeRect(this.horizontalScroller);
      horizontalBarTop = horizontalRect.top - hostRect.top + horizontalRect.height - this.trackSize;
    }

    if (this.verticalScroller && !this.disableVertical) {
      const verticalRect = this.getSafeRect(this.verticalScroller);
      const barY = this.barYRef.nativeElement;

      let headerOffset = 0;
      // Only apply header offset if the vertical scroller is the entire scroll area (meaning it includes the header)
      if (this.tableHead && this.verticalScroller === this.scrollAreaRef?.nativeElement) {
        headerOffset = this.tableHead.offsetHeight;
      }

      const barTop = verticalRect.top - hostRect.top + headerOffset;
      barY.style.top = `${barTop}px`;

      // Ajustar altura si hay overflow horizontal para evitar colisión
      let barHeight = verticalRect.height - headerOffset;
      if (hasHorizontalOverflow && horizontalBarTop !== null) {
        barHeight = Math.max(0, horizontalBarTop - barTop - this.verticalBarGap);
      }
      this.verticalBarHeight = barHeight;
      barY.style.height = `${barHeight}px`;
    }

    if (horizontalRect && !this.disableHorizontal) {
      const barX = this.barXRef.nativeElement;

      const leftPosition = horizontalRect.left - hostRect.left;
      barX.style.left = `${leftPosition}px`;
      const horizontalBarVisualTop =
        horizontalBarTop ??
        horizontalRect.top - hostRect.top + horizontalRect.height - this.trackSize;
      barX.style.top = `${horizontalBarVisualTop}px`;

      // Calcular ancho disponible desde la posición left hasta el borde derecho del host
      let barWidth = hostRect.width - leftPosition;

      if (hasVerticalOverflow && !this.disableVertical) {
        const horizontalInset = this.trackSize + this.horizontalBarGap;
        barWidth = Math.max(0, barWidth - horizontalInset);
      }
      this.horizontalBarWidth = barWidth;
      barX.style.width = `${barWidth}px`;
    }

    this.updateThumbs();
  }

  private hasVerticalScrollOverflow(): boolean {
    if (!this.verticalScroller || this.disableVertical) {
      return false;
    }
    const { scrollHeight, clientHeight } = this.verticalScroller;
    return scrollHeight > clientHeight + 1;
  }

  private hasHorizontalScrollOverflow(): boolean {
    if (!this.horizontalScroller || this.disableHorizontal) {
      return false;
    }
    const { scrollWidth, clientWidth } = this.horizontalScroller;
    return scrollWidth > clientWidth + 1;
  }

  private updateVerticalMaxHeight(value: string | null): void {
    if (!this.verticalScroller) {
      return;
    }

    if (!value) {
      this.verticalScroller.style.removeProperty('--so-body-height');
      this.verticalScroller.style.removeProperty('max-height');
      this.verticalScroller.style.removeProperty('height');
      this.verticalScroller.style.removeProperty('min-height');
      return;
    }

    const isTableScroller =
      this.hostEl?.hasAttribute('data-so-table') || this.verticalScroller.nodeName === 'TBODY';

    this.verticalScroller.style.setProperty('--so-body-height', value);
    this.verticalScroller.style.maxHeight = value;
    if (isTableScroller) {
      this.verticalScroller.style.height = value;
      this.verticalScroller.style.minHeight = value;
    } else {
      this.verticalScroller.style.height = 'auto';
      this.verticalScroller.style.minHeight = '0px';
    }
  }

  private updateScrollAreaOverflow(): void {
    const scrollArea = this.scrollAreaRef?.nativeElement;
    if (!scrollArea) {
      return;
    }

    const shouldAllowVerticalScroll =
      this.disableVertical || !this.verticalScroller || this.verticalScroller === scrollArea;
    scrollArea.style.overflowY = shouldAllowVerticalScroll ? 'auto' : 'hidden';
  }

  private applyVerticalScrollerDefaults(): void {
    if (!this.verticalScroller) {
      return;
    }

    if (this.verticalScroller === this.scrollAreaRef.nativeElement) {
      this.verticalScroller.style.overflowY = 'auto';
      return;
    }

    const nodeName = this.verticalScroller.nodeName;
    const style = this.verticalScroller.style;
    if (nodeName === 'TBODY') {
      style.display = 'block';
      style.overflowY = 'auto';
      style.overflowX = 'hidden';
      style.boxSizing = 'border-box';
    }
  }

  /**
   * Keeps native scrollbars hidden while the custom overlay owns the scroller.
   * This marker remains stable even when table measurement temporarily removes
   * the axis attribute, avoiding a native scrollbar flash and layout shift.
   */
  private markManagedScrollbar(element: HTMLElement | undefined): void {
    if (!element || element.hasAttribute('data-so-managed-scrollbar')) {
      return;
    }

    element.setAttribute('data-so-managed-scrollbar', 'true');
    element.setAttribute('data-so-managed-scrollbar-temp', 'true');
  }

  private updateNativeScrollbarMarkers(): void {
    this.removeNativeScrollbarMarkers();
    if (!this.nativeScrollbars) {
      return;
    }

    const owners = new Set([
      this.scrollAreaRef.nativeElement,
      this.verticalScroller,
      this.horizontalScroller,
    ]);
    owners.forEach((owner) => {
      if (!owner) {
        return;
      }
      owner.setAttribute('data-so-native-scrollbar', 'true');
      owner.setAttribute('data-so-native-scrollbar-temp', 'true');
    });
  }

  private removeNativeScrollbarMarkers(): void {
    if (!this.hostEl) {
      return;
    }
    this.hostEl.querySelectorAll('[data-so-native-scrollbar-temp]').forEach((element) => {
      if (element.closest('.so-root') !== this.hostEl) {
        return;
      }
      element.removeAttribute('data-so-native-scrollbar');
      element.removeAttribute('data-so-native-scrollbar-temp');
    });
  }

  private removeManagedScrollbarMarker(element: HTMLElement | undefined): void {
    if (!element?.hasAttribute('data-so-managed-scrollbar-temp')) {
      return;
    }

    element.removeAttribute('data-so-managed-scrollbar');
    element.removeAttribute('data-so-managed-scrollbar-temp');
  }

  private normalizeCssSize(value: number | string | undefined): string | null {
    if (value === undefined) {
      return null;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return `${value}px`;
    }

    const stringValue = String(value).trim();
    if (!stringValue) {
      return null;
    }

    const numericPattern = /^-?\d+(?:\.\d+)?$/;
    if (numericPattern.test(stringValue)) {
      return `${stringValue}px`;
    }

    return stringValue;
  }

  private updateScrollAreaDimensions(): void {
    const scrollArea = this.scrollAreaRef?.nativeElement;
    if (!scrollArea) {
      return;
    }

    // Ensure scroll area can expand horizontally but respects container width
    if (this.horizontalScroller === scrollArea) {
      const hostRect = this.getSafeRect(this.hostEl);
      if (hostRect.width > 0) {
        scrollArea.style.maxWidth = '100%';
        scrollArea.style.width = '100%';
      }
    }

    // For table mode, ensure proper width calculation
    if (this.hostEl.hasAttribute('data-so-table')) {
      this.updateTableDimensions();
    }
  }

  private updateTableDimensions(): void {
    const table = this.hostEl.querySelector('table') as HTMLElement;
    if (!table) {
      return;
    }

    // When lockColumnTemplate is true the user has provided an explicit pixel-based
    // template. Avoid setting width: max-content on the table because that would
    // cause fr-unit tracks (if present) to expand to cell max-content sizes and
    // shift column positions whenever translated text changes length.
    if (this._lockColumnTemplate) {
      table.style.minWidth = '100%';
      const hasFrUnits = this._columnTemplate ? this._columnTemplate.includes('fr') : false;
      table.style.width = hasFrUnits ? 'auto' : 'max-content';

      const thead = table.querySelector('thead') as HTMLElement;
      const tbody = table.querySelector('tbody') as HTMLElement;
      if (thead && tbody) {
        thead.style.width = '100%';
        tbody.style.width = '100%';
      }
      return;
    }

    // Auto-sync mode: let the table size itself by content so fr tracks expand.
    table.style.width = 'max-content';
    table.style.minWidth = '100%';

    // Ensure thead and tbody match the table width
    const thead = table.querySelector('thead') as HTMLElement;
    const tbody = table.querySelector('tbody') as HTMLElement;

    if (thead && tbody) {
      thead.style.width = '100%';
      tbody.style.width = '100%';

      // Re-measure column widths after the layout settles
      requestAnimationFrame(() => {
        this.syncColumnTemplate();
      });
    }
  }

  private ensureSingleScrollbar(): void {
    if (!this.verticalScroller || this.disableVertical) {
      return;
    }

    const host = this.hostEl;
    const scrollableCandidates = Array.from(host.querySelectorAll('[data-so-vertical]')).filter(
      (element) => element.closest('.so-root') === host,
    ) as HTMLElement[];
    const duplicates = scrollableCandidates.filter((el) => el !== this.verticalScroller);
    duplicates.forEach((el) => {
      if (el.hasAttribute('data-so-vertical-temp')) {
        el.removeAttribute('data-so-vertical');
        el.removeAttribute('data-so-vertical-temp');
      }
      el.style.removeProperty('--so-body-height');
      el.style.removeProperty('max-height');
      el.style.removeProperty('height');
      el.style.removeProperty('min-height');
      el.style.removeProperty('overflow-y');
      el.style.removeProperty('overflow-x');
      el.style.removeProperty('box-sizing');
    });
  }

  private syncColumnTemplate(): void {
    if (
      !this.syncTableColumns ||
      this._lockColumnTemplate ||
      !this.headerRow ||
      !this.verticalScroller ||
      this.verticalScroller.tagName !== 'TBODY'
    ) {
      if (!this._lockColumnTemplate) {
        this.hostEl.style.removeProperty('--so-column-template');
        this._lastColumnTemplate = '';
      }
      return;
    }

    const headerCells = Array.from(this.headerRow.children) as HTMLElement[];
    if (!headerCells.length) return;

    // 1. Revert to native HTML table layout to let the browser perfectly
    // calculate max-content widths for all cells based on actual content
    const hadSync = this.hostEl.hasAttribute('data-so-sync-columns');
    const hadTable = this.hostEl.hasAttribute('data-so-table');
    const hadVertical = this.verticalScroller.hasAttribute('data-so-vertical');

    this.hostEl.removeAttribute('data-so-sync-columns');
    this.hostEl.removeAttribute('data-so-table');
    this.verticalScroller.removeAttribute('data-so-vertical');

    // 2. We MUST force the table to size to its content, not the container
    const table = this.hostEl.querySelector('table') as HTMLElement;
    const oldTableWidth = table.style.width;
    table.style.width = 'max-content';

    // 3. Force browser layout recalculation
    void this.hostEl.offsetHeight;

    // 4. Measure the natural widths determined by the browser's native table algorithm
    // (Native table ensures thead and tbody align, so measuring thead is enough)
    const widths = headerCells.map((cell) => {
      const rect = this.getSafeRect(cell);
      return Math.max(this._minColumnWidth, Math.ceil(rect.width));
    });

    // 5. Restore grid layout attributes and properties
    if (hadSync) this.hostEl.setAttribute('data-so-sync-columns', 'true');
    if (hadTable) this.hostEl.setAttribute('data-so-table', 'true');
    if (hadVertical) this.verticalScroller.setAttribute('data-so-vertical', 'true');
    table.style.width = oldTableWidth;

    // 6. Lock the exact pixel widths so thead and tbody align perfectly
    const template = widths.map((width) => `${width}px`).join(' ');

    // 7. Only apply if changed to prevent ResizeObserver infinite loops
    if (this._lastColumnTemplate !== template) {
      this._lastColumnTemplate = template;
      this.hostEl.style.setProperty('--so-column-template', template);
    }
  }

  private getSafeRect(element: Element | null): DOMRect {
    if (element && typeof (element as HTMLElement).getBoundingClientRect === 'function') {
      return (element as HTMLElement).getBoundingClientRect();
    }

    const fallback = element as HTMLElement | null;
    const width = fallback?.offsetWidth ?? 0;
    const height = fallback?.offsetHeight ?? 0;

    return {
      top: 0,
      left: 0,
      bottom: height,
      right: width,
      width,
      height,
      x: 0,
      y: 0,
      toJSON() {
        return '';
      },
    } as DOMRect;
  }

  private startDragY(event: PointerEvent): void {
    if (
      event.button === 1 ||
      event.button === 2 ||
      !this.verticalScroller ||
      this.disableVertical
    ) {
      return;
    }

    this.draggingY = true;
    this.dragPointerIdY = event.pointerId;
    this.dragStartClientY = event.clientY;
    this.dragStartScrollTop = this.verticalScroller.scrollTop;
    this.thumbYRef.nativeElement.setPointerCapture(event.pointerId);
    this.showBar();
    event.preventDefault();
  }

  private moveDragY(event: PointerEvent): void {
    if (!this.draggingY || !this.verticalScroller || this.disableVertical) {
      return;
    }

    const maxScrollTop = Math.max(
      1,
      this.verticalScroller.scrollHeight - this.verticalScroller.clientHeight,
    );
    const trackHeight = this.getVerticalTrackHeight(this.verticalScroller.clientHeight);
    const maxThumbOffset = Math.max(1, trackHeight - this.verticalThumbSize);
    const delta = event.clientY - this.dragStartClientY;
    const scrollDelta = (delta * maxScrollTop) / maxThumbOffset;
    this.verticalScroller.scrollTop = this.dragStartScrollTop + scrollDelta;
    this.showBar();
    event.preventDefault();
  }

  private endDragY(_event: PointerEvent): void {
    if (!this.draggingY) {
      return;
    }

    this.draggingY = false;
    if (
      this.dragPointerIdY !== undefined &&
      this.thumbYRef.nativeElement.hasPointerCapture?.(this.dragPointerIdY)
    ) {
      this.thumbYRef.nativeElement.releasePointerCapture(this.dragPointerIdY);
    }
    this.dragPointerIdY = undefined;
    this.showBar();
  }

  private startDragX(event: PointerEvent): void {
    if (
      event.button === 1 ||
      event.button === 2 ||
      !this.horizontalScroller ||
      this.disableHorizontal
    ) {
      return;
    }

    this.draggingX = true;
    this.dragPointerIdX = event.pointerId;
    this.dragStartClientX = event.clientX;
    this.dragStartScrollLeft = this.horizontalScroller.scrollLeft;
    this.thumbXRef.nativeElement.setPointerCapture(event.pointerId);
    this.showBar();
    event.preventDefault();
  }

  private moveDragX(event: PointerEvent): void {
    if (!this.draggingX || !this.horizontalScroller || this.disableHorizontal) {
      return;
    }

    const maxScrollLeft = Math.max(
      1,
      this.horizontalScroller.scrollWidth - this.horizontalScroller.clientWidth,
    );
    const trackWidth = this.getHorizontalTrackWidth(this.horizontalScroller.clientWidth);
    const maxThumbOffset = Math.max(1, trackWidth - this.horizontalThumbSize);
    const delta = event.clientX - this.dragStartClientX;
    const scrollDelta = (delta * maxScrollLeft) / maxThumbOffset;
    this.horizontalScroller.scrollLeft = this.dragStartScrollLeft + scrollDelta;
    this.showBar();
    event.preventDefault();
  }

  private endDragX(_event: PointerEvent): void {
    if (!this.draggingX) {
      return;
    }

    this.draggingX = false;
    if (
      this.dragPointerIdX !== undefined &&
      this.thumbXRef.nativeElement.hasPointerCapture?.(this.dragPointerIdX)
    ) {
      this.thumbXRef.nativeElement.releasePointerCapture(this.dragPointerIdX);
    }
    this.dragPointerIdX = undefined;
    this.showBar();
  }
}
