import { Injectable, signal } from '@angular/core';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
  dismissible?: boolean;
}

export interface ToastItem extends ToastConfig {
  id: number;
  exiting?: boolean;
}

/**
 * Servicio global para mostrar notificaciones toast.
 * Inyectable en root para que sea singleton en toda la aplicación.
 * 
 * @example
 * ```typescript
 * export class MyComponent {
 *   private toast = inject(ToastService);
 * 
 *   onSuccess() {
 *     this.toast.success('Operación completada');
 *   }
 * 
 *   onError() {
 *     this.toast.error('Ocurrió un error');
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastId = 0;

  /** Signal público para que el componente lea los toasts */
  readonly toasts = signal<ToastItem[]>([]);

  /**
   * Muestra un toast con la configuración especificada.
   */
  show(config: ToastConfig): void {
    const id = ++this.toastId;
    const toast: ToastItem = {
      ...config,
      id,
      type: config.type ?? 'info',
      dismissible: config.dismissible ?? true
    };

    this.toasts.update(t => [...t, toast]);

    if (config.duration !== 0) {
      setTimeout(() => this.dismiss(id), config.duration ?? 4000);
    }
  }

  /** Muestra un toast de información */
  info(message: string, duration?: number): void {
    this.show({ message, type: 'info', duration });
  }

  /** Muestra un toast de éxito */
  success(message: string, duration?: number): void {
    this.show({ message, type: 'success', duration });
  }

  /** Muestra un toast de advertencia */
  warning(message: string, duration?: number): void {
    this.show({ message, type: 'warning', duration });
  }

  /** Muestra un toast de error */
  error(message: string, duration?: number): void {
    this.show({ message, type: 'error', duration });
  }

  /**
   * Descarta un toast específico por ID.
   */
  dismiss(id: number): void {
    this.toasts.update(t =>
      t.map(toast => toast.id === id ? { ...toast, exiting: true } : toast)
    );
    setTimeout(() => {
      this.toasts.update(t => t.filter(toast => toast.id !== id));
    }, 300);
  }

  /** Cierra todos los toasts */
  clear(): void {
    this.toasts.set([]);
  }
}
