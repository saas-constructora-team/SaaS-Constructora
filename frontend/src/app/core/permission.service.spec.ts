import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LoginResponse } from '../auth/auth.model';
import { AuthService } from '../auth/auth.service';
import { AuthorizationUserResponse, ProjectAuthorizationContext, TenantRole } from './authorization.model';
import { PermissionService } from './permission.service';

function login(role: TenantRole, tenantId = 'tenant', token = 'token'): LoginResponse {
  return { accessToken: token, tokenType: 'Bearer', expiresInSeconds: 3600,
    user: { id: 'user', tenantId, role, email: 'user@example.com', fullName: 'User' } };
}

function response(allowed: boolean): AuthorizationUserResponse {
  return { id: 'user', email: 'user@example.com', fullName: 'User', role: 'MEMBER',
    active: true, canCreatePersonnel: allowed };
}

describe('PermissionService', () => {
  const scope = { tenantId: 'tenant', accessToken: 'token' };
  let session: ReturnType<typeof signal<LoginResponse | null>>;
  let service: PermissionService;
  beforeEach(() => {
    session = signal<LoginResponse | null>(null);
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { session } }] });
    service = TestBed.inject(PermissionService);
  });

  it('grants known administrative capabilities to ADMIN', () => {
    session.set(login('ADMIN'));
    expect(Object.values(service.capabilities()).every(state => state === 'granted')).toBeTrue();
  });

  for (const role of ['MEMBER', 'WORKER'] as const) {
    it(`denies administrative capabilities but leaves personnel unknown for ${role}`, () => {
      session.set(login(role));
      expect(service.capabilities()).toEqual({ administerUsers: 'denied', managePermissions: 'denied',
        createProjects: 'denied', deleteProjects: 'denied', managePersonnel: 'unknown' });
    });
  }

  it('denies capabilities without a session', () => {
    expect(Object.values(service.capabilities()).every(state => state === 'denied')).toBeTrue();
  });

  it('uses effective granted and denied personnel permissions from backend', () => {
    session.set(login('MEMBER'));
    expect(service.receivePersonnelPermissions(scope, response(true))).toBeTrue();
    expect(service.capabilities().managePersonnel).toBe('granted');
    service.receivePersonnelPermissions(scope, response(false));
    expect(service.capabilities().managePersonnel).toBe('denied');
    service.clearPersonnelPermissions();
    expect(service.capabilities().managePersonnel).toBe('unknown');
  });

  it('rejects other users, tenants and outdated tokens', () => {
    session.set(login('MEMBER'));
    expect(service.receivePersonnelPermissions(scope, { ...response(true), id: 'other' })).toBeFalse();
    expect(service.receivePersonnelPermissions({ ...scope, tenantId: 'other' }, response(true))).toBeFalse();
    expect(service.receivePersonnelPermissions({ ...scope, accessToken: 'old' }, response(true))).toBeFalse();
    expect(service.capabilities().managePersonnel).toBe('unknown');
  });

  it('clears additional permissions on session changes, including token renewal', () => {
    session.set(login('MEMBER'));
    service.receivePersonnelPermissions(scope, response(true));
    session.set(login('MEMBER', 'tenant', 'renewed'));
    expect(service.capabilities().managePersonnel).toBe('unknown');
    session.set(login('ADMIN', 'another', 'another-token'));
    expect(service.capabilities().createProjects).toBe('granted');
    session.set(login('WORKER', 'another', 'worker-token'));
    expect(service.capabilities().managePersonnel).toBe('unknown');
  });

  it('clears permissions on logout and does not reuse them after another login', () => {
    session.set(login('MEMBER'));
    service.receivePersonnelPermissions(scope, response(true));
    session.set(null);
    expect(service.capabilities().managePersonnel).toBe('denied');
    session.set(login('MEMBER'));
    expect(service.capabilities().managePersonnel).toBe('unknown');
  });

  it('evaluates MEMBER and LEAD project assignments from scoped data', () => {
    session.set(login('MEMBER'));
    const context: ProjectAuthorizationContext = { ...scope, projectId: 'project', assignment: {
      projectId: 'project', userId: 'user', projectRole: 'MEMBER' } };
    expect(service.manageProjectAssignments(context)).toBe('denied');
    expect(service.manageProjectAssignments({ ...context,
      assignment: { ...context.assignment!, projectRole: 'LEAD' } })).toBe('granted');
    expect(service.manageProjectAssignments({ ...context, assignment: undefined })).toBe('unknown');
    expect(service.manageProjectAssignments({ ...context, assignment: null })).toBe('denied');
  });

  it('rejects mismatched project assignment evidence', () => {
    session.set(login('MEMBER'));
    const context: ProjectAuthorizationContext = { ...scope, projectId: 'project', assignment: {
      projectId: 'different', userId: 'user', projectRole: 'LEAD' } };
    expect(service.manageProjectAssignments(context)).toBe('unknown');
    expect(service.manageProjectAssignments({ ...context, assignment: {
      projectId: 'project', userId: 'other', projectRole: 'LEAD' } })).toBe('unknown');
    session.set(login('MEMBER', 'another', 'another-token'));
    expect(service.manageProjectAssignments(context)).toBe('unknown');
  });

  it('allows ADMIN project management in its scope and denies logged-out access', () => {
    const context = { ...scope, projectId: 'project' };
    session.set(login('ADMIN'));
    expect(service.manageProjectAssignments(context)).toBe('granted');
    expect(service.manageProjectAssignments({ ...context, tenantId: 'other' })).toBe('unknown');
    session.set(null);
    expect(service.manageProjectAssignments(context)).toBe('denied');
  });
});
