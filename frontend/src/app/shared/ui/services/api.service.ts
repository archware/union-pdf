import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

/**
 * Configuración de request HTTP
 */
export interface ApiRequestOptions {
  headers?: HttpHeaders | Record<string, string | string[]>;
  params?: HttpParams | Record<string, string | string[]>;
  withCredentials?: boolean;
  retryCount?: number;
}

/**
 * Respuesta de API estandarizada
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: number;
  success?: boolean;
}

/**
 * Error de API estandarizado
 */
export interface ApiError {
  message: string;
  status: number;
  statusText: string;
  url: string | null;
  errors?: Record<string, string[]>;
}

/**
 * Servicio genérico para consumir APIs REST.
 * 
 * @example
 * ```typescript
 * // Inyectar el servicio
 * private api = inject(ApiService);
 * 
 * // Configurar URL base
 * constructor() {
 *   this.api.setBaseUrl('https://api.example.com/v1');
 * }
 * 
 * // GET request
 * this.api.get<User[]>('/users').subscribe(users => console.log(users));
 * 
 * // POST request
 * this.api.post<User>('/users', { name: 'John' }).subscribe(user => console.log(user));
 * 
 * // Con opciones
 * this.api.get<User>('/users/1', { 
 *   headers: { 'Authorization': 'Bearer token' },
 *   retryCount: 3 
 * }).subscribe();
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private baseUrl = '';
  private defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  /**
   * Configura la URL base para todas las peticiones
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Obtiene la URL base configurada
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Agrega headers por defecto a todas las peticiones
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Agrega un header de autorización Bearer
   */
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Elimina el header de autorización
   */
  clearAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }

  /**
   * GET request
   */
  get<T>(endpoint: string, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('GET', endpoint, null, options);
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('POST', endpoint, body, options);
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, body: unknown, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('PATCH', endpoint, body, options);
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string, options?: ApiRequestOptions): Observable<T> {
    return this.request<T>('DELETE', endpoint, null, options);
  }

  /**
   * Request genérico
   */
  private request<T>(
    method: string,
    endpoint: string,
    body: unknown | null,
    options?: ApiRequestOptions
  ): Observable<T> {
    const url = this.buildUrl(endpoint);
    const headers = this.buildHeaders(options?.headers);
    const retryCount = options?.retryCount ?? 0;

    const httpOptions = {
      headers,
      params: options?.params,
      withCredentials: options?.withCredentials ?? false,
      body: body ? JSON.stringify(body) : undefined
    };

    let request$: Observable<T>;

    switch (method) {
      case 'GET':
        request$ = this.http.get<T>(url, httpOptions);
        break;
      case 'POST':
        request$ = this.http.post<T>(url, body, httpOptions);
        break;
      case 'PUT':
        request$ = this.http.put<T>(url, body, httpOptions);
        break;
      case 'PATCH':
        request$ = this.http.patch<T>(url, body, httpOptions);
        break;
      case 'DELETE':
        request$ = this.http.delete<T>(url, httpOptions);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    return request$.pipe(
      retry(retryCount),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Construye la URL completa
   */
  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint; // URL absoluta
    }
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${cleanEndpoint}`;
  }

  /**
   * Construye los headers de la petición
   */
  private buildHeaders(customHeaders?: HttpHeaders | Record<string, string | string[]>): HttpHeaders {
    let headers = new HttpHeaders(this.defaultHeaders);

    if (customHeaders) {
      if (customHeaders instanceof HttpHeaders) {
        customHeaders.keys().forEach(key => {
          headers = headers.set(key, customHeaders.get(key) || '');
        });
      } else {
        Object.entries(customHeaders).forEach(([key, value]) => {
          headers = headers.set(key, value);
        });
      }
    }

    return headers;
  }

  /**
   * Maneja errores HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    const apiError: ApiError = {
      message: this.extractErrorMessage(error),
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      errors: error.error?.errors
    };

    console.error('[ApiService] Error:', apiError);
    return throwError(() => apiError);
  }

  /**
   * Extrae mensaje de error legible
   */
  private extractErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
    }

    if (error.error?.message) {
      return error.error.message;
    }

    if (typeof error.error === 'string') {
      return error.error;
    }

    switch (error.status) {
      case 400: return 'Solicitud inválida';
      case 401: return 'No autorizado. Por favor inicia sesión.';
      case 403: return 'Acceso denegado';
      case 404: return 'Recurso no encontrado';
      case 422: return 'Datos de entrada inválidos';
      case 429: return 'Demasiadas solicitudes. Intenta más tarde.';
      case 500: return 'Error interno del servidor';
      case 502: return 'Servidor no disponible';
      case 503: return 'Servicio temporalmente no disponible';
      default: return `Error ${error.status}: ${error.statusText}`;
    }
  }
}
