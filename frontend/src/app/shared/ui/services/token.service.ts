import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Token configuration for multi-app environments
 */
export interface TokenConfig {
    /** Application ID for token isolation */
    appId: string;
    /** Token expiry buffer in milliseconds (default: 5 minutes) */
    expiryBuffer?: number;
    /** Use secure cookies (HTTPS only) */
    secure?: boolean;
}

/**
 * Decoded JWT payload structure
 */
export interface JwtPayload {
    exp?: number;
    iat?: number;
    sub?: string;
    [key: string]: unknown;
}

/**
 * TokenService - Secure token management with cookies
 * 
 * Features:
 * - Cookie-based token storage (more secure than localStorage for XSS)
 * - Multi-app support with isolated tokens
 * - Automatic token expiry detection
 * - SSR-safe implementation
 * 
 * @usage
 * ```typescript
 * // Inject service
 * private tokenService = inject(TokenService);
 * 
 * // Save token for app
 * tokenService.saveTokenApp('jwt-token', '2');
 * 
 * // Get token
 * const token = tokenService.getTokenApp('2');
 * 
 * // Check if valid
 * if (tokenService.hasValidToken('2')) { ... }
 * 
 * // Clear on logout
 * tokenService.removeTokenApp('2');
 * ```
 */
@Injectable({
    providedIn: 'root'
})
export class TokenService {
    private platformId = inject(PLATFORM_ID);

    // ============================================
    // CONFIGURATION
    // ============================================

    /** Default expiry buffer: 5 minutes before actual expiry */
    private readonly DEFAULT_EXPIRY_BUFFER = 5 * 60 * 1000;

    /** Cookie path */
    private readonly COOKIE_PATH = '/';

    /** Token cookie prefix */
    private readonly TOKEN_PREFIX = 'app_token_';

    /** Refresh token cookie prefix */
    private readonly REFRESH_PREFIX = 'app_refresh_';

    // ============================================
    // STATE
    // ============================================

    /** Current app ID being used */
    private currentAppId = signal<string | null>(null);

    /** Whether browser environment is available */
    private readonly isBrowser = computed(() => isPlatformBrowser(this.platformId));

    // ============================================
    // PUBLIC API - Token Operations
    // ============================================

    /**
     * Save access token for a specific application
     * @param token JWT access token
     * @param appId Application identifier
     * @param expiresInSeconds Optional expiry in seconds (defaults to token's exp claim)
     */
    saveTokenApp(token: string, appId: string, expiresInSeconds?: number): void {
        if (!this.isBrowser()) return;

        const cookieName = this.getTokenCookieName(appId);
        let expiry: Date | undefined;

        if (expiresInSeconds) {
            expiry = new Date(Date.now() + expiresInSeconds * 1000);
        } else {
            // Try to extract expiry from JWT
            const payload = this.decodeToken(token);
            if (payload?.exp) {
                expiry = new Date(payload.exp * 1000);
            }
        }

        this.setCookie(cookieName, token, expiry);
        this.currentAppId.set(appId);
    }

    /**
     * Save refresh token for a specific application
     * @param token Refresh token
     * @param appId Application identifier
     * @param expiresInDays Optional expiry in days (default: 30)
     */
    saveRefreshToken(token: string, appId: string, expiresInDays = 30): void {
        if (!this.isBrowser()) return;

        const cookieName = this.getRefreshCookieName(appId);
        const expiry = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

        this.setCookie(cookieName, token, expiry);
    }

    /**
     * Get access token for a specific application
     * @param appId Application identifier
     * @returns Token string or null if not found
     */
    getTokenApp(appId: string): string | null {
        if (!this.isBrowser()) return null;

        const cookieName = this.getTokenCookieName(appId);
        return this.getCookie(cookieName);
    }

    /**
     * Get refresh token for a specific application
     * @param appId Application identifier
     * @returns Refresh token string or null
     */
    getRefreshToken(appId: string): string | null {
        if (!this.isBrowser()) return null;

        const cookieName = this.getRefreshCookieName(appId);
        return this.getCookie(cookieName);
    }

    /**
     * Remove all tokens for a specific application (logout)
     * @param appId Application identifier
     */
    removeTokenApp(appId: string): void {
        if (!this.isBrowser()) return;

        this.deleteCookie(this.getTokenCookieName(appId));
        this.deleteCookie(this.getRefreshCookieName(appId));

        if (this.currentAppId() === appId) {
            this.currentAppId.set(null);
        }
    }

    /**
     * Check if a valid (non-expired) token exists for an app
     * @param appId Application identifier
     * @returns true if valid token exists
     */
    hasValidToken(appId: string): boolean {
        const token = this.getTokenApp(appId);
        if (!token) return false;

        return !this.isTokenExpired(token);
    }

    /**
     * Check if token is expired or about to expire
     * @param token JWT token string
     * @param bufferMs Buffer before expiry (default: 5 minutes)
     * @returns true if expired or expiring soon
     */
    isTokenExpired(token: string, bufferMs = this.DEFAULT_EXPIRY_BUFFER): boolean {
        const payload = this.decodeToken(token);
        if (!payload?.exp) return false; // Can't determine, assume valid

        const expiryTime = payload.exp * 1000;
        const now = Date.now();

        return now >= (expiryTime - bufferMs);
    }

    /**
     * Decode JWT token payload (without verification)
     * @param token JWT token string
     * @returns Decoded payload or null
     */
    decodeToken(token: string): JwtPayload | null {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;

            const payload = parts[1];
            const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            return JSON.parse(decoded);
        } catch {
            return null;
        }
    }

    /**
     * Get user ID from token
     * @param appId Application identifier
     * @returns User ID or null
     */
    getUserId(appId: string): string | null {
        const token = this.getTokenApp(appId);
        if (!token) return null;

        const payload = this.decodeToken(token);
        return payload?.sub ?? null;
    }

    // ============================================
    // LEGACY API (for backward compatibility)
    // ============================================

    /**
     * @deprecated Use saveTokenApp instead
     */
    saveToken(value: string): void {
        this.setCookie('value-token', value);
    }

    /**
     * @deprecated Use getTokenApp instead
     */
    getToken(): string | null {
        return this.getCookie('value-token');
    }

    // ============================================
    // PRIVATE - Cookie Operations
    // ============================================

    private getTokenCookieName(appId: string): string {
        return `${this.TOKEN_PREFIX}${appId}`;
    }

    private getRefreshCookieName(appId: string): string {
        return `${this.REFRESH_PREFIX}${appId}`;
    }

    private setCookie(name: string, value: string, expires?: Date, secure = false): void {
        if (!this.isBrowser()) return;

        let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
        cookie += `; path=${this.COOKIE_PATH}`;

        if (expires) {
            cookie += `; expires=${expires.toUTCString()}`;
        }

        if (secure || location.protocol === 'https:') {
            cookie += '; secure';
        }

        // SameSite for CSRF protection
        cookie += '; SameSite=Strict';

        document.cookie = cookie;
    }

    private getCookie(name: string): string | null {
        if (!this.isBrowser()) return null;

        const nameEQ = encodeURIComponent(name) + '=';
        const cookies = document.cookie.split(';');

        for (const cookie of cookies) {
            const c = cookie.trim();
            if (c.indexOf(nameEQ) === 0) {
                return decodeURIComponent(c.substring(nameEQ.length));
            }
        }

        return null;
    }

    private deleteCookie(name: string): void {
        if (!this.isBrowser()) return;

        document.cookie = `${encodeURIComponent(name)}=; path=${this.COOKIE_PATH}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
}
