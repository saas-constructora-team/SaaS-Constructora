import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { LoginResponse } from '../auth/auth.model';
import { authGuard } from './auth.guard';
import { permissionGuard } from './permission.guard';
import { PermissionService } from './permission.service';
import { safeReturnUrl, tokenExpiresAt } from './navigation.utils';

const sessionValue: LoginResponse = { accessToken: 'opaque', tokenType: 'Bearer', expiresInSeconds: 3600,
  user: { id: 'user', tenantId: 'tenant', email: 'user@example.com', fullName: 'User', role: 'ADMIN' } };

describe('Route guards and return destinations', () => {
  let session: ReturnType<typeof signal<LoginResponse | null>>;
  let logout: jasmine.Spy;
  const evaluateAuth = () => TestBed.runInInjectionContext(() => authGuard(
    {} as ActivatedRouteSnapshot, { url: '/app/proyectos' } as RouterStateSnapshot));
  beforeEach(() => {
    session = signal<LoginResponse | null>(null);
    logout = jasmine.createSpy('logout').and.callFake(() => session.set(null));
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: AuthService, useValue: { session, logout } }] });
  });

  it('returns a login UrlTree with returnUrl for an unauthenticated user', () => {
    const result = evaluateAuth() as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Fapp%2Fproyectos');
  });

  it('allows a restored session without inventing a timestamp from expiresInSeconds', () => {
    session.set(sessionValue);
    expect(evaluateAuth()).toBeTrue();
    expect(tokenExpiresAt(sessionValue)).toBeNull();
  });

  it('rejects an expired exp and retains a future exp', () => {
    const token = (exp: number) => `header.${btoa(JSON.stringify({ exp }))}.signature`;
    session.set({ ...sessionValue, accessToken: token(Date.now() / 1000 - 60) });
    expect(evaluateAuth() instanceof UrlTree).toBeTrue();
    expect(logout).toHaveBeenCalled();
    session.set({ ...sessionValue, accessToken: token(Date.now() / 1000 + 3600) });
    expect(evaluateAuth()).toBeTrue();
  });

  it('does not treat malformed exp as verified expiration data', () => {
    expect(tokenExpiresAt({ ...sessionValue, accessToken: `a.${btoa('{"exp":"tomorrow"}')}.b` })).toBeNull();
  });

  for (const state of ['granted', 'denied', 'unknown'] as const) {
    it(`permits administrative routes only for granted capability (${state})`, () => {
      const service = TestBed.inject(PermissionService);
      spyOn(service, 'capabilities').and.returnValue({ ...service.capabilities(), administerUsers: state });
      const result = TestBed.runInInjectionContext(() => permissionGuard(
        {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
      expect(result === true).toBe(state === 'granted');
    });
  }

  for (const role of ['MEMBER', 'WORKER', 'UNKNOWN']) {
    it(`redirects ${role} to projects rather than closing the session`, () => {
      session.set({ ...sessionValue, user: { ...sessionValue.user, role } });
      const result = TestBed.runInInjectionContext(() => permissionGuard(
        {} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)) as UrlTree;
      expect(TestBed.inject(Router).serializeUrl(result)).toBe('/app/proyectos?access=denied');
      expect(logout).not.toHaveBeenCalled();
    });
  }

  it('accepts implemented private return URLs and rejects external or unimplemented destinations', () => {
    expect(safeReturnUrl('/app/usuarios?filter=test')).toBe('/app/usuarios?filter=test');
    for (const value of ['https://evil.example', '//evil.example', '/app/../login', '/app/inventario', '/app\\evil', '/login']) {
      expect(safeReturnUrl(value)).toBe('/app/proyectos');
    }
  });
});
