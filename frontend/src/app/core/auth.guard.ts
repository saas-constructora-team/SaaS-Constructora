import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { tokenExpiresAt } from './navigation.utils';

export const authGuard: CanActivateFn & CanActivateChildFn = (_route, state) => {
  const auth = inject(AuthService);
  const session = auth.session();
  const expiresAt = session ? tokenExpiresAt(session) : null;
  if (session && (expiresAt === null || expiresAt > Date.now())) return true;
  if (session) auth.logout();
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
