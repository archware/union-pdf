import { Component, ChangeDetectionStrategy, inject, ViewChildren, QueryList, ElementRef, effect } from '@angular/core';

import { ModalService, ModalItem } from '../../services/modal.service';
import { ScrollOverlayComponent } from '../../organisms/scroll-overlay/scroll-overlay.component';

/**
 * Contenedor de modales global.
 * Debe colocarse en el nivel raíz del app (app.component o app.html).
 * Lee los modales del ModalService y los renderiza.
 * 
 * @example
 * ```html
 * <!-- En app.html o app.component -->
 * <app-modal-container></app-modal-container>
 * ```
 */
@Component({
  selector: 'app-modal-container',
  standalone: true,
  imports: [ScrollOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (modal of modalService.modals(); track modal.id; let first = $first) {
      <div 
        class="modal-overlay" 
        [class.modal-closing]="modal.closing"
        (click)="onBackdropClick(modal)"
        (keydown.escape)="onEscape(modal)"
        (keydown.enter)="onEnter(modal)"
        tabindex="-1"
      >
        <div 
          #modalElement
          class="modal" 
          [class]="'modal-' + modal.size"
          [class.modal-exit]="modal.closing"
          (click)="$event.stopPropagation()"
          (keydown)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'modal-title-' + modal.id"
          tabindex="-1"
        >
          <!-- Header -->
          <div class="modal-header">
            <h3 class="modal-title" [id]="'modal-title-' + modal.id">{{ modal.title }}</h3>
            @if (modal.closable) {
              <button #closeButton class="modal-close" (click)="modalService.close(modal.id)" type="button" aria-label="Cerrar">
                <i class="fa-solid fa-xmark"></i>
              </button>
            }
          </div>

          <!-- Body -->
          <app-scroll-overlay class="so-block modal-body-scroll" [skipTableDetection]="true" [disableHorizontal]="true">
            <div class="modal-body">
              @if (modal.message) {
                <p class="modal-message">{{ modal.message }}</p>
              }
              @if (modal.htmlContent) {
                <div [innerHTML]="modal.htmlContent"></div>
              }
            </div>
          </app-scroll-overlay>

          <!-- Footer -->
          @if (modal.hasFooter && modal.buttons && modal.buttons.length > 0) {
            <div class="modal-footer">
              @for (button of modal.buttons; track button.label) {
                <button 
                  type="button"
                  class="modal-btn"
                  [class]="'modal-btn-' + (button.variant || 'primary')"
                  (click)="button.action()"
                >
                  {{ button.label }}
                </button>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: var(--overlay-backdrop);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: modalFadeIn 150ms ease;
    }

    .modal-overlay.modal-closing {
      animation: modalFadeOut 200ms ease forwards;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modalFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    .modal {
      background: var(--surface-background);
      border-radius: var(--radius-lg);
      width: 90%;
      box-shadow: var(--shadow-xl);
      animation: modalSlideUp 200ms ease;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      overflow: hidden;
    }

    .modal.modal-exit {
      animation: modalSlideDown 200ms ease forwards;
    }

    @keyframes modalSlideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @keyframes modalSlideDown {
      from { transform: translateY(0); opacity: 1; }
      to { transform: translateY(20px); opacity: 0; }
    }

    /* Sizes */
    .modal-sm { max-width: 400px; }
    .modal-md { max-width: 550px; }
    .modal-lg { max-width: 800px; }
    .modal-xl { max-width: 1000px; }

    /* Header */
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4) var(--space-5);
      border-bottom: 1px solid var(--border-color);
    }

    .modal-title {
      margin: 0;
      font-size: var(--text-lg);
      font-weight: 600;
      color: var(--text-color);
    }

    .modal-close {
      width: var(--control-height-sm);
      height: var(--control-height-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--text-xl);
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

    /* Body */
    .modal-body-scroll {
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
    }

    .modal-body {
      padding: var(--space-5);
    }

    .modal-message {
      margin: 0;
      font-size: var(--text-md);
      color: var(--text-color-secondary);
      line-height: 1.6;
    }

    /* Footer */
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5);
      border-top: 1px solid var(--border-color);
    }

    .modal-btn {
      padding: var(--space-2) var(--space-4);
      font-size: var(--text-sm);
      font-weight: 500;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 150ms ease;
    }

    .modal-btn-primary {
      background: var(--primary-color);
      color: var(--text-color-on-primary);
    }

    .modal-btn-primary:hover {
      background: var(--primary-color-dark);
    }

    .modal-btn-secondary {
      background: var(--surface-hover);
      color: var(--text-color);
    }

    .modal-btn-secondary:hover {
      background: var(--border-color);
    }

    .modal-btn-danger {
      background: var(--danger-color);
      color: var(--gray-0);
    }

    .modal-btn-danger:hover {
      background: var(--danger-color-dark);
    }

    .modal-btn-ghost {
      background: transparent;
      color: var(--text-color-secondary);
    }

    .modal-btn-ghost:hover {
      background: var(--surface-hover);
      color: var(--text-color);
    }
  `]
})
export class ModalContainerComponent {
  protected readonly modalService = inject(ModalService);

  @ViewChildren('modalElement') modalElements!: QueryList<ElementRef<HTMLElement>>;

  constructor() {
    // Effect to focus the newest modal when the list changes
    effect(() => {
      const modalList = this.modalService.modals();
      if (modalList.length > 0) {
        // Wait for next tick to ensure DOM is updated
        setTimeout(() => {
          const newestModal = this.modalElements.last;
          if (newestModal) {
            // Find first focusable element (close button or first action button)
            const focusable = newestModal.nativeElement.querySelector(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            ) as HTMLElement;

            if (focusable) {
              focusable.focus();
            } else {
              newestModal.nativeElement.focus();
            }
          }
        }, 0);
      }
    });
  }

  onBackdropClick(modal: ModalItem): void {
    if (modal.closeOnBackdrop) {
      this.modalService.close(modal.id);
    }
  }

  onEscape(modal: ModalItem): void {
    if (modal.closable) {
      this.modalService.close(modal.id);
    }
  }

  onEnter(modal: ModalItem): void {
    if (modal.buttons && modal.buttons.length > 0) {
      const primaryBtn = modal.buttons.find(b => b.variant === 'primary' || !b.variant) || modal.buttons[0];
      if (primaryBtn && primaryBtn.action) {
        primaryBtn.action();
      }
    }
  }
}
