import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { AcceptInvitationComponent } from './accept-invitation.component';
import { AuthService } from './auth.service';
import { LoginResponse } from './auth.model';
import { InvitationService } from './invitation.service';

const result: LoginResponse = { accessToken: 'new-token', tokenType: 'Bearer', expiresInSeconds: 3600,
  user: { id: 'worker', tenantId: 'new-company', role: 'WORKER', fullName: 'Worker', email: 'worker@example.com' } };

describe('AcceptInvitationComponent', () => {
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let session: ReturnType<typeof signal<LoginResponse | null>>;
  let preview: jasmine.Spy;
  let accept: jasmine.Spy;
  let navigate: jasmine.Spy;
  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ token: 'token' }));
    session = signal<LoginResponse | null>(null);
    preview = jasmine.createSpy('preview').and.returnValue(of({ companyName: 'Company', email: result.user.email, expiresAt: '2027-01-01T12:00:00', requiresPassword: true }));
    accept = jasmine.createSpy('acceptInvitation').and.returnValue(of(result));
    navigate = jasmine.createSpy('navigateByUrl').and.resolveTo(true);
    TestBed.configureTestingModule({ imports: [AcceptInvitationComponent], providers: [
      { provide: ActivatedRoute, useValue: { queryParamMap: params } },
      { provide: Router, useValue: { navigateByUrl: navigate } },
      { provide: InvitationService, useValue: { preview } },
      { provide: AuthService, useValue: { session, acceptInvitation: accept } }
    ] });
    // RouterLink uses the real Router API; keep these tests focused on the form.
    TestBed.overrideComponent(AcceptInvitationComponent, { set: { template: '' } });
  });
  it('previews a public invitation', () => {
    const c = TestBed.createComponent(AcceptInvitationComponent).componentInstance;
    expect(preview).toHaveBeenCalledOnceWith('token'); expect(c.preview()?.companyName).toBe('Company');
  });
  it('rejects a missing token without a request', () => {
    params.next(convertToParamMap({}));
    const c = TestBed.createComponent(AcceptInvitationComponent).componentInstance;
    c.accept(); expect(preview).not.toHaveBeenCalled(); expect(accept).not.toHaveBeenCalled(); expect(c.error()).toContain('no contiene');
  });
  it('shows an expired, used or invalid token without an acceptance form', () => {
    preview.and.returnValue(throwError(() => ({ status: 400 })));
    const c = TestBed.createComponent(AcceptInvitationComponent).componentInstance;
    expect(c.preview()).toBeNull(); expect(c.error()).toContain('ha vencido'); c.accept(); expect(accept).not.toHaveBeenCalled();
  });
  it('requires a new-account password of 8 to 100 characters and confirmation', () => {
    const c = TestBed.createComponent(AcceptInvitationComponent).componentInstance;
    for (const password of ['', 'short', 'x'.repeat(101)]) {
      c.form.patchValue({ password, confirmPassword: password }); c.accept();
    }
    c.form.patchValue({ password: '12345678', confirmPassword: 'different' }); c.accept();
    expect(accept).not.toHaveBeenCalled();
  });
  it('accepts a new account and navigates to projects', () => {
    const c = TestBed.createComponent(AcceptInvitationComponent).componentInstance;
    c.form.patchValue({ password: '12345678', confirmPassword: '12345678' }); c.accept();
    expect(accept).toHaveBeenCalledOnceWith({ token: 'token', password: '12345678' });
    expect(navigate).toHaveBeenCalledOnceWith('/app/proyectos', { replaceUrl: true });
    expect(c.accepted()).toBeTrue(); expect(c.form.controls.password.value).toBe('');
  });
  it('accepts an existing account without asking for or sending its password', () => {
    preview.and.returnValue(of({ companyName: 'Company', email: result.user.email, expiresAt: '2027-01-01T12:00:00', requiresPassword: false }));
    const c = TestBed.createComponent(AcceptInvitationComponent).componentInstance;
    c.accept();
    expect(accept).toHaveBeenCalledOnceWith({ token: 'token' });
  });
  it('accepts an existing account even when another company session is open', () => {
    preview.and.returnValue(of({ companyName: 'Company', email: result.user.email, expiresAt: '2027-01-01T12:00:00', requiresPassword: false }));
    session.set({ ...result, accessToken: 'previous', user: { ...result.user, tenantId: 'previous-company' } });
    const c = TestBed.createComponent(AcceptInvitationComponent).componentInstance;
    c.accept();
    expect(accept).toHaveBeenCalledOnceWith({ token: 'token' });
    expect(c.error()).toBeNull();
  });
  it('prevents duplicate acceptance requests', () => {
    preview.and.returnValue(of({ companyName: 'Company', email: result.user.email, expiresAt: '2027-01-01T12:00:00', requiresPassword: false }));
    const pending = new Subject<LoginResponse>(); accept.and.returnValue(pending);
    const c = TestBed.createComponent(AcceptInvitationComponent).componentInstance;
    c.accept(); c.accept();
    expect(accept).toHaveBeenCalledTimes(1);
  });
  it('handles an invalid or expired token response without claiming success', () => {
    accept.and.returnValue(throwError(() => ({ status: 400 })));
    const c = TestBed.createComponent(AcceptInvitationComponent).componentInstance;
    c.form.patchValue({ password: '12345678', confirmPassword: '12345678' }); c.accept();
    expect(c.error()).toContain('No se pudo aceptar la invitación'); expect(navigate).not.toHaveBeenCalled(); expect(c.saving()).toBeFalse();
  });
  it('cancels acceptance if the link changes and discards a late result', () => {
    preview.and.returnValue(of({ companyName: 'Company', email: result.user.email, expiresAt: '2027-01-01T12:00:00', requiresPassword: false }));
    const pending = new Subject<LoginResponse>(); accept.and.returnValue(pending);
    const c = TestBed.createComponent(AcceptInvitationComponent).componentInstance;
    c.accept();
    params.next(convertToParamMap({ token: 'another' })); pending.next(result);
    expect(navigate).not.toHaveBeenCalled(); expect(c.saving()).toBeFalse();
  });
});
