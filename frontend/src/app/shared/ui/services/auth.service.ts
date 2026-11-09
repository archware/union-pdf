import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';

import { ApiService } from './api.service';
import { TokenService } from './token.service';

/**
 * User profile structure
 * @customize Adjust to match your API response
 */
export interface UserProfile {
    id: string | number;
    user: string;
    names: string;
    email?: string;
    role?: string;
    [key: string]: unknown;
}

/**
 * Login request structure
 * @customize Adjust to match your API
 */
export interface LoginRequest {
    v_user: string;
    v_password: string;
    v_ip?: string;
}

/**
 * Login response structure
 * @customize Adjust to match your API response
 */
export interface LoginResponse {
    access_Token: string;
    refresh_Token?: string;
    b_CAMBIO_CONTRASENIA?: boolean;
    user?: UserProfile;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
    v_ACCESS_TOKEN: string;
    v_REFRESH_TOKEN: string;
}

/**
 * AuthService - Authentication management
 * 
 * Features:
 * - Login with username/password
 * - Automatic token refresh
 * - User profile management
 * - Logout and session cleanup
 * - Multi-app authentication support
 * 
 * @usage
 * ```typescript
 * // In component
 * private auth = inject(AuthService);
 * 
 * // Login
 * auth.login({ v_user: 'admin', v_password: '123' }).subscribe();
 * 
 * // Check auth state
 * if (auth.isAuthenticated()) { ... }
 * 
 * // Get current user
 * const user = auth.currentUser();
 * 
 * // Logout
 * auth.logout();
 * ```
 */
@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private api = inject(ApiService);
    private tokenService = inject(TokenService);
    private router = inject(Router);

    // ============================================
    // CONFIGURATION - Customize these values
    // ============================================

    /** @customize Application ID for token storage */
    private appId = '2';

    /** @customize API endpoints */
    private readonly ENDPOINTS = {
        login: '/Authentication/PostLogin',
        profile: '/Authentication/Get_user_profile',
        refresh: '/Authentication/Post_refresh_token',
        changePassword: '/Authentication/Post_change_password'
    };

    /** @customize Route after logout */
    private readonly LOGIN_ROUTE = '/login';

    // ============================================
    // STATE
    // ============================================

    /** Current authenticated user */
    private _currentUser = signal<UserProfile | null>(null);

    /** Loading state */
    private _loading = signal(false);

    /** Error state */
    private _error = signal<string | null>(null);

    /** Password change required flag */
    private _requiresPasswordChange = signal(false);

    // ============================================
    // COMPUTED
    // ============================================

    /** Current user (readonly) */
    readonly currentUser = this._currentUser.asReadonly();

    /** Authentication status */
    readonly isAuthenticated = computed(() =>
        this.tokenService.hasValidToken(this.appId) && this._currentUser() !== null
    );

    /** Loading state */
    readonly loading = this._loading.asReadonly();

    /** Error message */
    readonly error = this._error.asReadonly();

    /** Password change required */
    readonly requiresPasswordChange = this._requiresPasswordChange.asReadonly();

    // ============================================
    // PUBLIC API
    // ============================================

    /**
     * Configure the app ID for multi-app environments
     * @param appId Application identifier
     */
    configure(appId: string): void {
        this.appId = appId;
        // Check if already authenticated
        if (this.tokenService.hasValidToken(appId)) {
            this.loadUserProfile().subscribe();
        }
    }

    /**
     * Login with credentials
     * @param credentials Login credentials
     * @returns Observable of login response
     */
    login(credentials: LoginRequest): Observable<LoginResponse> {
        this._loading.set(true);
        this._error.set(null);

        return this.api.post<LoginResponse>(this.ENDPOINTS.login, credentials).pipe(
            tap(response => {
                // Save tokens
                this.tokenService.saveTokenApp(response.access_Token, this.appId);

                if (response.refresh_Token) {
                    this.tokenService.saveRefreshToken(response.refresh_Token, this.appId);
                }

                // Check for password change requirement
                this._requiresPasswordChange.set(response.b_CAMBIO_CONTRASENIA ?? false);

                // Set user if included in response
                if (response.user) {
                    this._currentUser.set(response.user);
                }

                // Set auth header for future requests
                this.api.setAuthToken(response.access_Token);
            }),
            switchMap(response => {
                // Load full profile if not included
                if (!response.user) {
                    return this.loadUserProfile().pipe(
                        switchMap(() => of(response))
                    );
                }
                return of(response);
            }),
            tap(() => this._loading.set(false)),
            catchError(error => {
                this._loading.set(false);
                this._error.set(error.message || 'Error de autenticación');
                return throwError(() => error);
            })
        );
    }

    /**
     * Load user profile from API
     * @returns Observable of user profile
     */
    loadUserProfile(): Observable<UserProfile> {
        const userId = this.tokenService.getUserId(this.appId);

        return this.api.get<{ value: UserProfile }>(
            `${this.ENDPOINTS.profile}?I_ID_USER=${userId}`
        ).pipe(
            tap(response => {
                this._currentUser.set(response.value);
            }),
            switchMap(response => of(response.value))
        );
    }

    /**
     * Refresh access token using refresh token
     * @returns Observable of new login response
     */
    refreshToken(): Observable<LoginResponse> {
        const accessToken = this.tokenService.getTokenApp(this.appId);
        const refreshToken = this.tokenService.getRefreshToken(this.appId);

        if (!accessToken || !refreshToken) {
            return throwError(() => new Error('No tokens available'));
        }

        const request: RefreshTokenRequest = {
            v_ACCESS_TOKEN: accessToken,
            v_REFRESH_TOKEN: refreshToken
        };

        return this.api.post<LoginResponse>(this.ENDPOINTS.refresh, request).pipe(
            tap(response => {
                this.tokenService.saveTokenApp(response.access_Token, this.appId);

                if (response.refresh_Token) {
                    this.tokenService.saveRefreshToken(response.refresh_Token, this.appId);
                }

                this.api.setAuthToken(response.access_Token);
            }),
            catchError(error => {
                // If refresh fails, force logout
                this.logout();
                return throwError(() => error);
            })
        );
    }

    /**
     * Logout and clear all session data
     * @param redirect Whether to redirect to login page (default: true)
     */
    logout(redirect = true): void {
        this.tokenService.removeTokenApp(this.appId);
        this._currentUser.set(null);
        this._error.set(null);
        this.api.setAuthToken('');

        if (redirect) {
            this.router.navigate([this.LOGIN_ROUTE]);
        }
    }

    /**
     * Check if current token is about to expire
     * @returns true if token expires within 5 minutes
     */
    isTokenExpiring(): boolean {
        const token = this.tokenService.getTokenApp(this.appId);
        if (!token) return true;

        return this.tokenService.isTokenExpired(token, 5 * 60 * 1000);
    }

    /**
     * Get current access token
     * @returns Current token or null
     */
    getToken(): string | null {
        return this.tokenService.getTokenApp(this.appId);
    }

    /**
     * Clear error state
     */
    clearError(): void {
        this._error.set(null);
    }
}
