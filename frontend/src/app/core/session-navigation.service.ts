import { effect, inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { tokenExpiresAt } from './navigation.utils';

/** Coordinates logout from any existing component without changing AuthService. */
@Injectable({ providedIn: 'root' })
export class SessionNavigationService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    effect(onCleanup => {
      const session = this.auth.session();
      if (!session) {
        if (this.router.url === '/app' || this.router.url.startsWith('/app/')) {
          void this.router.navigate(['/login'], { replaceUrl: true });
        }
        return;
      }
      const expiry = tokenExpiresAt(session);
      if (expiry === null) return; // Legacy/opaque tokens: the API remains authoritative.
      let timer: ReturnType<typeof setTimeout>;
      const check = () => {
        const remaining = expiry - Date.now();
        if (remaining <= 0) {
          if (this.auth.session() === session) this.auth.logout();
        } else {
          timer = setTimeout(check, Math.min(remaining, 2147483647));
        }
      };
      check();
      onCleanup(() => clearTimeout(timer));
    });
  }
}
