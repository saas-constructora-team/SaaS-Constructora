import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { UserManagementComponent } from './user-management.component';
import { UserService } from './user.service';
import { AuthService } from '../auth/auth.service';
import { LoginResponse } from '../auth/auth.model';
import { UserSummary } from './user.model';

const admin: UserSummary = { id: '1', email: 'admin@example.com', fullName: 'Admin User',
  role: 'ADMIN', active: true, canCreatePersonnel: true };
const member: UserSummary = { id: '2', email: 'member@example.com', fullName: 'Member User',
  role: 'MEMBER', active: true, canCreatePersonnel: false };
const initialSession: LoginResponse = { accessToken: 'token', tokenType: 'Bearer', expiresInSeconds: 3600,
  user: { ...admin, tenantId: 'tenant' } };

describe('UserManagementComponent', () => {
  let fixture: ComponentFixture<UserManagementComponent>;
  let component: UserManagementComponent;
  let api: jasmine.SpyObj<UserService>;
  let session: ReturnType<typeof signal<LoginResponse | null>>;
  let confirm: jasmine.Spy;
  let logout: jasmine.Spy;

  beforeEach(() => {
    session = signal<LoginResponse | null>(initialSession);
    logout = jasmine.createSpy('logout').and.callFake(() => session.set(null));
    api = jasmine.createSpyObj<UserService>('UserService', ['list', 'enablePermissions',
      'disablePermissions', 'enablePersonnelCreation', 'disablePersonnelCreation']);
    api.list.and.returnValue(of([admin, member]));
    api.enablePermissions.and.returnValue(of({ ...member, role: 'ADMIN', canCreatePersonnel: true }));
    api.disablePermissions.and.returnValue(of({ ...admin, role: 'MEMBER', canCreatePersonnel: false }));
    api.enablePersonnelCreation.and.returnValue(of({ ...member, canCreatePersonnel: true }));
    api.disablePersonnelCreation.and.returnValue(of(member));
    confirm = spyOn(window, 'confirm').and.returnValue(true);
    TestBed.configureTestingModule({ imports: [UserManagementComponent], providers: [
      { provide: UserService, useValue: api }, { provide: AuthService, useValue: { session, logout } }
    ] });
    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
  });

  it('shows the invite button only when personnel management is granted', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Invitar trabajador');
    component.permissions.receivePersonnelPermissions({ tenantId: 'tenant', accessToken: 'token' },
      { ...admin, canCreatePersonnel: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Invitar trabajador');
  });

  it('shows users, effective personnel capability and admin actions', () => {
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain(admin.email);
    expect(rows[0].textContent).toContain('Permitida');
    expect(rows[1].textContent).toContain('No permitida');
    expect(fixture.nativeElement.querySelectorAll('.user-permission-actions').length).toBe(2);
  });

  for (const role of ['MEMBER', 'WORKER', 'UNRECOGNIZED']) {
    it(`does not load or mutate users for ${role}`, () => {
      session.set({ ...initialSession, user: { ...initialSession.user, role } });
      fixture.detectChanges();
      component.changePermission(member, 'promote');
      expect(api.list).not.toHaveBeenCalled();
      expect(api.enablePermissions).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('.user-permission-actions')).toBeNull();
    });
  }

  it('denies operations without a session', () => {
    session.set(null);
    fixture.detectChanges();
    component.changePermission(member, 'promote');
    expect(api.list).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('promotes to ADMIN after confirmation and refreshes the row from the response', () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('tbody tr')[1].querySelectorAll('button');
    buttons[0].click();
    fixture.detectChanges();
    expect(confirm).toHaveBeenCalled();
    expect(api.enablePermissions).toHaveBeenCalledOnceWith('2');
    expect(component.users()[1].role).toBe('ADMIN');
    expect(fixture.nativeElement.querySelectorAll('tbody tr')[1].textContent).toContain('Cambiar a MEMBER');
    expect(component.notice()).toContain('Permisos actualizados');
  });

  it('changes another ADMIN to MEMBER without deactivating the account', () => {
    const other = { ...admin, id: '3', fullName: 'Other Admin' };
    api.list.and.returnValue(of([admin, other]));
    api.disablePermissions.and.returnValue(of({ ...other, role: 'MEMBER' }));
    fixture.detectChanges();
    component.changePermission(other, 'demote');
    expect(api.disablePermissions).toHaveBeenCalledOnceWith('3');
    expect(component.users()[1].role).toBe('MEMBER');
    expect(component.users()[1].active).toBeTrue();
    expect(logout).not.toHaveBeenCalled();
  });

  it('grants personnel management', () => {
    fixture.detectChanges();
    component.changePermission(member, 'grantPersonnel');
    expect(api.enablePersonnelCreation).toHaveBeenCalledOnceWith('2');
    expect(component.users()[1].canCreatePersonnel).toBeTrue();
  });

  it('revokes personnel management using the returned effective capability', () => {
    const allowed = { ...member, canCreatePersonnel: true };
    api.list.and.returnValue(of([admin, allowed]));
    fixture.detectChanges();
    component.changePermission(allowed, 'revokePersonnel');
    expect(api.disablePersonnelCreation).toHaveBeenCalledOnceWith('2');
    expect(component.users()[1].canCreatePersonnel).toBeFalse();
  });

  it('does not offer an ineffective personnel revocation for ADMIN', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr')[0].querySelectorAll('button').length).toBe(1);
    component.changePermission(admin, 'revokePersonnel');
    expect(api.disablePersonnelCreation).not.toHaveBeenCalled();
  });

  it('cancels without a request', () => {
    fixture.detectChanges();
    confirm.and.returnValue(false);
    component.changePermission(member, 'promote');
    expect(api.enablePermissions).not.toHaveBeenCalled();
    expect(component.users()[1]).toEqual(member);
  });

  it('disables mutation buttons during a request and prevents duplicate requests', () => {
    const pending = new Subject<UserSummary>();
    api.enablePermissions.and.returnValue(pending);
    fixture.detectChanges();
    component.changePermission(member, 'promote');
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.user-permission-actions button') as NodeListOf<HTMLButtonElement>;
    expect(Array.from(buttons).every(button => button.disabled)).toBeTrue();
    component.changePermission(member, 'promote');
    expect(api.enablePermissions).toHaveBeenCalledTimes(1);
    pending.next({ ...member, role: 'ADMIN', canCreatePersonnel: true });
    pending.complete();
    expect(component.saving()).toBeFalse();
  });

  for (const status of [401, 403, 404, 409, 500, 0]) {
    it(`handles mutation HTTP ${status} without exposing internal messages`, () => {
      fixture.detectChanges();
      api.enablePermissions.and.returnValue(throwError(() => new HttpErrorResponse({
        status, error: { message: 'SQL INTERNAL SECRET' }
      })));
      component.changePermission(member, 'promote');
      expect(component.error()).toBeTruthy();
      expect(component.error()).not.toContain('SQL INTERNAL');
      expect(component.saving()).toBeFalse();
      expect(component.notice()).toBeNull();
      if (status === 401) expect(logout).toHaveBeenCalled();
      if (status === 403) expect(component.canManagePermissions()).toBeFalse();
    });
  }

  it('handles list errors', () => {
    api.list.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    fixture.detectChanges();
    expect(component.loading()).toBeFalse();
    expect(component.error()).toContain('No tienes permisos');
  });

  it('closes the existing session after self-demotion, without rewriting its token', () => {
    fixture.detectChanges();
    component.changePermission(admin, 'demote');
    expect(confirm.calls.mostRecent().args[0]).toContain('Tu sesión se cerrará');
    expect(logout).toHaveBeenCalled();
    expect(session()).toBeNull();
  });

  it('ignores a response from a previous tenant session', () => {
    const pending = new Subject<UserSummary>();
    api.enablePermissions.and.returnValue(pending);
    fixture.detectChanges();
    component.changePermission(member, 'promote');
    session.set({ ...initialSession, accessToken: 'new', user: { ...initialSession.user, tenantId: 'other' } });
    pending.next({ ...member, role: 'ADMIN', canCreatePersonnel: true });
    expect(component.users()).toEqual([]);
    expect(component.notice()).toBeNull();
  });
});
