import { computed, inject, Injectable, linkedSignal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import {
  AuthorizationScope, AuthorizationUserResponse, CapabilityState,
  KnownCapabilities, ProjectAuthorizationContext, TenantRole
} from './authorization.model';

/** Navigation/UI decisions only. The API remains the authority for every operation. */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly auth = inject(AuthService);
  private readonly personnel = linkedSignal({
    source: this.auth.session,
    computation: (): boolean | null => null
  });
  private readonly siteLog = linkedSignal({
    source: this.auth.session,
    computation: (): boolean | null => null
  });

  readonly tenantRole = computed<TenantRole | null>(() => {
    const role = this.auth.session()?.user.role;
    return role === 'ADMIN' || role === 'MEMBER' || role === 'WORKER' ? role : null;
  });

  readonly capabilities = computed<KnownCapabilities>(() => {
    const administrative = this.administrativeCapability();
    return {
      administerUsers: administrative,
      managePermissions: administrative,
      createProjects: administrative,
      deleteProjects: administrative,
      managePersonnel: this.personnelCapability(),
      manageSiteLog: this.siteLogCapability()
    };
  });

  /** No HTTP request: callers must supply an actual API response for this user. */
  receivePersonnelPermissions(scope: AuthorizationScope, user: AuthorizationUserResponse): boolean {
    const session = this.auth.session();
    if (!session || !this.matchesScope(scope) || user.id !== session.user.id) return false;
    // canCreatePersonnel is the effective capability, not the raw membership flag.
    this.personnel.set(user.active && user.canCreatePersonnel);
    return true;
  }

  clearPersonnelPermissions(): void {
    this.personnel.set(null);
  }

  /** No HTTP request: callers must supply an actual API response for this user. */
  receiveSiteLogPermissions(scope: AuthorizationScope, user: AuthorizationUserResponse): boolean {
    const session = this.auth.session();
    if (!session || !this.matchesScope(scope) || user.id !== session.user.id) return false;
    // canManageSiteLog is the effective capability, not the raw membership flag.
    this.siteLog.set(user.active && user.canManageSiteLog);
    return true;
  }

  clearSiteLogPermissions(): void {
    this.siteLog.set(null);
  }

  manageProjectAssignments(context: ProjectAuthorizationContext): CapabilityState {
    if (!this.auth.session()) return 'denied';
    if (!this.matchesScope(context)) return 'unknown';
    if (this.tenantRole() === null) return 'unknown';
    if (this.tenantRole() === 'ADMIN') return 'granted';
    const assignment = context.assignment;
    if (assignment === undefined) return 'unknown';
    if (assignment === null) return 'denied';
    if (assignment.projectId !== context.projectId
      || assignment.userId !== this.auth.session()!.user.id) return 'unknown';
    // Mirrors ProjectAssignmentService: ADMIN or an actual LEAD assignment.
    if (assignment.projectRole === 'LEAD') return 'granted';
    return assignment.projectRole === 'MEMBER' ? 'denied' : 'unknown';
  }

  private administrativeCapability(): CapabilityState {
    if (!this.auth.session()) return 'denied';
    const role = this.tenantRole();
    return role === null ? 'unknown' : role === 'ADMIN' ? 'granted' : 'denied';
  }

  private personnelCapability(): CapabilityState {
    if (!this.auth.session()) return 'denied';
    const effective = this.personnel();
    if (effective !== null) return effective ? 'granted' : 'denied';
    if (this.tenantRole() === 'ADMIN') return 'granted';
    // The backend flag can affect non-admin roles; absence is not a denial.
    return 'unknown';
  }

  private siteLogCapability(): CapabilityState {
    if (!this.auth.session()) return 'denied';
    const effective = this.siteLog();
    if (effective !== null) return effective ? 'granted' : 'denied';
    if (this.tenantRole() === 'ADMIN') return 'granted';
    // The backend flag can affect non-admin roles; absence is not a denial.
    return 'unknown';
  }

  private matchesScope(scope: AuthorizationScope): boolean {
    const session = this.auth.session();
    return !!session && scope.tenantId === session.user.tenantId
      && scope.accessToken === session.accessToken;
  }
}
