import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ScrollOverlayComponent } from './scroll-overlay.component';

@Component({
  standalone: true,
  imports: [ScrollOverlayComponent],
  template: `
    <app-scroll-overlay
      class="outer-overlay"
      horizontalSelector=".outer-horizontal"
      verticalSelector=".outer-vertical"
    >
      <div class="outer-horizontal">
        <div class="outer-vertical">
          <app-scroll-overlay class="inner-overlay">
            <div>Contenido interno</div>
          </app-scroll-overlay>
        </div>
      </div>
    </app-scroll-overlay>
  `,
})
class NestedScrollOverlayHostComponent {}

describe('ScrollOverlayComponent', () => {
  const originalResizeObserver = globalThis.ResizeObserver;
  const originalMutationObserver = globalThis.MutationObserver;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

  let resizeCallback: ResizeObserverCallback;
  let mutationCallback: MutationCallback;
  let pendingFrame: FrameRequestCallback | undefined;

  const setScrollMetrics = (
    element: HTMLElement,
    metrics: Partial<
      Pick<HTMLElement, 'clientHeight' | 'clientWidth' | 'scrollHeight' | 'scrollWidth'>
    >,
  ): void => {
    for (const [property, value] of Object.entries(metrics)) {
      Object.defineProperty(element, property, { configurable: true, value });
    }
    Object.defineProperty(element, 'scrollTop', {
      configurable: true,
      value: element.scrollTop,
      writable: true,
    });
    Object.defineProperty(element, 'scrollLeft', {
      configurable: true,
      value: element.scrollLeft,
      writable: true,
    });
  };

  const setRect = (
    element: HTMLElement,
    width: number,
    height: number,
    left = 0,
    top = 0,
  ): void => {
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      x: left,
      y: top,
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      toJSON: () => '',
    } as DOMRect);
  };

  beforeEach(async () => {
    globalThis.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
    globalThis.MutationObserver = class {
      constructor(callback: MutationCallback) {
        mutationCallback = callback;
      }
      observe(): void {}
      disconnect(): void {}
      takeRecords(): MutationRecord[] {
        return [];
      }
    };
    globalThis.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      pendingFrame = callback;
      return 17;
    });
    globalThis.cancelAnimationFrame = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ScrollOverlayComponent, NestedScrollOverlayHostComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
    globalThis.MutationObserver = originalMutationObserver;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it('coalesces resize and row mutations into one geometry pass per frame', async () => {
    const fixture = TestBed.createComponent(ScrollOverlayComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const component = fixture.componentInstance as unknown as {
      syncGeometry: () => void;
    };
    const geometrySpy = vi.spyOn(component, 'syncGeometry');
    const frameCountBeforeObservers = (globalThis.requestAnimationFrame as Mock).mock.calls.length;

    resizeCallback([], {} as ResizeObserver);
    mutationCallback([], {} as MutationObserver);
    mutationCallback([], {} as MutationObserver);

    expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(frameCountBeforeObservers + 1);
    pendingFrame?.(16);
    expect(geometrySpy).toHaveBeenCalledTimes(1);
  });

  it('hides native scrollbars on every custom scroller managed by the overlay', async () => {
    const fixture = TestBed.createComponent(NestedScrollOverlayHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const horizontal = fixture.nativeElement.querySelector('.outer-horizontal') as HTMLElement;
    const vertical = fixture.nativeElement.querySelector('.outer-vertical') as HTMLElement;

    expect(horizontal.getAttribute('data-so-managed-scrollbar')).toBe('true');
    expect(vertical.getAttribute('data-so-managed-scrollbar')).toBe('true');
    expect(getComputedStyle(horizontal).getPropertyValue('scrollbar-width')).toBe('none');
    expect(getComputedStyle(vertical).getPropertyValue('scrollbar-width')).toBe('none');
  });

  it('drags both overlay rails through the complete unified viewport', async () => {
    const fixture = TestBed.createComponent(ScrollOverlayComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const viewport = host.querySelector('.so-scroll-area') as HTMLElement;
    const verticalRail = host.querySelector('.so-scrollbar-y') as HTMLElement;
    const horizontalRail = host.querySelector('.so-scrollbar-x') as HTMLElement;
    const verticalThumb = host.querySelector('.so-thumb-y') as HTMLElement;
    const horizontalThumb = host.querySelector('.so-thumb-x') as HTMLElement;
    setScrollMetrics(viewport, {
      clientHeight: 220,
      clientWidth: 360,
      scrollHeight: 880,
      scrollWidth: 1080,
    });
    setRect(host, 360, 220);
    setRect(viewport, 360, 220);
    Object.defineProperty(verticalThumb, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(horizontalThumb, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });

    const component = fixture.componentInstance as unknown as { syncGeometry: () => void };
    component.syncGeometry();

    expect(host.classList).toContain('so-has-overflow-y');
    expect(host.classList).toContain('so-has-overflow-x');
    expect(getComputedStyle(verticalRail).display).toBe('block');
    expect(getComputedStyle(horizontalRail).display).toBe('block');
    expect(parseFloat(verticalThumb.style.height)).toBeGreaterThan(0);
    expect(parseFloat(horizontalThumb.style.width)).toBeGreaterThan(0);

    const verticalTravel =
      parseFloat(verticalRail.style.height) - parseFloat(verticalThumb.style.height);
    const horizontalTravel =
      parseFloat(horizontalRail.style.width) - parseFloat(horizontalThumb.style.width);
    expect(verticalTravel).toBeGreaterThan(0);
    expect(horizontalTravel).toBeGreaterThan(0);

    verticalThumb.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientY: 0,
        pointerId: 1,
      }),
    );
    verticalThumb.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientY: verticalTravel,
        pointerId: 1,
      }),
    );
    expect(viewport.scrollTop).toBeCloseTo(660, 2);

    horizontalThumb.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: 0,
        pointerId: 2,
      }),
    );
    horizontalThumb.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: horizontalTravel,
        pointerId: 2,
      }),
    );
    expect(viewport.scrollLeft).toBeCloseTo(720, 2);
  });

  it('auto-hides active overflow rails at rest and elevates to full opacity while scrolling or hovered', async () => {
    const fixture = TestBed.createComponent(ScrollOverlayComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const viewport = host.querySelector('.so-scroll-area') as HTMLElement;
    const verticalRail = host.querySelector('.so-scrollbar-y') as HTMLElement;
    const horizontalRail = host.querySelector('.so-scrollbar-x') as HTMLElement;

    setScrollMetrics(viewport, {
      clientHeight: 200,
      clientWidth: 300,
      scrollHeight: 200,
      scrollWidth: 300,
    });
    setRect(host, 300, 200);
    setRect(viewport, 300, 200);

    const component = fixture.componentInstance as unknown as {
      syncGeometry: () => void;
    };
    component.syncGeometry();

    expect(host.classList).not.toContain('so-has-overflow-y');
    expect(getComputedStyle(verticalRail).display).toBe('none');
    expect(getComputedStyle(horizontalRail).display).toBe('none');

    setScrollMetrics(viewport, {
      clientHeight: 200,
      clientWidth: 300,
      scrollHeight: 600,
      scrollWidth: 300,
    });
    component.syncGeometry();
    host.dispatchEvent(new MouseEvent('mouseleave'));

    expect(host.classList).toContain('so-has-overflow-y');
    expect(host.classList).not.toContain('so-variant-brand');
    expect(host.classList).not.toContain('so-scrolling');
    expect(getComputedStyle(verticalRail).display).toBe('block');
    expect(parseFloat(getComputedStyle(verticalRail).opacity)).toBeCloseTo(0, 2);
    expect(getComputedStyle(verticalRail).pointerEvents).toBe('auto');

    fixture.componentRef.setInput('variant', 'brand');
    fixture.detectChanges();
    expect(host.classList).toContain('so-variant-brand');
    const restingOpacity = getComputedStyle(verticalRail)
      .opacity.trim()
      .replace(/^var\(\s*--so-resting-opacity\s*,\s*([^)]+)\)$/, '$1');
    expect(parseFloat(restingOpacity)).toBeCloseTo(0.68, 2);

    fixture.componentRef.setInput('variant', 'default');
    fixture.detectChanges();
    expect(host.classList).not.toContain('so-variant-brand');
    expect(parseFloat(getComputedStyle(verticalRail).opacity)).toBeCloseTo(0, 2);

    fixture.componentRef.setInput('variant', 'brand');
    fixture.detectChanges();
    expect(host.classList).toContain('so-variant-brand');

    host.dispatchEvent(new MouseEvent('mouseenter'));
    expect(host.classList).toContain('so-scrolling');
    expect(parseFloat(getComputedStyle(verticalRail).opacity)).toBeCloseTo(1, 2);
  });

  it('does not remove managed-axis markers from a nested overlay', async () => {
    const fixture = TestBed.createComponent(NestedScrollOverlayHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const innerRoot = fixture.nativeElement.querySelector('.inner-overlay') as HTMLElement;
    const innerScrollArea = innerRoot.querySelector('.so-scroll-area') as HTMLElement;

    expect(innerScrollArea.getAttribute('data-so-horizontal')).toBe('true');
    expect(innerScrollArea.getAttribute('data-so-vertical')).toBe('true');
    expect(innerScrollArea.getAttribute('data-so-managed-scrollbar')).toBe('true');
  });

  it('uses one accessible native viewport and suppresses both overlay rails', async () => {
    const fixture = TestBed.createComponent(ScrollOverlayComponent);
    fixture.componentRef.setInput('nativeScrollbars', true);
    fixture.componentRef.setInput('disableVertical', true);
    fixture.componentRef.setInput('disableHorizontal', true);
    fixture.componentRef.setInput('scrollAreaAriaLabel', 'Resultados de búsqueda');
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const viewport = host.querySelector('.so-scroll-area') as HTMLElement;
    const verticalRail = host.querySelector('.so-scrollbar-y') as HTMLElement;
    const horizontalRail = host.querySelector('.so-scrollbar-x') as HTMLElement;

    expect(host.classList).toContain('so-native-scrollbars');
    expect(viewport.getAttribute('data-so-native-scrollbar')).toBe('true');
    expect(getComputedStyle(viewport).getPropertyValue('scrollbar-width')).toBe('thin');
    expect(viewport.getAttribute('role')).toBe('region');
    expect(viewport.getAttribute('aria-label')).toBe('Resultados de búsqueda');
    expect(viewport.tabIndex).toBe(0);
    expect(getComputedStyle(verticalRail).display).toBe('none');
    expect(getComputedStyle(horizontalRail).display).toBe('none');
  });

  it('resets both axes of the resolved viewport when resetKey changes', async () => {
    const fixture = TestBed.createComponent(ScrollOverlayComponent);
    fixture.componentRef.setInput('nativeScrollbars', true);
    fixture.componentRef.setInput('resetKey', 'dataset-a');
    fixture.detectChanges();
    await fixture.whenStable();

    const viewport = fixture.nativeElement.querySelector('.so-scroll-area') as HTMLElement;
    setScrollMetrics(viewport, {
      clientHeight: 200,
      clientWidth: 200,
      scrollHeight: 800,
      scrollWidth: 900,
    });
    viewport.scrollTop = 170;
    viewport.scrollLeft = 240;

    fixture.componentRef.setInput('resetKey', 'dataset-b');
    fixture.detectChanges();

    expect(viewport.scrollTop).toBe(0);
    expect(viewport.scrollLeft).toBe(0);
  });

  it('leaves wheel gestures to the browser in native mode', async () => {
    const fixture = TestBed.createComponent(ScrollOverlayComponent);
    fixture.componentRef.setInput('nativeScrollbars', true);
    fixture.detectChanges();
    await fixture.whenStable();
    const viewport = fixture.nativeElement.querySelector('.so-scroll-area') as HTMLElement;
    setScrollMetrics(viewport, { clientHeight: 200, scrollHeight: 800 });

    const wheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120 });
    viewport.dispatchEvent(wheel);

    expect(wheel.defaultPrevented).toBe(false);
    expect(viewport.scrollTop).toBe(0);
  });

  it('cleans native ownership markers when toggled and destroyed', async () => {
    const fixture = TestBed.createComponent(ScrollOverlayComponent);
    fixture.componentRef.setInput('nativeScrollbars', true);
    fixture.detectChanges();
    await fixture.whenStable();
    const viewport = fixture.nativeElement.querySelector('.so-scroll-area') as HTMLElement;
    expect(viewport.getAttribute('data-so-native-scrollbar')).toBe('true');

    fixture.componentRef.setInput('nativeScrollbars', false);
    fixture.detectChanges();
    expect(viewport.hasAttribute('data-so-native-scrollbar')).toBe(false);

    fixture.componentRef.setInput('nativeScrollbars', true);
    fixture.detectChanges();
    expect(viewport.getAttribute('data-so-native-scrollbar')).toBe('true');

    fixture.destroy();
    expect(viewport.hasAttribute('data-so-native-scrollbar')).toBe(false);
  });

  it('routes wheel gestures from projected content to the managed viewport', async () => {
    const fixture = TestBed.createComponent(ScrollOverlayComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const viewport = fixture.nativeElement.querySelector('.so-scroll-area') as HTMLElement;
    setScrollMetrics(viewport, { clientHeight: 200, scrollHeight: 800 });

    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    });
    viewport.dispatchEvent(wheel);

    expect(viewport.scrollTop).toBe(120);
    expect(wheel.defaultPrevented).toBe(true);
  });

  it('leaves Ctrl and Meta wheel gestures to browser zoom and pinch handling', async () => {
    const fixture = TestBed.createComponent(ScrollOverlayComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const viewport = fixture.nativeElement.querySelector('.so-scroll-area') as HTMLElement;
    setScrollMetrics(viewport, { clientHeight: 200, scrollHeight: 800 });

    for (const modifier of [{ ctrlKey: true }, { metaKey: true }]) {
      viewport.scrollTop = 0;
      const wheel = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: 120,
        ...modifier,
      });
      viewport.dispatchEvent(wheel);

      expect(viewport.scrollTop).toBe(0);
      expect(wheel.defaultPrevented).toBe(false);
    }
  });

  it('uses Shift plus wheel for horizontal movement', async () => {
    const fixture = TestBed.createComponent(ScrollOverlayComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const viewport = fixture.nativeElement.querySelector('.so-scroll-area') as HTMLElement;
    setScrollMetrics(viewport, { clientWidth: 200, scrollWidth: 800 });

    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 90,
      shiftKey: true,
    });
    viewport.dispatchEvent(wheel);

    expect(viewport.scrollLeft).toBe(90);
    expect(wheel.defaultPrevented).toBe(true);
  });

  it('routes a negative wheel delta toward the beginning of the viewport', async () => {
    const fixture = TestBed.createComponent(ScrollOverlayComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const viewport = fixture.nativeElement.querySelector('.so-scroll-area') as HTMLElement;
    setScrollMetrics(viewport, { clientHeight: 200, scrollHeight: 800 });
    viewport.scrollTop = 180;

    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: -70,
    });
    viewport.dispatchEvent(wheel);

    expect(viewport.scrollTop).toBe(110);
    expect(wheel.defaultPrevented).toBe(true);
  });

  it('keeps nested native scroll ownership and chains at its edge', async () => {
    const fixture = TestBed.createComponent(ScrollOverlayComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const viewport = fixture.nativeElement.querySelector('.so-scroll-area') as HTMLElement;
    const nested = document.createElement('div');
    nested.style.overflowY = 'auto';
    viewport.append(nested);
    setScrollMetrics(viewport, { clientHeight: 200, scrollHeight: 800 });
    setScrollMetrics(nested, { clientHeight: 100, scrollHeight: 500 });

    const nestedWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 80,
    });
    nested.dispatchEvent(nestedWheel);

    expect(nestedWheel.defaultPrevented).toBe(false);
    expect(viewport.scrollTop).toBe(0);

    nested.scrollTop = 400;
    const boundaryWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 80,
    });
    nested.dispatchEvent(boundaryWheel);

    expect(boundaryWheel.defaultPrevented).toBe(true);
    expect(viewport.scrollTop).toBe(80);
  });

  it('resyncs geometry when projected images finish loading or new content children appear', async () => {
    const observedElements: Element[] = [];
    globalThis.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }
      observe(target: Element): void {
        observedElements.push(target);
      }
      unobserve(): void {}
      disconnect(): void {}
    };

    const fixture = TestBed.createComponent(ScrollOverlayComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const viewport = host.querySelector('.so-scroll-area') as HTMLElement;
    const contentBox = document.createElement('div');
    const img = document.createElement('img');
    contentBox.append(img);
    viewport.append(contentBox);

    mutationCallback([], {} as MutationObserver);
    expect(observedElements).toContain(contentBox);

    const component = fixture.componentInstance as unknown as {
      syncGeometry: () => void;
    };
    const geometrySpy = vi.spyOn(component, 'syncGeometry');
    pendingFrame?.(16);
    geometrySpy.mockClear();

    img.dispatchEvent(new Event('load'));
    pendingFrame?.(32);
    expect(geometrySpy).toHaveBeenCalledTimes(1);
  });

  it('keeps scrollbar visible when pointer moves from viewport onto rail and jumps on rail click', async () => {
    const fixture = TestBed.createComponent(ScrollOverlayComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const viewport = host.querySelector('.so-scroll-area') as HTMLElement;
    const verticalRail = host.querySelector('.so-scrollbar-y') as HTMLElement;
    setScrollMetrics(viewport, {
      clientHeight: 200,
      clientWidth: 300,
      scrollHeight: 1000,
      scrollWidth: 300,
    });
    setRect(host, 300, 200);
    setRect(viewport, 300, 200);
    setRect(verticalRail, 7, 200);

    const component = fixture.componentInstance as unknown as { syncGeometry: () => void };
    component.syncGeometry();

    host.dispatchEvent(new MouseEvent('mouseenter'));
    expect(host.classList).toContain('so-scrolling');

    viewport.dispatchEvent(
      new MouseEvent('mouseleave', {
        relatedTarget: verticalRail,
      }),
    );
    expect(host.classList).toContain('so-scrolling');

    verticalRail.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientY: 100,
        button: 0,
      }),
    );
    expect(viewport.scrollTop).toBeGreaterThan(300);
  });

  it('does not leak outer overflow state to a nested scroll-overlay rail', async () => {
    const fixture = TestBed.createComponent(NestedScrollOverlayHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const outerRoot = fixture.nativeElement.querySelector('.outer-overlay') as HTMLElement;
    const outerVertical = fixture.nativeElement.querySelector('.outer-vertical') as HTMLElement;
    const innerRoot = fixture.nativeElement.querySelector('.inner-overlay') as HTMLElement;
    const innerVerticalRail = innerRoot.querySelector(':scope > .so-scrollbar-y') as HTMLElement;

    setScrollMetrics(outerVertical, {
      clientHeight: 200,
      scrollHeight: 900,
    });
    outerRoot.classList.add('so-has-overflow-y');
    innerRoot.classList.remove('so-has-overflow-y');

    expect(getComputedStyle(innerVerticalRail).display).toBe('none');
  });
});
