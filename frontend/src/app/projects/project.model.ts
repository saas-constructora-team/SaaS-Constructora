export type ProjectType = 'RESIDENTIAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'MIXED';

export type BudgetRange =
  | 'UNDER_50M'
  | 'FROM_50M_TO_100M'
  | 'FROM_100M_TO_250M'
  | 'FROM_250M_TO_500M'
  | 'OVER_500M';

export type LotOwnership = 'OWNED' | 'IN_PURCHASE' | 'RENTED';

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  clientName: string | null;
  location: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  projectType: ProjectType | null;
  propertyUse: ProjectType | null;
  estimatedArea: number | null;
  occupantCount: number | null;
  requiredSpaces: string | null;
  styleReferences: string | null;
  budgetRange: BudgetRange | null;
  estimatedStartDate: string | null;
  estimatedDeliveryDate: string | null;
  lotOwnership: LotOwnership | null;
  hasDeeds: boolean;
  hasTopographicSurvey: boolean;
  hasPreviousPlans: boolean;
  hasSitePhotos: boolean;
  status: string;
  createdAt: string;
}

export interface CreateProjectRequest {
  name: string;
  clientName: string | null;
  location: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  projectType: ProjectType | null;
  propertyUse: ProjectType | null;
  estimatedArea: number | null;
  occupantCount: number | null;
  requiredSpaces: string | null;
  styleReferences: string | null;
  budgetRange: BudgetRange | null;
  estimatedStartDate: string | null;
  estimatedDeliveryDate: string | null;
  lotOwnership: LotOwnership | null;
  hasDeeds: boolean;
  hasTopographicSurvey: boolean;
  hasPreviousPlans: boolean;
  hasSitePhotos: boolean;
}

export interface UpdateProjectRequest extends CreateProjectRequest {}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  userId: string;
  userFullName: string | null;
  userEmail: string | null;
  userRole: string | null;
  assignedAt: string;
}
