import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/** Preserves the role input previously supplied by AppComponent. */
export const routeRole: ResolveFn<string> = () => inject(AuthService).session()?.user.role ?? '';
