import { Component, ChangeDetectionStrategy, ElementRef, afterRenderEffect, inject } from '@angular/core';

import { PopupService, PopupItem } from '../../services/popup.service';
import { ScrollOverlayComponent } from '../../organisms/scroll-overlay/scroll-overlay.component';

/**
 * Contenedor de popups global.
 * Debe colocarse en el nivel raíz del app (app.component o app.html).
 * Lee los popups del PopupService y los renderiza como modales.
 * 
 * @example
 * ```html
 * <!-- En app.html o app.component -->
 * <app-popup-container></app-popup-container>
 * ```
 */
@Component({
  selector: 'app-popup-container',
  standalone: true,
  imports: [ScrollOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (popup of popupService.popups(); track popup.id) {
      <div 
        class="popup-overlay" 
        [class.popup-closing]="popup.closing"
        (click)="onBackdropClick(popup)"
        (keydown.escape)="onEscape(popup, $event)"
        tabindex="0"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="'popup-title-' + popup.id"
      >
        <div 
          class="popup" 
          [class]="'popup-' + popup.size + ' popup-type-' + popup.type"
          (click)="$event.stopPropagation()"
          (keydown.escape)="onEscape(popup, $event)"
          (keydown)="$event.stopPropagation()"
          tabindex="-1"
        >
          <!-- Header -->
          <div class="popup-header">
            @if (popup.icon) {
              <span class="popup-icon" [class]="'popup-icon-' + popup.type">
                <i [class]="popup.icon"></i>
              </span>
            }
            <h3 class="popup-title" [id]="'popup-title-' + popup.id">{{ popup.title }}</h3>
            @if (popup.closable) {
              <button class="popup-close" (click)="onDismiss(popup)" type="button" aria-label="Cerrar">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            }
          </div>

          <!-- Body -->
          <app-scroll-overlay class="so-block popup-body-scroll" [skipTableDetection]="true" [disableHorizontal]="true">
            <div class="popup-body">
              @if (popup.message) {
                <p class="popup-message">{{ popup.message }}</p>
              }
              @if (popup.htmlContent) {
                <div [innerHTML]="popup.htmlContent"></div>
              }
            </div>
          </app-scroll-overlay>

          <!-- Footer -->
          @if (popup.buttons && popup.buttons.length > 0) {
            <div class="popup-footer">
              @for (button of popup.buttons; track button.label) {
                <button 
                  type="button"
                  class="popup-btn"
                  [class]="'popup-btn-' + (button.variant || 'primary')"
                  [attr.data-autofocus]="button.autofocus ? '' : null"
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
    .popup-overlay {
      position: fixed;
      inset: 0;
      background: var(--overlay-backdrop);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: popupFadeIn 150ms ease;
    }

    .popup-overlay.popup-closing {
      animation: popupFadeOut 200ms ease forwards;
    }

    @keyframes popupFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes popupFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    .popup {
      background: var(--surface-background);
      border-radius: var(--radius-lg);
      width: 90%;
      box-shadow: var(--shadow-xl);
      animation: popupSlideUp 200ms ease;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      overflow: hidden;
    }

    .popup-closing .popup {
      animation: popupSlideDown 200ms ease forwards;
    }

    @keyframes popupSlideUp {
      from { transform: translateY(20px) scale(0.95); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

    @keyframes popupSlideDown {
      from { transform: translateY(0) scale(1); opacity: 1; }
      to { transform: translateY(20px) scale(0.95); opacity: 0; }
    }

    /* Sizes */
    .popup-sm { max-width: 360px; }
    .popup-md { max-width: 450px; }
    .popup-lg { max-width: 600px; }

    /* Header */
    .popup-header {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-5);
      border-bottom: 1px solid var(--border-color);
    }

    .popup-icon {
      font-size: var(--text-2xl);
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--space-10);
      height: var(--space-10);
      border-radius: var(--radius-full);
      flex-shrink: 0;
    }

    .popup-icon-info { background: var(--info-color-light); color: var(--info-color-dark); }
    .popup-icon-success { background: var(--success-color-light); color: var(--success-color-dark); }
    .popup-icon-warning { background: var(--warning-color-light); color: var(--warning-color-dark); }
    .popup-icon-error { background: var(--danger-color-light); color: var(--danger-color-dark); }
    .popup-icon-confirm { background: var(--primary-color-lighter); color: var(--primary-color); }

    .popup-title {
      flex: 1;
      margin: 0;
      font-size: var(--text-lg);
      font-weight: var(--font-weight-emphasis);
      color: var(--text-color);
    }

    .popup-close {
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

    .popup-close:hover {
      background: var(--surface-hover);
      color: var(--text-color);
    }

    /* Body */
    .popup-body-scroll {
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
    }

    .popup-body {
      padding: var(--space-5);
    }

    .popup-message {
      margin: 0;
      font-size: var(--text-md);
      color: var(--text-color-secondary);
      line-height: 1.6;
    }

    /* Footer */
    .popup-footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5);
      border-top: 1px solid var(--border-color);
    }

    .popup-btn {
      padding: var(--space-2) var(--space-4);
      font-size: var(--text-sm);
      font-weight: var(--font-weight-body);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 150ms ease;
    }

    .popup-btn-primary {
      background: var(--primary-color);
      color: var(--text-color-on-primary);
    }

    .popup-btn-primary:hover {
      background: var(--primary-color-dark);
    }

    .popup-btn-secondary {
      background: var(--surface-hover);
      color: var(--text-color);
    }

    .popup-btn-secondary:hover {
      background: var(--border-color);
    }

    .popup-btn-danger {
      background: var(--danger-color);
      color: var(--gray-0);
    }

    .popup-btn-danger:hover {
      background: var(--danger-color-dark);
    }

    .popup-btn-ghost {
      background: transparent;
      color: var(--text-color-secondary);
    }

    .popup-btn-ghost:hover {
      background: var(--surface-hover);
      color: var(--text-color);
    }
  `]
})
export class PopupContainerComponent {
  protected readonly popupService = inject(PopupService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private focused = new Set<number>();

  constructor() {
    /*
    EL FOCO EMPIEZA EN LA SALIDA SEGURA.

    Sin esto el foco se queda donde estaba —o en el fondo del dialogo, que lleva
    `tabindex="0"`—, y quien navega con teclado tiene que adivinar donde esta.
    Se mueve al boton marcado `autofocus`, que en un `confirm` es «Cancelar».

    Una sola vez por popup: repetirlo en cada repintado arrancaria el foco de
    donde lo haya puesto la persona.
    */
    afterRenderEffect(() => {
      const abiertos = this.popupService.popups();
      const vivos = new Set(abiertos.map(popup => popup.id));
      this.focused = new Set([...this.focused].filter(id => vivos.has(id)));

      const ultimo = abiertos[abiertos.length - 1];
      if (!ultimo || ultimo.closing || this.focused.has(ultimo.id)) {
        return;
      }
      const root = this.host.nativeElement as HTMLElement;
      const overlays = root.querySelectorAll('.popup-overlay');
      const overlay = overlays[overlays.length - 1];
      const objetivo =
        overlay?.querySelector<HTMLElement>('[data-autofocus]') ??
        overlay?.querySelector<HTMLElement>('.popup-btn');
      if (objetivo) {
        objetivo.focus();
        this.focused.add(ultimo.id);
      }
    });
  }

  onBackdropClick(popup: PopupItem): void {
    if (popup.closeOnBackdrop) {
      this.popupService.close(popup.id);
    }
  }

  /*
  ESCAPE NO ES UN CIERRE MUDO.

  Se cerraba el popup sin ejecutar nada. Quien lo abrio se queda esperando una
  respuesta que no va a llegar: el boton sigue en «Anulando…», la fila sigue
  bloqueada, y no hay forma de saber que la persona dijo que no.

  Si hay un boton que cancela, Escape hace exactamente lo que ese boton.
  */
  onEscape(popup: PopupItem, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.onDismiss(popup);
  }

  /**
   * Escape y la aspa representan la misma decisión: cancelar cuando el popup
   * expone esa salida, o cerrar un aviso meramente informativo.
   */
  onDismiss(popup: PopupItem): void {
    const cancelButton = popup.buttons?.find(button => button.cancels);
    if (cancelButton) {
      cancelButton.action();
      return;
    }
    if (popup.closable) {
      this.popupService.close(popup.id);
    }
  }
}

/*
NOTA SOBRE LO QUE SE QUITO: `onEnter`.

Ejecutaba el boton primario —el que hace la cosa— desde el fondo del dialogo,
que es lo que tenia el foco. Un Intro por inercia, arrastrado del formulario
anterior, confirmaba. La doctrina lo nombra como contraejemplo.

Ahora el foco arranca en el boton marcado `autofocus` (por defecto el de
cancelar) y el Intro lo pulsa el navegador, sobre el boton que la persona ve
enfocado.
*/
