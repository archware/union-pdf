import {
  afterNextRender,
  AfterRenderRef,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { ScrollOverlayComponent } from '../../organisms/scroll-overlay/scroll-overlay.component';

const MODAL_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

const MODAL_ERROR_SELECTOR = [
  '[data-modal-error]',
  '[data-dialog-error]',
  '[role="alert"]',
  '[aria-invalid="true"]'
].join(',');

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [ScrollOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-overlay"
      (pointerdown)="onBackdropClick($event)"
    >
      <div #dialogRef class="modal"
        (pointerdown)="$event.stopPropagation()"
        (keydown)="onOverlayKeydown($event)"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        [attr.aria-labelledby]="titleId"
        [attr.aria-busy]="busy ? 'true' : null"
        [class.modal-sm]="size === 'sm'"
        [class.modal-md]="size === 'md'"
        [class.modal-lg]="size === 'lg'"
      >
        <!-- Header -->
        <div class="modal-header">
          <h3 class="modal-title" [id]="titleId">{{ title }}</h3>
          <button
            class="modal-close"
            (click)="requestClose()"
            type="button"
            aria-label="Cerrar"
            [disabled]="busy"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <!-- Body -->
        <app-scroll-overlay class="so-block modal-body-scroll" [skipTableDetection]="true" [disableHorizontal]="true">
          <div class="modal-body">
            <ng-content></ng-content>
          </div>
        </app-scroll-overlay>

        <!-- Footer -->
        @if (hasFooter) {
        <div class="modal-footer">
          <ng-content select="[slot=footer]"></ng-content>
        </div>
        }
      </div>
    </div>
  `,
  styles: [`
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: var(--overlay-backdrop);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 150ms ease;
        overflow: hidden;
        padding: var(--space-6) var(--space-4);
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .modal {
        background: var(--surface-background);
        border-radius: var(--radius-lg);
        width: 90%;
        box-shadow: var(--shadow-xl);
        animation: slideUp 200ms ease;
        display: flex;
        flex-direction: column;
        margin: auto;
        position: relative;
        max-height: calc(100dvh - var(--space-8));
        overflow: hidden;
      }

    /* Sizes */
    .modal-sm { max-width: 400px; }
    .modal-md { max-width: 550px; }
    .modal-lg { max-width: 800px; }

    /* En móvil el modal ocupa casi todo el ancho y se ancla al fondo */
      @media (max-width: 479px) {
        .modal-overlay {
          align-items: flex-end;
          padding: 0;
        }

        .modal {
          width: 100%;
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          margin: 0;
          margin-top: auto;
          max-height: calc(100dvh - var(--space-4));
        }

        .modal-body {
          padding-bottom: max(var(--space-5), env(safe-area-inset-bottom));
        }

        .modal-footer {
          padding-bottom: max(var(--space-5), env(safe-area-inset-bottom));
        }

      .modal-sm,
      .modal-md,
      .modal-lg {
        max-width: 100%;
      }
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4) var(--space-5);
      border-bottom: 1px solid var(--border-color);
    }

    .modal-title {
      font-size: var(--text-lg);
      font-weight: 600;
      color: var(--text-color);
      margin: 0;
    }

    .modal-close {
      width: var(--control-height-sm);
      height: var(--control-height-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--text-2xl);
      color: var(--text-color-secondary);
      background: transparent;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 150ms ease;
    }

    .modal-close:hover {
      background: var(--surface-hover);
      color: var(--text-color);
    }

      .modal-body-scroll {
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
      }

      .modal-body {
        padding: var(--space-5);
      }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5);
      border-top: 1px solid var(--border-color);
    }

    .modal-close:disabled {
      color: var(--text-color-muted);
      cursor: not-allowed;
    }

    .modal-close:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }

    @media (prefers-reduced-motion: reduce) {
      .modal-overlay,
      .modal {
        animation: none;
      }
    }

    /*
     * Dark mode se maneja automáticamente via tokens semánticos.
     * --surface-background, --overlay-backdrop, --surface-hover
     * ya tienen valores apropiados para temas oscuros.
     */
  `]
})
export class ModalComponent implements AfterViewInit, OnDestroy {
  private static instanceCounter = 0;
  readonly titleId = `atomic-modal-title-${++ModalComponent.instanceCounter}`;

  @ViewChild('dialogRef', { read: ElementRef })
  private dialogRef?: ElementRef<HTMLElement>;

  private readonly injector = inject(Injector);
  private previouslyFocused: HTMLElement | null = null;
  private pendingErrorFocus?: AfterRenderRef;

  @Input() title = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() closeOnBackdrop = true;
  @Input() hasFooter = true;
  @Input() busy = false;

  @Output() closed = new EventEmitter<void>();

  ngAfterViewInit(): void {
    if (typeof document === 'undefined') return;
    const activeElement = document.activeElement;
    this.previouslyFocused = activeElement instanceof HTMLElement ? activeElement : null;
    queueMicrotask(() => this.focusInitialControl());
  }

  ngOnDestroy(): void {
    this.pendingErrorFocus?.destroy();
    this.pendingErrorFocus = undefined;
    if (this.previouslyFocused?.isConnected) {
      this.previouslyFocused.focus({ preventScroll: true });
    }
  }

  onBackdropClick(event?: Event): void {
    if (event && event.target !== event.currentTarget) return;
    if (!this.busy && this.closeOnBackdrop) {
      this.requestClose();
    }
  }

  onEscape(): void {
    if (!this.busy && this.closeOnBackdrop) {
      this.closed.emit();
    }
  }

  /** Requests closure only when the dialog is not processing an action. */
  requestClose(): void {
    if (!this.busy) {
      this.closed.emit();
    }
  }

  /**
   * Focuses the first projected operation error after an asynchronous failure.
   * If Angular has not rendered the feedback yet, the component retries once
   * after the pending render so callers do not need timing workarounds.
   */
  focusError(): boolean {
    const focused = this.tryFocusError();
    if (focused) {
      this.pendingErrorFocus?.destroy();
      this.pendingErrorFocus = undefined;
      return true;
    }

    this.pendingErrorFocus?.destroy();
    this.pendingErrorFocus = afterNextRender({
      write: () => {
        this.pendingErrorFocus = undefined;
        this.tryFocusError();
      },
    }, { injector: this.injector });
    return false;
  }

  private tryFocusError(): boolean {
    const dialog = this.dialogRef?.nativeElement;
    const errorRoot = dialog?.querySelector<HTMLElement>(MODAL_ERROR_SELECTOR);
    if (!errorRoot) return false;

    const target = errorRoot.matches(MODAL_FOCUSABLE_SELECTOR)
      ? errorRoot
      : errorRoot.querySelector<HTMLElement>(MODAL_FOCUSABLE_SELECTOR) ?? errorRoot;
    if (!target.hasAttribute('tabindex') && !target.matches(MODAL_FOCUSABLE_SELECTOR)) {
      target.tabIndex = -1;
    }
    target.focus({ preventScroll: true });
    return true;
  }

  onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.onEscape();
      return;
    }
    if (event.key === 'Tab') this.trapFocus(event);
  }

  private focusInitialControl(): void {
    const dialog = this.dialogRef?.nativeElement;
    if (!dialog) return;
    const preferredRoot = dialog.querySelector<HTMLElement>('[data-modal-initial-focus]');
    const preferred = preferredRoot?.matches(MODAL_FOCUSABLE_SELECTOR)
      ? preferredRoot
      : preferredRoot?.querySelector<HTMLElement>(MODAL_FOCUSABLE_SELECTOR);
    const target = preferred ?? dialog.querySelector<HTMLElement>(MODAL_FOCUSABLE_SELECTOR) ?? dialog;
    target.focus({ preventScroll: true });
  }

  private trapFocus(event: KeyboardEvent): void {
    const dialog = this.dialogRef?.nativeElement;
    if (!dialog) return;
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>(MODAL_FOCUSABLE_SELECTOR))
      .filter(control => !control.hasAttribute('hidden') && control.getAttribute('aria-hidden') !== 'true');

    if (controls.length === 0) {
      event.preventDefault();
      dialog.focus({ preventScroll: true });
      return;
    }

    const first = controls[0];
    const last = controls[controls.length - 1];
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }
}
