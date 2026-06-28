import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Permiso } from '../services/auth.service';

export const PermissionGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const permiso = route.data?.['permission'] as Permiso | undefined;

  if (!permiso || authService.hasPermission(permiso)) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
