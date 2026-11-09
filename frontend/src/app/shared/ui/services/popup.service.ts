import { Injectable, signal } from '@angular/core';

export type PopupSize = 'sm' | 'md' | 'lg';
export type PopupType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

export interface PopupButton {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  action: () => void;
  /** Recibe el foco al abrirse el popup. Solo uno por popup. */
  autofocus?: boolean;
  /** Lo que hay que ejecutar si el popup se cierra por Escape o por la aspa. */
  cancels?: boolean;
}

/**
 * Lo que hace falta para preguntar por un acto que se va a ejecutar.
 *
 * `confirmLabel` NO tiene valor por defecto a proposito. Un boton que dice
 * «Confirmar» obliga a leer el titulo para saber que se confirma, y quien lleva
 * cuarenta dialogos al dia ya no lee el titulo. El verbo del acto va en el
 * boton: «Anular la solicitud», «Eliminar el gasto».
 */
export interface PopupConfirmOptions {
  title: string;
  message: string;
  /** El verbo del acto. Obligatorio. */
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` para lo que no se puede deshacer. */
  tone?: 'default' | 'danger';
  /** Por defecto `cancel`: la salida segura es la que recibe el foco. */
  initialFocus?: 'cancel' | 'confirm';
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface PopupConfig {
  id?: number;
  title: string;
  message?: string;
  type?: PopupType;
  size?: PopupSize;
  icon?: string;
  closable?: boolean;
  closeOnBackdrop?: boolean;
  buttons?: PopupButton[];
  /** Contenido HTML personalizado (opcional) */
  htmlContent?: string;
}

export interface PopupItem extends PopupConfig {
  id: number;
  closing?: boolean;
}

/**
 * Servicio global para mostrar popups/modales dinámicos.
 * Inyectable en root para que sea singleton en toda la aplicación.
 * 
 * @example
 * ```typescript
 * export class MyComponent {
 *   private popup = inject(PopupService);
 * 
 *   showInfo() {
 *     this.popup.info('Información', 'Este es un mensaje informativo');
 *   }
 * 
 *   showConfirm() {
 *     // Una confirmación dice QUÉ va a pasar, no pregunta si se está seguro.
 *     this.popup.confirm({
 *       title: 'Eliminar el gasto del 12/03',
 *       message: 'Se retira del arqueo del día y del reporte de caja. No se puede deshacer.',
 *       confirmLabel: 'Eliminar el gasto',
 *       tone: 'danger',
 *       onConfirm: () => this.delete(),
 *       onCancel: () => {}
 *     });
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class PopupService {
  private popupId = 0;

  /** Signal público para que el componente lea los popups */
  readonly popups = signal<PopupItem[]>([]);

  /**
   * Muestra un popup con la configuración especificada.
   */
  show(config: PopupConfig): number {
    const id = ++this.popupId;
    const popup: PopupItem = {
      ...config,
      id,
      type: config.type ?? 'info',
      size: config.size ?? 'md',
      closable: config.closable ?? true,
      closeOnBackdrop: config.closeOnBackdrop ?? true
    };

    this.popups.update(p => [...p, popup]);
    return id;
  }

  /** Popup informativo simple */
  info(title: string, message: string): number {
    let id = 0;
    id = this.show({
      title,
      message,
      type: 'info',
      icon: 'fa-solid fa-circle-info',
      buttons: [{ label: 'Aceptar', variant: 'primary', action: () => this.close(id) }]
    });
    return id;
  }

  /** Popup de éxito */
  success(title: string, message: string): number {
    let id = 0;
    id = this.show({
      title,
      message,
      type: 'success',
      icon: 'fa-solid fa-circle-check',
      buttons: [{ label: 'Aceptar', variant: 'primary', action: () => this.close(id) }]
    });
    return id;
  }

  /** Popup de advertencia */
  warning(title: string, message: string): number {
    let id = 0;
    id = this.show({
      title,
      message,
      type: 'warning',
      icon: 'fa-solid fa-triangle-exclamation',
      buttons: [{ label: 'Entendido', variant: 'primary', action: () => this.close(id) }]
    });
    return id;
  }

  /** Popup de error */
  error(title: string, message: string): number {
    let id = 0;
    id = this.show({
      title,
      message,
      type: 'error',
      icon: 'fa-solid fa-circle-xmark',
      buttons: [{ label: 'Cerrar', variant: 'danger', action: () => this.close(id) }]
    });
    return id;
  }

  /**
   * Popup de confirmación con acciones.
   *
   * CAPITULO 7: EL FOCO EMPIEZA EN LA SALIDA SEGURA.
   *
   * Antes el foco se quedaba en el fondo del dialogo y un Intro por inercia
   * ejecutaba el boton primario, que es el que hace la cosa. Ahora el foco
   * arranca en «Cancelar» salvo que se pida lo contrario, y Escape ejecuta la
   * misma cancelacion que el boton —no un cierre mudo que deja al llamador
   * esperando una respuesta que no llega.
   */
  confirm(options: PopupConfirmOptions): number {
    const initialFocus = options.initialFocus ?? 'cancel';
    let id = 0;
    id = this.show({
      title: options.title,
      message: options.message,
      type: 'confirm',
      icon: 'fa-solid fa-question-circle',
      closeOnBackdrop: false,
      buttons: [
        {
          label: options.cancelLabel ?? 'Cancelar',
          variant: 'ghost',
          autofocus: initialFocus === 'cancel',
          cancels: true,
          action: () => { options.onCancel?.(); this.close(id); }
        },
        {
          label: options.confirmLabel,
          variant: options.tone === 'danger' ? 'danger' : 'primary',
          autofocus: initialFocus === 'confirm',
          action: () => { options.onConfirm(); this.close(id); }
        }
      ]
    });
    return id;
  }

  /**
   * Cierra un popup específico por ID.
   */
  close(id: number): void {
    this.popups.update(p =>
      p.map(popup => popup.id === id ? { ...popup, closing: true } : popup)
    );
    setTimeout(() => {
      this.popups.update(p => p.filter(popup => popup.id !== id));
    }, 200);
  }

  /** Cierra todos los popups */
  clear(): void {
    this.popups.set([]);
  }
}
