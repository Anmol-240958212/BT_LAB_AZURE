import { Injectable, inject } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
  CanActivateFn
} from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from './models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const allowedRoles = route.data['roles'] as UserRole[] | undefined;

    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const currentRole = this.authService.getRole();

    if (currentRole && allowedRoles.includes(currentRole)) {
      return true;
    }

    // Role unauthorized
    this.router.navigate(['/unauthorized']);
    return false;
  }
}

export const roleGuardFn: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = route.data['roles'] as UserRole[] | undefined;

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const currentRole = authService.getRole();

  if (currentRole && allowedRoles.includes(currentRole)) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};
