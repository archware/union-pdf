import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { ScrollOverlayComponent } from '../../organisms/scroll-overlay/scroll-overlay.component';
import { TableCellComponent } from './table-cell.component';
import { TableComponent, type TableScrollbarMode } from './table.component';

@Component({
  standalone: true,
  imports: [TableComponent, TableCellComponent],
  template: `
    <app-table
      [unifiedScroll]="true"
      [maxHeight]="240"
      [ariaLabel]="'Vista previa de movimientos'"
      [scrollResetKey]="resetKey()"
      [scrollbarMode]="scrollbarMode()"
      cellOverflow="truncate"
    >
      <thead>
        <tr>
          <th scope="col">Descripción</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td app-table-cell dataLabel="Descripción" [wrap]="true">Compra extensa</td>
        </tr>
      </tbody>
    </app-table>
  `,
})
class UnifiedTableHostComponent {
  readonly resetKey = signal('dataset-a');
  readonly scrollbarMode = signal<TableScrollbarMode>('native');
}

@Component({
  standalone: true,
  imports: [TableComponent, TableCellComponent],
  template: `
    <app-table
      [unifiedScroll]="true"
      [maxHeight]="240"
      [ariaLabel]="'Movimientos con indicadores overlay'"
      scrollbarMode="overlay"
    >
      <thead>
        <tr>
          <th scope="col">Descripción</th>
          <th scope="col">Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td app-table-cell dataLabel="Descripción">Compra extensa</td>
          <td app-table-cell dataLabel="Importe">120.00</td>
        </tr>
      </tbody>
    </app-table>
  `,
})
class OverlayTableHostComponent {}

describe('TableComponent unified viewport', () => {
  const originalMatchMedia = window.matchMedia;
  let responsiveMatches = false;
  let responsiveListener: ((event: MediaQueryListEvent) => void) | undefined;
  let removeResponsiveListener: Mock;

  beforeEach(async () => {
    removeResponsiveListener = vi.fn();
    window.matchMedia = vi.fn(
      (query: string): MediaQueryList =>
        ({
          matches: responsiveMatches,
          media: query,
          onchange: null,
          addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
            responsiveListener = listener as (event: MediaQueryListEvent) => void;
          },
          removeEventListener: removeResponsiveListener,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    );

    await TestBed.configureTestingModule({
      imports: [UnifiedTableHostComponent, OverlayTableHostComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    responsiveMatches = false;
    responsiveListener = undefined;
  });

  it('uses the native internal viewport as the only desktop scroll owner', async () => {
    const fixture = TestBed.createComponent(UnifiedTableHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const overlayDebug = fixture.debugElement.query(By.directive(ScrollOverlayComponent));
    const overlay = overlayDebug.componentInstance as ScrollOverlayComponent;
    const viewport = fixture.nativeElement.querySelector('.so-scroll-area') as HTMLElement;

    expect(overlay.disableVertical).toBe(false);
    expect(overlay.disableHorizontal).toBe(false);
    expect(overlay.nativeScrollbars).toBe(true);
    expect(overlay.verticalSelector).toBeNull();
    expect(viewport.getAttribute('role')).toBe('region');
    expect(viewport.getAttribute('aria-label')).toBe('Vista previa de movimientos');
    expect(viewport.tabIndex).toBe(0);
    expect(viewport.getAttribute('data-so-native-scrollbar')).toBe('true');
    const root = fixture.nativeElement.querySelector('app-scroll-overlay') as HTMLElement;
    const header = fixture.nativeElement.querySelector('th') as HTMLTableCellElement;
    const wrappedCell = fixture.nativeElement.querySelector('td') as HTMLTableCellElement;
    expect(root.classList).toContain('atomic-table-truncate-cells');
    expect(getComputedStyle(header).whiteSpace).toBe('nowrap');
    expect(wrappedCell.classList).toContain('atomic-table-cell-wrap');
    const wrapRuleText = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
      .map((rule) => rule.cssText)
      .find(
        (text) => text.includes('.atomic-table-cell-wrap') && text.includes('white-space: normal'),
      );
    expect(wrapRuleText).toContain('white-space: normal');
  });

  it('keeps the Atomic overlay rails active on a bounded desktop viewport', async () => {
    const fixture = TestBed.createComponent(OverlayTableHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const overlayDebug = fixture.debugElement.query(By.directive(ScrollOverlayComponent));
    const overlay = overlayDebug.componentInstance as ScrollOverlayComponent;
    const root = overlayDebug.nativeElement as HTMLElement;
    const viewport = fixture.nativeElement.querySelector('.so-scroll-area') as HTMLElement;

    expect(overlay.disableVertical).toBe(false);
    expect(overlay.disableHorizontal).toBe(false);
    expect(overlay.nativeScrollbars).toBe(false);
    expect(overlay.verticalSelector).toBeNull();
    expect(root.classList).toContain('atomic-table-bounded-scroll');
    expect(root.classList).not.toContain('so-no-vertical');
    expect(root.classList).not.toContain('so-no-horizontal');
    expect(root.classList).not.toContain('so-native-scrollbars');
    expect(viewport.getAttribute('role')).toBe('region');
    expect(viewport.getAttribute('aria-label')).toBe('Movimientos con indicadores overlay');
    expect(viewport.tabIndex).toBe(0);
    expect(viewport.getAttribute('data-so-managed-scrollbar')).toBe('true');
    expect(viewport.hasAttribute('data-so-native-scrollbar')).toBe(false);
  });

  it('switches from native presentation to overlay without changing the scroll owner', async () => {
    const fixture = TestBed.createComponent(UnifiedTableHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const overlayDebug = fixture.debugElement.query(By.directive(ScrollOverlayComponent));
    const overlay = overlayDebug.componentInstance as ScrollOverlayComponent;
    const root = overlayDebug.nativeElement as HTMLElement;
    const viewport = fixture.nativeElement.querySelector('.so-scroll-area') as HTMLElement;

    expect(overlay.verticalSelector).toBeNull();
    expect(root.classList).toContain('so-native-scrollbars');
    expect(viewport.getAttribute('data-so-native-scrollbar')).toBe('true');

    fixture.componentInstance.scrollbarMode.set('overlay');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(overlay.verticalSelector).toBeNull();
    expect(overlay.nativeScrollbars).toBe(false);
    expect(root.classList).not.toContain('so-native-scrollbars');
    expect(viewport.hasAttribute('data-so-native-scrollbar')).toBe(false);
    expect(viewport.getAttribute('data-so-managed-scrollbar')).toBe('true');
  });

  it('resets horizontal and vertical positions when the dataset identity changes', async () => {
    const fixture = TestBed.createComponent(UnifiedTableHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const viewport = fixture.nativeElement.querySelector('.so-scroll-area') as HTMLElement;
    viewport.scrollTop = 90;
    viewport.scrollLeft = 140;

    fixture.componentInstance.resetKey.set('dataset-b');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(viewport.scrollTop).toBe(0);
    expect(viewport.scrollLeft).toBe(0);
  });

  it('hands ownership to the page at 768px or less without changing table semantics', async () => {
    responsiveMatches = true;
    const fixture = TestBed.createComponent(UnifiedTableHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const table = fixture.nativeElement.querySelector('table') as HTMLTableElement;
    const viewport = fixture.nativeElement.querySelector('.so-scroll-area') as HTMLElement;
    const cell = fixture.nativeElement.querySelector('td') as HTMLTableCellElement;

    expect(table).toBeTruthy();
    expect(table.querySelector('thead')).toBeTruthy();
    expect(table.querySelector('tbody')).toBeTruthy();
    expect(cell.getAttribute('data-label')).toBe('Descripción');
    expect(viewport.hasAttribute('role')).toBe(false);
    expect(viewport.hasAttribute('aria-label')).toBe(false);
    expect(viewport.hasAttribute('tabindex')).toBe(false);
    const header = table.querySelector('th') as HTMLTableCellElement;
    expect(header.scope).toBe('col');
    expect(header.hasAttribute('aria-hidden')).toBe(false);

    const responsiveRuleText = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule)
      .filter((rule) => rule.conditionText.includes('max-width: 768px'))
      .flatMap((rule) => Array.from(rule.cssRules))
      .map((rule) => rule.cssText)
      .find((text) => text.includes('.atomic-table thead') && text.includes('clip-path'));
    expect(responsiveRuleText).toContain('inset(50%)');
    expect(responsiveRuleText).not.toContain('display: none');
  });

  it('moves the accessible owner when the responsive media query changes', async () => {
    const fixture = TestBed.createComponent(UnifiedTableHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const viewport = fixture.nativeElement.querySelector('.so-scroll-area') as HTMLElement;
    expect(viewport.getAttribute('role')).toBe('region');

    responsiveListener?.({ matches: true } as MediaQueryListEvent);
    fixture.detectChanges();

    expect(viewport.hasAttribute('role')).toBe(false);
    expect(viewport.hasAttribute('tabindex')).toBe(false);

    fixture.destroy();
    expect(removeResponsiveListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
