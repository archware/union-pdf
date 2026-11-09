import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { TokenService } from '../services/token.service';

/**
 * Default app ID for authentication
 * @customize Set your application ID
 */
const DEFAULT_APP_ID = '2';

/**
 * Default login route
 * @customize Set your login route
 */
const LOGIN_ROUTE = '/login';

/**
 * Authentication Guard
 * 
 * Protects routes that require authentication.
 * Redirects to login if no valid token is found.
 * 
 * @usage
 * ```typescript
 * // In app.routes.ts
 * import { authGuard } from '@shared/ui/guards/auth.guard';
 * 
 * export const routes: Routes = [
 *   { path: 'login', component: LoginComponent },
 *   { 
 *     path: 'dashboard', 
 *     component: DashboardComponent,
 *     canActivate: [authGuard]
 *   },
 *   {
 *     path: 'admin',
 *     canActivate: [authGuard],
 *     data: { appId: '3' }, // Custom app ID
 *     children: [...]
 *   }
 * ];
 * ```
 */
export const authGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => {
    const tokenService = inject(TokenService);
    const router = inject(Router);

    // Get app ID from route data or use default
    const appId = (route.data?.['appId'] as string) || DEFAULT_APP_ID;

    // Check for valid token
    if (tokenService.hasValidToken(appId)) {
        return true;
    }

    // Store attempted URL for redirect after login
    const returnUrl = state.url;

    // Redirect to login with return URL
    return router.createUrlTree([LOGIN_ROUTE], {
        queryParams: { returnUrl }
    });
};

/**
 * Guest Guard (inverse of authGuard)
 * 
 * Redirects authenticated users away from login/register pages.
 * 
 * @usage
 * ```typescript
 * { 
 *   path: 'login', 
 *   component: LoginComponent,
 *   canActivate: [guestGuard]
 * }
 * ```
 */
export const guestGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
) => {
    const tokenService = inject(TokenService);
    const router = inject(Router);

    const appId = (route.data?.['appId'] as string) || DEFAULT_APP_ID;

    // If authenticated, redirect to home/dashboard
    if (tokenService.hasValidToken(appId)) {
        return router.createUrlTree(['/home']);
    }

    return true;
};

/**
 * Password Change Guard
 * 
 * Forces users to change password if required.
 * 
 * @usage
 * ```typescript
 * { 
 *   path: 'dashboard', 
 *   component: DashboardComponent,
 *   canActivate: [authGuard, passwordChangeGuard]
 * }
 * ```
 */
export const passwordChangeGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
) => {
    const router = inject(Router);

    // Check if password change is required (stored in session)
    const requiresChange = sessionStorage.getItem('requires_password_change') === 'true';

    if (requiresChange && !route.url.toString().includes('change-password')) {
        return router.createUrlTree(['/change-password']);
    }

    return true;
};
