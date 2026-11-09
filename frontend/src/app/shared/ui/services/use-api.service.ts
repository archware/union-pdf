import { Injectable, signal, computed } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { ApiError } from './api.service';

/**
 * Estado de una petición API
 */
export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

/**
 * Resultado del hook useApi
 */
export interface UseApiResult<T> {
  /** Signal con los datos de la respuesta */
  data: () => T | null;
  /** Signal que indica si está cargando */
  loading: () => boolean;
  /** Signal con el error si existe */
  error: () => ApiError | null;
  /** Signal computed que indica si la petición fue exitosa */
  success: () => boolean;
  /** Signal computed que indica si hay error */
  hasError: () => boolean;
  /** Ejecuta una petición */
  execute: (request: Observable<T>) => Subscription;
  /** Resetea el estado */
  reset: () => void;
  /** Actualiza los datos manualmente */
  setData: (data: T) => void;
}

/**
 * Hook signal-based para consumir APIs con estado reactivo.
 * 
 * @example
 * ```typescript
 * // En tu componente
 * private api = inject(ApiService);
 * private userApi = useApi<User[]>();
 * 
 * // Acceso a signals
 * users = this.userApi.data;
 * loading = this.userApi.loading;
 * error = this.userApi.error;
 * 
 * // Ejecutar petición
 * loadUsers() {
 *   this.userApi.execute(this.api.get('/users'));
 * }
 * 
 * // En template
 * @if (loading()) {
 *   <app-loader></app-loader>
 * } @else if (error()) {
 *   <p>Error: {{ error()?.message }}</p>
 * } @else {
 *   @for (user of users(); track user.id) {
 *     <p>{{ user.name }}</p>
 *   }
 * }
 * ```
 */
export function useApi<T>(initialData: T | null = null): UseApiResult<T> {
  const data = signal<T | null>(initialData);
  const loading = signal<boolean>(false);
  const error = signal<ApiError | null>(null);

  const success = computed(() => data() !== null && !loading() && !error());
  const hasError = computed(() => error() !== null);

  let currentSubscription: Subscription | null = null;

  const execute = (request: Observable<T>): Subscription => {
    // Cancel previous request if exists
    if (currentSubscription) {
      currentSubscription.unsubscribe();
    }

    loading.set(true);
    error.set(null);

    currentSubscription = request.subscribe({
      next: (result) => {
        data.set(result);
        loading.set(false);
      },
      error: (err: ApiError) => {
        error.set(err);
        loading.set(false);
      }
    });

    return currentSubscription;
  };

  const reset = (): void => {
    if (currentSubscription) {
      currentSubscription.unsubscribe();
      currentSubscription = null;
    }
    data.set(initialData);
    loading.set(false);
    error.set(null);
  };

  const setData = (newData: T): void => {
    data.set(newData);
    error.set(null);
  };

  return {
    data: data.asReadonly(),
    loading: loading.asReadonly(),
    error: error.asReadonly(),
    success,
    hasError,
    execute,
    reset,
    setData
  };
}

/**
 * Servicio inyectable alternativo para usar con DI.
 * Útil cuando necesitas compartir estado entre componentes.
 * 
 * @example
 * ```typescript
 * // Crear servicio específico
 * @Injectable({ providedIn: 'root' })
 * export class UsersApiService extends UseApiService<User[]> {
 *   private api = inject(ApiService);
 *   
 *   loadUsers() {
 *     this.execute(this.api.get('/users'));
 *   }
 * }
 * ```
 */
@Injectable()
export class UseApiService<T> {
  private readonly _data = signal<T | null>(null);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<ApiError | null>(null);
  private subscription: Subscription | null = null;

  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly success = computed(() => this._data() !== null && !this._loading() && !this._error());
  readonly hasError = computed(() => this._error() !== null);

  execute(request: Observable<T>): Subscription {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this._loading.set(true);
    this._error.set(null);

    this.subscription = request.subscribe({
      next: (result) => {
        this._data.set(result);
        this._loading.set(false);
      },
      error: (err: ApiError) => {
        this._error.set(err);
        this._loading.set(false);
      }
    });

    return this.subscription;
  }

  reset(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this._data.set(null);
    this._loading.set(false);
    this._error.set(null);
  }

  setData(data: T): void {
    this._data.set(data);
    this._error.set(null);
  }
}
