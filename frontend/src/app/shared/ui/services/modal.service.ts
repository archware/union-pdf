import { Injectable, signal } from '@angular/core';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalButton {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  action: () => void;
}

export interface ModalConfig {
  id?: number;
  title: string;
  message?: string;
  htmlContent?: string;
  size?: ModalSize;
  closable?: boolean;
  closeOnBackdrop?: boolean;
  hasFooter?: boolean;
  buttons?: ModalButton[];
}

export interface ModalItem extends ModalConfig {
  id: number;
  closing?: boolean;
}

/**
 * Servicio global para mostrar modales dinámicos.
 * Inyectable en root para que sea singleton en toda la aplicación.
 * 
 * @example
 * ```typescript
 * export class MyComponent {
 *   private modal = inject(ModalService);
 * 
 *   openSettings() {
 *     this.modal.open({
 *       title: 'Configuración',
 *       message: 'Ajusta tus preferencias',
 *       buttons: [
 *         { label: 'Cancelar', variant: 'ghost', action: () => this.modal.close(id) },
 *         { label: 'Guardar', variant: 'primary', action: () => this.save() }
 *       ]
 *     });
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalId = 0;

  /** Signal público para que el componente lea los modales */
  readonly modals = signal<ModalItem[]>([]);

  /**
   * Abre un modal con la configuración especificada.
   * @returns ID del modal para poder cerrarlo programáticamente
   */
  open(config: ModalConfig): number {
    const id = ++this.modalId;
    const modal: ModalItem = {
      ...config,
      id,
      size: config.size ?? 'md',
      closable: config.closable ?? true,
      closeOnBackdrop: config.closeOnBackdrop ?? true,
      hasFooter: config.hasFooter ?? (config.buttons && config.buttons.length > 0)
    };

    this.modals.update(m => [...m, modal]);
    return id;
  }

  /**
   * Modal de confirmación simple.
   */
  confirm(options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: 'primary' | 'danger';
    onConfirm: () => void;
    onCancel?: () => void;
  }): number {
    let id = 0;
    id = this.open({
      title: options.title,
      message: options.message,
      size: 'sm',
      closeOnBackdrop: false,
      buttons: [
        {
          label: options.cancelLabel ?? 'Cancelar',
          variant: 'ghost',
          action: () => { options.onCancel?.(); this.close(id); }
        },
        {
          label: options.confirmLabel ?? 'Confirmar',
          variant: options.confirmVariant ?? 'primary',
          action: () => { options.onConfirm(); this.close(id); }
        }
      ]
    });
    return id;
  }

  /**
   * Modal de alerta simple con un solo botón.
   */
  alert(title: string, message: string, buttonLabel = 'Aceptar'): number {
    let id = 0;
    id = this.open({
      title,
      message,
      size: 'sm',
      buttons: [
        { label: buttonLabel, variant: 'primary', action: () => this.close(id) }
      ]
    });
    return id;
  }

  /**
   * Cierra un modal específico por ID.
   */
  close(id: number): void {
    this.modals.update(m =>
      m.map(modal => modal.id === id ? { ...modal, closing: true } : modal)
    );
    setTimeout(() => {
      this.modals.update(m => m.filter(modal => modal.id !== id));
    }, 200);
  }

  /** Cierra todos los modales */
  closeAll(): void {
    this.modals.set([]);
  }
}
