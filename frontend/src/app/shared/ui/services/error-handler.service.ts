import { ErrorHandler, Injectable, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';

/**
 * GlobalErrorHandlerService — Captura errores no manejados en la aplicación.
 *
 * Features:
 * - Captura errores de JavaScript no atrapados (runtime errors)
 * - Redirige a /500 en errores críticos
 * - Registra errores en consola (reemplaza por tu servicio de monitoreo)
 * - Ignora errores conocidos no críticos
 *
 * @usage En app.config.ts:
 * ```typescript
 * import { GlobalErrorHandlerService } from '@shared/ui';
 * providers: [
 *   { provide: ErrorHandler, useClass: GlobalErrorHandlerService }
 * ]
 * ```
 */
@Injectable()
export class GlobalErrorHandlerService implements ErrorHandler {
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  /** Errores a ignorar (fragmentos de mensaje) */
  private readonly IGNORED_ERRORS = [
    'ExpressionChangedAfterItHasBeenCheckedError',
    'ResizeObserver loop',
    'Non-Error promise rejection',
  ];

  handleError(error: unknown): void {
    const err = error instanceof Error ? error : new Error(String(error));

    // Ignorar errores no críticos
    if (this.shouldIgnore(err)) {
      return;
    }

    // Log para desarrollo — @customize: reemplaza con Sentry, Datadog, etc.
    console.error('[GlobalErrorHandler]', err);

    // Redirigir a página de error en zona Angular
    this.zone.run(() => {
      // Solo redirige si es un error crítico y estamos en el browser
      if (typeof window !== 'undefined') {
        this.router.navigate(['/500'], {
          queryParams: { message: err.message },
          skipLocationChange: true,
        }).catch(() => {
          // Fallback si el router no está disponible
        });
      }
    });
  }

  private shouldIgnore(error: Error): boolean {
    return this.IGNORED_ERRORS.some(ignored =>
      error.message?.includes(ignored)
    );
  }
}
