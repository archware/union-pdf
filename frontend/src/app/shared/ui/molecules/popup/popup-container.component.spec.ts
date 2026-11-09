import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PopupService } from '../../services/popup.service';
import { PopupContainerComponent } from './popup-container.component';

describe('PopupContainerComponent', () => {
  let fixture: ComponentFixture<PopupContainerComponent>;
  let popupService: PopupService;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({ imports: [PopupContainerComponent] }).compileComponents();
    fixture = TestBed.createComponent(PopupContainerComponent);
    popupService = TestBed.inject(PopupService);
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  function abrirConfirmacion(onCancel: () => void): void {
    popupService.confirm({
      title: 'Anular la solicitud 118',
      message: 'La solicitud deja de poder aprobarse.',
      confirmLabel: 'Anular la solicitud',
      tone: 'danger',
      onConfirm: () => undefined,
      onCancel,
    });
    fixture.detectChanges();
  }

  it('ejecuta la cancelacion con Escape desde el boton que recibe el foco', () => {
    let cancelaciones = 0;
    abrirConfirmacion(() => (cancelaciones += 1));
    const cancelar = fixture.nativeElement.querySelector('[data-autofocus]') as HTMLButtonElement;
    cancelar.focus();
    expect(document.activeElement).toBe(cancelar);

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    cancelar.dispatchEvent(escape);

    expect(escape.defaultPrevented).toBe(true);
    expect(cancelaciones).toBe(1);
    expect(popupService.popups()[0].closing).toBe(true);
    vi.advanceTimersByTime(200);
    expect(popupService.popups()).toEqual([]);
  });

  it('ejecuta la misma cancelacion al cerrar con la aspa', () => {
    let cancelaciones = 0;
    abrirConfirmacion(() => (cancelaciones += 1));
    const close = fixture.nativeElement.querySelector('.popup-close') as HTMLButtonElement;
    close.click();

    expect(cancelaciones).toBe(1);
    expect(popupService.popups()[0].closing).toBe(true);
    vi.advanceTimersByTime(200);
    expect(popupService.popups()).toEqual([]);
  });

  it('nombra el dialogo con su titulo visible', () => {
    abrirConfirmacion(() => undefined);
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    const labelledBy = dialog.getAttribute('aria-labelledby');
    const title = fixture.nativeElement.querySelector(`#${labelledBy}`) as HTMLElement;

    expect(labelledBy).toBe(`popup-title-${popupService.popups()[0].id}`);
    expect(title?.textContent?.trim()).toBe('Anular la solicitud 118');
  });
});
