import { TenantRole } from '../core/authorization.model';

export interface AccountUser {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  username?: string | null;
  role: TenantRole;
}

export interface AccountCompany {
  id: string;
  name: string;
  slug: string;
  tradeName?: string | null;
  taxId?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  companyEmail?: string | null;
  ownerUserId?: string | null;
}

export interface AccountProfileResponse {
  user: AccountUser;
  company: AccountCompany;
  tenantOwner: boolean;
  canEditCompany: boolean;
}

export interface UpdateAccountProfileRequest {
  fullName?: string;
  username?: string | null;
}

export interface UpdateCompanyRequest {
  name: string;
  tradeName?: string | null;
  taxId: string;
  contactPhone?: string | null;
  address: string;
  companyEmail?: string | null;
}
