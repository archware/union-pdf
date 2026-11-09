import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  signal,
  viewChild,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'app-modal-async-error-host',
  standalone: true,
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal #dialog title="Guardar configuración">
      @if (error()) {
        <p role="alert" data-modal-error tabindex="-1">{{ error() }}</p>
      }
    </app-modal>
  `,
})
class ModalAsyncErrorHost {
  readonly error = signal('');
  readonly dialog = viewChild.required(ModalComponent);

  resolveFailure(): boolean {
    this.error.set('No fue posible guardar.');
    return this.dialog().focusError();
  }
}

describe('ModalComponent', () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;

  function setInput(name: string, value: unknown): void {
    fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalComponent, ModalAsyncErrorHost],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Title ─────────────────────────────────────────────────────────────────
  describe('title', () => {
    it('should render the title text', () => {
      setInput('title', 'Confirmar acción');
      const title: HTMLElement = fixture.nativeElement.querySelector('.modal-title');
      expect(title.textContent?.trim()).toBe('Confirmar acción');
    });
  });

  // ── Size classes ──────────────────────────────────────────────────────────
  describe('size', () => {
    it('should apply modal-md class by default', () => {
      const modal: HTMLElement = fixture.nativeElement.querySelector('.modal');
      expect(modal.classList.contains('modal-md')).toBe(true);
    });

    it('should apply modal-sm class for size sm', () => {
      setInput('size', 'sm');
      const modal: HTMLElement = fixture.nativeElement.querySelector('.modal');
      expect(modal.classList.contains('modal-sm')).toBe(true);
    });

    it('should apply modal-lg class for size lg', () => {
      setInput('size', 'lg');
      const modal: HTMLElement = fixture.nativeElement.querySelector('.modal');
      expect(modal.classList.contains('modal-lg')).toBe(true);
    });
  });

  // ── Close events ──────────────────────────────────────────────────────────
  describe('closed event', () => {
    it('should emit closed when the X button is clicked', () => {
      let emitted = false;
      component.closed.subscribe(() => { emitted = true; });

      const closeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.modal-close');
      closeBtn.click();

      expect(emitted).toBe(true);
    });

    it('should emit closed on backdrop click when closeOnBackdrop=true', () => {
      let emitted = false;
      setInput('closeOnBackdrop', true);
      component.closed.subscribe(() => { emitted = true; });

      component.onBackdropClick();

      expect(emitted).toBe(true);
    });

    it('should NOT emit closed on backdrop click when closeOnBackdrop=false', () => {
      let emitted = false;
      setInput('closeOnBackdrop', false);
      component.closed.subscribe(() => { emitted = true; });

      component.onBackdropClick();

      expect(emitted).toBe(false);
    });

    it('should emit closed on Escape when closeOnBackdrop=true', () => {
      let emitted = false;
      setInput('closeOnBackdrop', true);
      component.closed.subscribe(() => { emitted = true; });

      component.onEscape();

      expect(emitted).toBe(true);
    });

    it('should NOT emit closed on Escape when closeOnBackdrop=false', () => {
      let emitted = false;
      setInput('closeOnBackdrop', false);
      component.closed.subscribe(() => { emitted = true; });

      component.onEscape();

      expect(emitted).toBe(false);
    });

    it('blocks close controls, Escape and backdrop while an async action is busy', () => {
      let emissions = 0;
      component.closed.subscribe(() => { emissions += 1; });
      setInput('busy', true);

      const modal = fixture.nativeElement.querySelector('.modal') as HTMLElement;
      const closeBtn = fixture.nativeElement.querySelector('.modal-close') as HTMLButtonElement;
      closeBtn.click();
      component.onEscape();
      component.onBackdropClick();

      expect(modal.getAttribute('aria-busy')).toBe('true');
      expect(closeBtn.disabled).toBe(true);
      expect(emissions).toBe(0);
    });
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  describe('footer', () => {
    it('should render footer section when hasFooter=true', () => {
      setInput('hasFooter', true);
      const footer = fixture.nativeElement.querySelector('.modal-footer');
      expect(footer).not.toBeNull();
    });

    it('should hide footer section when hasFooter=false', () => {
      setInput('hasFooter', false);
      const footer = fixture.nativeElement.querySelector('.modal-footer');
      expect(footer).toBeNull();
    });
  });

  // ── Accessibility ─────────────────────────────────────────────────────────
  describe('accessibility', () => {
    it('should have role="dialog" on the modal panel', () => {
      const modal: HTMLElement = fixture.nativeElement.querySelector('.modal');
      expect(modal.getAttribute('role')).toBe('dialog');
    });

    it('should have aria-modal="true" on the modal panel', () => {
      const modal: HTMLElement = fixture.nativeElement.querySelector('.modal');
      expect(modal.getAttribute('aria-modal')).toBe('true');
    });

    it('should have aria-label on the close button', () => {
      const closeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.modal-close');
      expect(closeBtn.getAttribute('aria-label')).toBeTruthy();
    });

    it('keeps the backdrop passive and labels the dialog from its visible title', () => {
      const overlay = fixture.nativeElement.querySelector('.modal-overlay') as HTMLElement;
      const modal = fixture.nativeElement.querySelector('.modal') as HTMLElement;
      const title = fixture.nativeElement.querySelector('.modal-title') as HTMLElement;

      expect(overlay.getAttribute('role')).toBeNull();
      expect(overlay.getAttribute('tabindex')).toBeNull();
      expect(modal.getAttribute('aria-labelledby')).toBe(title.id);
    });

    it('moves initial focus into the dialog', async () => {
      await Promise.resolve();

      const close = fixture.nativeElement.querySelector('.modal-close') as HTMLButtonElement;
      expect(document.activeElement).toBe(close);
    });

    it('cycles focus inside the dialog on Tab', async () => {
      await Promise.resolve();
      const close = fixture.nativeElement.querySelector('.modal-close') as HTMLButtonElement;
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });

      close.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(close);
    });

    it('restores focus when the dialog is destroyed', async () => {
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      trigger.focus();
      const localFixture = TestBed.createComponent(ModalComponent);
      localFixture.detectChanges();
      await Promise.resolve();

      localFixture.destroy();

      expect(document.activeElement).toBe(trigger);
      trigger.remove();
    });

    it('focuses the projected operation error after an async failure', () => {
      const body = fixture.nativeElement.querySelector('.modal-body') as HTMLElement;
      const error = document.createElement('div');
      error.setAttribute('role', 'alert');
      error.setAttribute('data-modal-error', '');
      error.tabIndex = -1;
      body.appendChild(error);

      expect(component.focusError()).toBe(true);
      expect(document.activeElement).toBe(error);
    });

    it('retries focus after render when async feedback is still pending', async () => {
      const hostFixture = TestBed.createComponent(ModalAsyncErrorHost);
      hostFixture.detectChanges();
      await hostFixture.whenStable();

      expect(hostFixture.componentInstance.resolveFailure()).toBe(false);
      await hostFixture.whenStable();

      const error = hostFixture.nativeElement.querySelector('[data-modal-error]') as HTMLElement;
      expect(error).not.toBeNull();
      expect(document.activeElement).toBe(error);
      hostFixture.destroy();
    });
  });
});
