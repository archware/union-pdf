import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from './toast.component';

describe('ToastComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ToastComponent] }).compileComponents();
  });

  function mockPopover(host: HTMLElement): { isOpen: () => boolean; show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> } {
    let open = false;
    const show = vi.fn(() => { open = true; });
    const hide = vi.fn(() => { open = false; });
    Object.defineProperties(host, {
      showPopover: { configurable: true, value: show },
      hidePopover: { configurable: true, value: hide },
    });
    vi.spyOn(host, 'matches').mockImplementation(selector =>
      selector === ':popover-open' ? open : false
    );
    return { isOpen: () => open, show, hide };
  }

  it('promotes notifications to the browser top layer', async () => {
    const fixture = TestBed.createComponent(ToastComponent);
    const popover = mockPopover(fixture.nativeElement);
    fixture.detectChanges();
    TestBed.inject(ToastService).success('Operacion confirmada.', 0);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.getAttribute('popover')).toBe('manual');
    expect(popover.show).toHaveBeenCalledOnce();
    expect(popover.isOpen()).toBe(true);
    expect(fixture.nativeElement.querySelector('.toast-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('removes the top-layer region when notifications are cleared', async () => {
    const fixture = TestBed.createComponent(ToastComponent);
    const popover = mockPopover(fixture.nativeElement);
    const service = TestBed.inject(ToastService);
    fixture.detectChanges();
    service.error('No fue posible completar la operacion.', 0);
    fixture.detectChanges();
    await fixture.whenStable();
    service.clear();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(popover.show).toHaveBeenCalledOnce();
    expect(popover.hide).toHaveBeenCalledOnce();
    expect(popover.isOpen()).toBe(false);
  });
});
