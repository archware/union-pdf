import { inject } from '@angular/core';
import {
    HttpInterceptorFn,
    HttpRequest,
    HttpHandlerFn,
    HttpEvent,
    HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';

import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

/**
 * Default app ID for token retrieval
 * @customize Set your application ID
 */
const DEFAULT_APP_ID = '2';

/**
 * URLs that should skip authentication
 */
const PUBLIC_URLS = [
    '/Authentication/PostLogin',
    '/Authentication/Get_time_server',
    '/Authentication/Post_refresh_token'
];

/**
 * Flag to prevent multiple refresh requests
 */
let isRefreshing = false;

/**
 * Subject to queue requests while refreshing
 */
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

/**
 * Authentication Interceptor
 * 
 * Automatically adds Bearer token to requests and handles token refresh.
 * 
 * Features:
 * - Adds Authorization header to authenticated requests
 * - Automatic token refresh on 401 errors
 * - Request queuing during refresh
 * - Skip public endpoints
 * 
 * @usage
 * ```typescript
 * // In app.config.ts
 * import { provideHttpClient, withInterceptors } from '@angular/common/http';
 * import { authInterceptor } from '@shared/ui/interceptors/auth.interceptor';
 * 
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(withInterceptors([authInterceptor]))
 *   ]
 * };
 * ```
 */
export const authInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const tokenService = inject(TokenService);
    const authService = inject(AuthService);

    // Skip public URLs
    if (isPublicUrl(req.url)) {
        return next(req);
    }

    // Get current token
    const token = tokenService.getTokenApp(DEFAULT_APP_ID);

    // Add token if available
    if (token) {
        req = addTokenHeader(req, token);
    }

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            // Handle 401 Unauthorized
            if (error.status === 401 && token) {
                return handle401Error(req, next, tokenService, authService);
            }

            return throwError(() => error);
        })
    );
};

/**
 * Add Authorization header to request
 */
function addTokenHeader(
    request: HttpRequest<unknown>,
    token: string
): HttpRequest<unknown> {
    return request.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`
        }
    });
}

/**
 * Check if URL is public (no auth required)
 */
function isPublicUrl(url: string): boolean {
    return PUBLIC_URLS.some(publicUrl => url.includes(publicUrl));
}

/**
 * Handle 401 error with token refresh
 */
function handle401Error(
    request: HttpRequest<unknown>,
    next: HttpHandlerFn,
    tokenService: TokenService,
    authService: AuthService
): Observable<HttpEvent<unknown>> {
    if (!isRefreshing) {
        isRefreshing = true;
        refreshTokenSubject.next(null);

        const refreshToken = tokenService.getRefreshToken(DEFAULT_APP_ID);

        if (refreshToken) {
            return authService.refreshToken().pipe(
                switchMap((response) => {
                    isRefreshing = false;
                    refreshTokenSubject.next(response.access_Token);

                    return next(addTokenHeader(request, response.access_Token));
                }),
                catchError((err) => {
                    isRefreshing = false;
                    authService.logout();
                    return throwError(() => err);
                })
            );
        } else {
            // No refresh token, force logout
            isRefreshing = false;
            authService.logout();
            return throwError(() => new Error('Session expired'));
        }
    }

    // Wait for refresh to complete, then retry request
    return refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => next(addTokenHeader(request, token!)))
    );
}
