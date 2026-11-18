export type DocumentType = 'NATIONAL_ID' | 'FOREIGN_ID' | 'PASSPORT' | 'IDENTITY_CARD' | 'OTHER';
export type InvitationRole = 'WORKER' | 'MEMBER';
export interface InviteWorkerRequest {
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  phone: string;
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  position: string;
  projectId?: string | null;
  role?: InvitationRole;
}
export interface InviteWorkerResponse {
  workerId: string | null;
  membershipId: string;
  userId: string;
  email: string;
  status: string;
  invitationExpiresAt: string;
}
export interface InvitationPreview {
  companyName: string;
  email: string;
  expiresAt: string;
}
export interface AcceptInvitationRequest {
  token: string;
  password?: string | null;
}
