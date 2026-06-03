import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, AuthUser } from './auth.service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  if (!authService.token || !user) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const allowedRoles = route.data['roles'] as AuthUser['role'][] | undefined;

  return authService.refreshSession().pipe(
    map((freshUser) => {
      if (allowedRoles?.length && !allowedRoles.includes(freshUser.role)) {
        return router.createUrlTree([authService.defaultRouteFor(freshUser)]);
      }

      return true;
    }),
    catchError(() => {
      authService.logout();
      return of(router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      }));
    }),
  );
};
