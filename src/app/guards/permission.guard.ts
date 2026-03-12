import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard que verifica autenticación y permiso requerido por ruta.
 *
 * Uso en routes:
 *   {
 *     path: 'grupos',
 *     canActivate: [permissionGuard],
 *     data: { permission: 'group:view' },
 *     ...
 *   }
 */
export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn()) {
        router.navigate(['/login']);
        return false;
    }

    const requiredPermission = route.data['permission'] as string | undefined;
    if (requiredPermission && !authService.hasPermission(requiredPermission)) {
        router.navigate(['/dashboard']);
        return false;
    }

    return true;
};
