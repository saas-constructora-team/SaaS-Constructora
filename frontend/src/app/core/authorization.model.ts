/** Roles supported by the API, not additional frontend permissions. */
export type TenantRole = 'ADMIN' | 'MEMBER' | 'WORKER';
export type ProjectRole = 'MEMBER' | 'LEAD';
export type CapabilityState = 'granted' | 'denied' | 'unknown';

/** UI capabilities derived from backend rules; these are not JWT claims. */
export interface KnownCapabilities {
  administerUsers: CapabilityState;
  managePermissions: CapabilityState;
  createProjects: CapabilityState;
  deleteProjects: CapabilityState;
  managePersonnel: CapabilityState;
}

/** Exact response of GET /api/users and the four permission POST endpoints. */
export interface AuthorizationUserResponse {
  id: string;
  email: string;
  fullName: string;
  role: TenantRole;
  active: boolean;
  canCreatePersonnel: boolean;
}

/** Scope captured when a request starts, to reject stale or cross-tenant data. */
export interface AuthorizationScope {
  tenantId: string;
  accessToken: string;
}

/** Relevant fields of ProjectAssignmentResponse, including its real project role. */
export interface ProjectAssignmentAuthorization {
  projectId: string;
  userId: string;
  projectRole: ProjectRole;
}

export interface ProjectAuthorizationContext extends AuthorizationScope {
  projectId: string;
  /** undefined: not loaded; null: confirmed absence; object: server assignment. */
  assignment?: ProjectAssignmentAuthorization | null;
}
