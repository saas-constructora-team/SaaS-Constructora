import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom, of, tap } from 'rxjs';
import { routes } from './app.routes';
import { AuthService } from './auth/auth.service';
import { AuthComponent } from './auth/auth.component';
import { LoginResponse } from './auth/auth.model';
import { ProjectService } from './projects/project.service';
import { ProjectListComponent } from './projects/project-list.component';
import { UserService } from './users/user.service';
import { InvitationService } from './auth/invitation.service';
import { SessionNavigationService } from './core/session-navigation.service';

const loggedIn: LoginResponse = { accessToken: 'opaque-test-token', tokenType: 'Bearer', expiresInSeconds: 3600,
  user: { id: 'user', tenantId: 'tenant', email: 'admin@example.com', fullName: 'Admin', role: 'ADMIN' } };

describe('Application routes', () => {
  let session: ReturnType<typeof signal<LoginResponse | null>>;
  let router: Router;
  let login: jasmine.Spy;
  beforeEach(() => {
    session = signal<LoginResponse | null>(null);
    login = jasmine.createSpy('login').and.callFake(() => of(loggedIn).pipe(tap(value => session.set(value))));
    TestBed.configureTestingModule({ providers: [
      provideRouter(routes, withComponentInputBinding()),
      provideLocationMocks(),
      { provide: InvitationService, useValue: { preview: () => of({ companyName: 'Company', email: 'worker@example.com', expiresAt: '2027-01-01T12:00:00' }) } },
      { provide: AuthService, useValue: { session, login, logout: () => session.set(null) } },
      { provide: ProjectService, useValue: { list: () => of([]) } },
      { provide: UserService, useValue: { list: () => of([]) } }
    ] });
    router = TestBed.inject(Router);
    TestBed.inject(SessionNavigationService);
  });

  it('redirects a private URL to login and preserves its safe return destination', async () => {
    const harness = await RouterTestingHarness.create('/app/proyectos');
    expect(router.url).toBe('/login?returnUrl=%2Fapp%2Fproyectos');
    expect(harness.routeNativeElement?.querySelector('app-login')).toBeTruthy();
  });

  it('opens a restored private URL and passes the role to the existing component', async () => {
    session.set(loggedIn);
    const harness = await RouterTestingHarness.create('/app/proyectos');
    expect(router.url).toBe('/app/proyectos');
    const project = harness.routeDebugElement?.query(
      // Query by its existing standalone component through the nested outlet.
      debug => debug.componentInstance instanceof ProjectListComponent);
    expect(project?.componentInstance.role).toBe('ADMIN');
  });

  it('allows ADMIN to navigate between existing sections using links', async () => {
    session.set(loggedIn);
    const harness = await RouterTestingHarness.create('/app/proyectos');
    const users = harness.routeNativeElement!.querySelector('[aria-label="Usuarios"]') as HTMLAnchorElement;
    expect(users.getAttribute('href')).toBe('/app/usuarios');
    users.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(router.url).toBe('/app/usuarios');
    expect(users.classList).toContain('active');
    await harness.navigateByUrl('/app/proyectos');
    expect(router.url).toBe('/app/proyectos');
  });

  for (const role of ['MEMBER', 'WORKER', 'UNRECOGNIZED']) {
    it(`denies administrative navigation to ${role} without logging out`, async () => {
      session.set({ ...loggedIn, user: { ...loggedIn.user, role } });
      const harness = await RouterTestingHarness.create('/app/usuarios');
      expect(router.url).toBe('/app/proyectos?access=denied');
      expect(session()).not.toBeNull();
      expect(harness.routeNativeElement!.textContent).toContain('No tienes autorización');
      expect(harness.routeNativeElement!.querySelector('[aria-label="Usuarios"]')).toBeNull();
    });
  }

  it('redirects app and the temporary dashboard route to projects', async () => {
    session.set(loggedIn);
    const harness = await RouterTestingHarness.create('/app');
    expect(router.url).toBe('/app/proyectos');
    await harness.navigateByUrl('/app/dashboard');
    expect(router.url).toBe('/app/proyectos');
  });

  it('navigates from login to registration and recovery with their existing outputs', async () => {
    const harness = await RouterTestingHarness.create('/login');
    const component = harness.routeDebugElement!.componentInstance as AuthComponent;
    component.navigate('/registro');
    await harness.fixture.whenStable();
    expect(router.url).toBe('/registro');
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('app-register')).toBeTruthy();
    await harness.navigateByUrl('/recuperar-password');
    expect(harness.routeNativeElement!.querySelector('app-forgot-password')).toBeTruthy();
  });

  it('routes to the requested private destination after successful login', async () => {
    const harness = await RouterTestingHarness.create('/app/usuarios');
    expect(router.url).toBe('/login?returnUrl=%2Fapp%2Fusuarios');
    const email = harness.routeNativeElement!.querySelector('input[type="email"]') as HTMLInputElement;
    const password = harness.routeNativeElement!.querySelector('input[type="password"]') as HTMLInputElement;
    email.value = 'admin@example.com'; email.dispatchEvent(new Event('input'));
    password.value = 'Password123!'; password.dispatchEvent(new Event('input'));
    // Subscribe before submitting: login updates a signal, whose component effect
    // starts navigation during Angular synchronization, not during whenStable().
    const navigation = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd)));
    harness.routeNativeElement!.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    TestBed.tick();
    await navigation;
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(session()?.user.role).toBe('ADMIN');
    expect(login).toHaveBeenCalled();
    expect(router.url).toBe('/app/usuarios');
    expect(harness.routeNativeElement!.querySelector('app-user-management')).toBeTruthy();
  });

  it('routes to login after logout from the extracted shell', async () => {
    session.set(loggedIn);
    const harness = await RouterTestingHarness.create('/app/proyectos');
    (harness.routeNativeElement!.querySelector('.sidebar-logout') as HTMLButtonElement).click();
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(session()).toBeNull();
    expect(router.url).toBe('/login');
  });

  it('restores sections with browser back and forward navigation', async () => {
    session.set(loggedIn);
    const harness = await RouterTestingHarness.create('/app/proyectos');
    await harness.navigateByUrl('/app/usuarios');
    // The harness navigates imperatively without bootstrapping the application.
    // initialNavigation installs the normal popstate listener; because a
    // navigation already ran, it does not start another one or replace history.
    router.initialNavigation();
    const location = TestBed.inject(Location);
    const backNavigation = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd)));
    location.back();
    await backNavigation;
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(router.url).toBe('/app/proyectos');
    const forwardNavigation = firstValueFrom(router.events.pipe(filter(event => event instanceof NavigationEnd)));
    location.forward();
    await forwardNavigation;
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(router.url).toBe('/app/usuarios');
  });

  it('reads a token only on the reset route, including when already signed in', async () => {
    const harness = await RouterTestingHarness.create('/login?token=not-a-reset');
    expect(harness.routeNativeElement!.querySelector('app-reset-password')).toBeNull();
    session.set(loggedIn);
    await harness.navigateByUrl('/reset-password?token=reset-token');
    const component = harness.routeDebugElement!.componentInstance as AuthComponent;
    expect(component.resetToken).toBe('reset-token');
    expect(harness.routeNativeElement!.querySelector('app-reset-password')).toBeTruthy();
  });

  it('opens public invitations separately from password recovery and handles unknown URLs', async () => {
    const harness = await RouterTestingHarness.create('/invitations/accept?token=invitation');
    expect(router.url).toBe('/invitations/accept?token=invitation');
    expect(harness.routeNativeElement!.textContent).toContain('Aceptar invitación');
    expect(harness.routeNativeElement!.querySelector('app-reset-password')).toBeNull();
    await harness.navigateByUrl('/unknown');
    expect(harness.routeNativeElement!.textContent).toContain('Página no disponible');
  });
});
