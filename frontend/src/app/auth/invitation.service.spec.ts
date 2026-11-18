import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { InvitationService } from './invitation.service';
import { AuthService } from './auth.service';
import { authInterceptor } from '../core/auth.interceptor';
import { LoginResponse } from './auth.model';
import { InviteWorkerRequest } from './invitation.model';

const request: InviteWorkerRequest = { fullName: 'Worker', documentType: 'NATIONAL_ID', documentNumber: '123',
  phone: '123', email: 'worker@example.com', emergencyContactName: 'Contact', emergencyContactPhone: '456', position: 'Operario', role: 'WORKER' };
const session: LoginResponse = { accessToken: 'new-token', tokenType: 'Bearer', expiresInSeconds: 3600,
  user: { id: 'worker', tenantId: 'new-company', role: 'WORKER', fullName: 'Worker', email: request.email } };

describe('Invitation API and central session storage', () => {
  let http: HttpTestingController;
  let api: InvitationService;
  let auth: AuthService;
  beforeEach(() => {
    localStorage.setItem('constructora.session', JSON.stringify({ ...session, accessToken: 'old-token' }));
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController); api = TestBed.inject(InvitationService); auth = TestBed.inject(AuthService);
  });
  afterEach(() => { http.verify(); localStorage.removeItem('constructora.session'); });

  it('posts an invitation with bearer and no project when omitted', () => {
    api.invite(request).subscribe();
    const call = http.expectOne('/api/personnel/invite');
    expect(call.request.method).toBe('POST');
    expect(call.request.headers.get('Authorization')).toBe('Bearer old-token');
    expect(call.request.body.projectId).toBeUndefined();
    call.flush({ workerId: 'worker', membershipId: 'membership', userId: 'worker', email: request.email,
      status: 'INVITED', invitationExpiresAt: '2027-01-01T12:00:00' });
  });
  it('previews publicly even with a previous bearer session', () => {
    api.preview('token').subscribe();
    const call = http.expectOne('/api/auth/invitations/token');
    expect(call.request.headers.has('Authorization')).toBeFalse();
    call.flush({ companyName: 'Company', email: request.email, expiresAt: '2027-01-01T12:00:00' });
  });
  it('accepts an existing account without an empty password and stores the returned session centrally', () => {
    auth.acceptInvitation({ token: 'token' }).subscribe();
    const call = http.expectOne('/api/auth/invitations/accept');
    expect(call.request.headers.has('Authorization')).toBeFalse();
    expect(call.request.body).toEqual({ token: 'token' });
    call.flush(session);
    expect(auth.session()).toEqual(session);
    expect(JSON.parse(localStorage.getItem('constructora.session')!)).toEqual(session);
  });
  it('sends the new account password', () => {
    auth.acceptInvitation({ token: 'token', password: '12345678' }).subscribe();
    const call = http.expectOne('/api/auth/invitations/accept');
    expect(call.request.body.password).toBe('12345678'); call.flush(session);
  });
  it('preserves the old session when acceptance fails', () => {
    const previous = auth.session();
    auth.acceptInvitation({ token: 'token' }).subscribe({ error: () => {} });
    http.expectOne('/api/auth/invitations/accept').flush({}, { status: 400, statusText: 'Invalid' });
    expect(auth.session()).toBe(previous);
  });
  it('does not replace a newer session with a late acceptance response', () => {
    auth.acceptInvitation({ token: 'token' }).subscribe({ error: () => {} });
    auth.logout();
    http.expectOne('/api/auth/invitations/accept').flush(session);
    expect(auth.session()).toBeNull();
  });
});
