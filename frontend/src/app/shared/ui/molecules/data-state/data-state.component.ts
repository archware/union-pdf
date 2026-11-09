import { Component, Input, ContentChild, TemplateRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '../../atoms/loader/loader.component';
import { ApiError } from '../../services/api.service';

/**
 * Componente para manejar estados de carga de datos.
 * Muestra automáticamente: loading, error, o contenido según el estado.
 *
 * @example
 * ```html
 * <app-data-state [loading]="usersApi.loading()" [error]="usersApi.error()">
 *   <ng-template #content>
 *     @for (user of usersApi.data(); track user.id) {
 *       <p>{{ user.name }}</p>
 *     }
 *   </ng-template>
 * </app-data-state>
 * ```
 *
 * @example Con templates personalizados
 * ```html
 * <app-data-state [loading]="loading()" [error]="error()">
 *   <ng-template #loadingTemplate>
 *     <div class="custom-loader">Cargando usuarios...</div>
 *   </ng-template>
 *
 *   <ng-template #errorTemplate let-error>
 *     <div class="custom-error">
 *       <h3>¡Ups! Algo salió mal</h3>
 *       <p>{{ error.message }}</p>
 *       <button (click)="retry()">Reintentar</button>
 *     </div>
 *   </ng-template>
 *
 *   <ng-template #content>
 *     <!-- Contenido con datos -->
 *   </ng-template>
 * </app-data-state>
 * ```
 *
 * @example Con empty state
 * ```html
 * <app-data-state [loading]="loading()" [error]="error()" [isEmpty]="data()?.length === 0">
 *   <ng-template #emptyTemplate>
 *     <p>No hay datos disponibles</p>
 *   </ng-template>
 *
 *   <ng-template #content>
 *     <!-- Contenido -->
 *   </ng-template>
 * </app-data-state>
 * ```
 */
@Component({
  selector: 'app-data-state',
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Loading State -->
    @if (loading) {
      <div class="data-state data-state--loading">
        @if (loadingTemplate) {
          <ng-container *ngTemplateOutlet="loadingTemplate"></ng-container>
        } @else {
          <app-loader [variant]="loaderVariant" [size]="loaderSize"></app-loader>
          @if (loadingText) {
            <p class="loading-text">{{ loadingText }}</p>
          }
        }
      </div>
    }

    <!-- Error State -->
    @else if (error) {
      <div class="data-state data-state--error">
        @if (errorTemplate) {
          <ng-container *ngTemplateOutlet="errorTemplate; context: { $implicit: error }"></ng-container>
        } @else {
          <div class="error-container">
            <div class="error-icon">
              <i class="fa-solid fa-circle-exclamation"></i>
            </div>
            <h4 class="error-title">{{ errorTitle }}</h4>
            <p class="error-message">{{ error.message }}</p>
            @if (showRetryButton) {
              <button type="button" class="retry-button" (click)="onRetry.emit()">
                <i class="fa-solid fa-rotate-right"></i>
                Reintentar
              </button>
            }
          </div>
        }
      </div>
    }

    <!-- Empty State -->
    @else if (isEmpty) {
      <div class="data-state data-state--empty">
        @if (emptyTemplate) {
          <ng-container *ngTemplateOutlet="emptyTemplate"></ng-container>
        } @else {
          <div class="empty-container">
            <div class="empty-icon">
              <i class="fa-solid fa-inbox"></i>
            </div>
            <p class="empty-text">{{ emptyText }}</p>
          </div>
        }
      </div>
    }

    <!-- Content -->
    @else {
      @if (contentTemplate) {
        <ng-container *ngTemplateOutlet="contentTemplate"></ng-container>
      }
    }
  `,
  styles: [`
    .data-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-8);
      min-height: 150px;
    }

    /* Loading */
    .data-state--loading {
      gap: var(--space-4);
    }

    .loading-text {
      margin: 0;
      font-size: var(--text-sm);
      color: var(--text-color-secondary);
    }

    /* Error */
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: var(--space-3);
      width: 100%;      /* Ocupa el ancho disponible en pantallas pequeñas */
      max-width: 400px; /* Limita en pantallas grandes */
    }

    .error-icon {
      font-size: var(--text-3xl);
      color: var(--danger-color-text);
    }

    .error-title {
      margin: 0;
      font-size: var(--text-lg);
      font-weight: var(--font-weight-emphasis);
      color: var(--text-color);
    }

    .error-message {
      margin: 0;
      font-size: var(--text-sm);
      color: var(--text-color-secondary);
      line-height: 1.5;
    }

    .retry-button {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      margin-top: var(--space-2);
      font-size: var(--text-sm);
      font-weight: var(--font-weight-body);
      color: var(--primary-color);
      background: var(--primary-color-lighter);
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 150ms ease;
    }

    .retry-button:hover {
      background: var(--primary-color);
      color: var(--gray-0);
    }

    /* Empty */
    .empty-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
    }

    .empty-icon {
      font-size: var(--text-4xl);
      color: var(--text-color-muted);
    }

    .empty-text {
      margin: 0;
      font-size: var(--text-sm);
      color: var(--text-color-secondary);
    }
  `]
})
export class DataStateComponent {
  @Input() loading = false;
  @Input() error: ApiError | null = null;
  @Input() isEmpty = false;

  // Customization
  @Input() loadingText = '';
  @Input() loaderVariant: 'spinner' | 'dots' | 'pulse' | 'bars' = 'spinner';
  @Input() loaderSize: 'sm' | 'md' | 'lg' = 'md';
  @Input() errorTitle = 'Error al cargar';
  @Input() emptyText = 'No hay datos disponibles';
  @Input() showRetryButton = true;

  // Events
  @Input() onRetry = { emit: () => { } }; // Simple event pattern

  // Templates
  @ContentChild('content') contentTemplate?: TemplateRef<unknown>;
  @ContentChild('loadingTemplate') loadingTemplate?: TemplateRef<unknown>;
  @ContentChild('errorTemplate') errorTemplate?: TemplateRef<unknown>;
  @ContentChild('emptyTemplate') emptyTemplate?: TemplateRef<unknown>;
}
