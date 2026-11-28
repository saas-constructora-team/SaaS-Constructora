import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { LoginResponse } from '../auth/auth.model';
import { InvitationService } from '../auth/invitation.service';
import { ProjectService } from '../projects/project.service';
import { InviteWorkerFormComponent } from './invite-worker-form.component';
import { InviteWorkerResponse } from '../auth/invitation.model';

const valid = { fullName: 'Worker', username: '', documentType: 'NATIONAL_ID' as const, documentNumber: '123', phone: '123',
  email: 'worker@example.com', emergencyContactName: 'Contact', emergencyContactPhone: '456', position: 'Operario', role: 'WORKER' as const, projectId: '' };
const response: InviteWorkerResponse = { workerId: 'worker', membershipId: 'membership', userId: 'worker',
  email: valid.email, status: 'INVITED', invitationExpiresAt: '2027-01-01T12:00:00' };

describe('InviteWorkerFormComponent', () => {
  let api: jasmine.SpyObj<InvitationService>;
  let session: ReturnType<typeof signal<LoginResponse | null>>;
  beforeEach(() => {
    session = signal<LoginResponse | null>({ accessToken: 'token', tokenType: 'Bearer', expiresInSeconds: 3600,
      user: { id: 'admin', tenantId: 'tenant', role: 'ADMIN', fullName: 'Admin', email: 'admin@example.com' } });
    api = jasmine.createSpyObj('InvitationService', ['invite']); api.invite.and.returnValue(of(response));
    TestBed.configureTestingModule({ imports: [InviteWorkerFormComponent], providers: [
      { provide: InvitationService, useValue: api }, { provide: AuthService, useValue: { session } },
      { provide: ProjectService, useValue: { list: () => of([{ id: 'project', name: 'Project' }]) } }
    ] });
  });
  it('defaults to WORKER, rejects invalid fields and reveals validation errors', () => {
    const fixture = TestBed.createComponent(InviteWorkerFormComponent); const c = fixture.componentInstance;
    c.submit(); fixture.detectChanges();
    expect(c.form.controls.role.value).toBe('WORKER');
    expect(fixture.nativeElement.textContent).toContain('Este campo es obligatorio');
    expect(api.invite).not.toHaveBeenCalled();
    c.form.setValue({ ...valid, fullName: ' ', email: 'invalid' }); c.submit();
    expect(api.invite).not.toHaveBeenCalled();
    c.form.controls.documentNumber.setValue('1'.repeat(51));
    expect(c.form.controls.documentNumber.hasError('maxlength')).toBeTrue();
  });
  it('invites without projectId and explains that assignment is later', () => {
    const fixture = TestBed.createComponent(InviteWorkerFormComponent); const c = fixture.componentInstance;
    c.form.setValue(valid); c.submit(); fixture.detectChanges();
    const { projectId, username, ...payload } = valid;
    expect(api.invite).toHaveBeenCalledOnceWith({
      ...payload,
      ...(username ? { username: username.toLowerCase() } : {})
    });
    expect(c.sent()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('pendiente de aceptación');
    c.submit(); expect(api.invite).toHaveBeenCalledTimes(1);
  });
  it('sends a selected real project without assigning the account', () => {
    const c = TestBed.createComponent(InviteWorkerFormComponent).componentInstance;
    c.form.setValue({ ...valid, projectId: 'project' }); c.submit();
    expect(api.invite.calls.mostRecent().args[0].projectId).toBe('project');
  });
  it('blocks duplicates while sending', () => {
    const pending = new Subject<InviteWorkerResponse>(); api.invite.and.returnValue(pending);
    const c = TestBed.createComponent(InviteWorkerFormComponent).componentInstance;
    c.form.setValue(valid); c.submit(); c.submit();
    expect(api.invite).toHaveBeenCalledTimes(1); expect(c.saving()).toBeTrue();
  });
  for (const status of [0, 400, 401, 403, 404, 409, 500]) {
    it(`handles HTTP ${status} without internal messages`, () => {
      api.invite.and.returnValue(throwError(() => ({ status, error: { message: 'SQL SECRET' } })));
      const c = TestBed.createComponent(InviteWorkerFormComponent).componentInstance;
      c.form.setValue(valid); c.submit(); expect(c.saving()).toBeFalse();
      expect(c.error()).toBeTruthy(); expect(c.error()).not.toContain('SECRET');
    });
  }
  it('does not send when personnel capability is unknown', () => {
    session.update(s => ({ ...s!, user: { ...s!.user, role: 'MEMBER' } }));
    const c = TestBed.createComponent(InviteWorkerFormComponent).componentInstance;
    c.form.setValue(valid); c.submit(); expect(api.invite).not.toHaveBeenCalled();
  });
});
