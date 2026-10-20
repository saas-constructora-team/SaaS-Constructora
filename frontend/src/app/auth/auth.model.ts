/**
 * Contratos del módulo identity (HU-01 / HU-13).
 * Tipos idénticos a los DTO de saas-backend/.../identity/interfaces/dto.
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: AuthUser;
}

export interface GoogleAuthRequest {
  idToken: string;
  companyName?: string;
}

export interface GoogleTenant {
  id: string;
  name: string;
  slug: string;
}

export interface GoogleAuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  newUser: boolean;
  tenant: GoogleTenant;
  user: AuthUser;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface MessageResponse {
  message: string;
}

/** HU-01: alta de una empresa (tenant) con su usuario administrador. */
export interface RegisterTenantRequest {
  companyName: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface RegisterTenantResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  tenant: GoogleTenant;
  user: AuthUser;
}

/** Tipos mínimos de Google Identity Services (script gsi/client). */
export interface GoogleCredentialResponse {
  credential: string;
}

export interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize(config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void;
      renderButton(
        container: HTMLElement,
        options: { theme?: string; size?: string; text?: string; shape?: string; width?: number; locale?: string }
      ): void;
    };
  };
}
