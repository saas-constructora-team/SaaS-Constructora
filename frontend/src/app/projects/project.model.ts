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
  /** Etapa en curso compartida por todos los miembros con acceso al proyecto. */
  currentStageId: string | null;
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

/** Colores Sage permitidos para representar una etapa en el tablero. */
export type StageColor = 'SAGE' | 'LAVENDER' | 'SAND' | 'TOSCA' | 'ACCENT';

/** Etapa de un proyecto (las seis iniciales se crean con el proyecto). */
export interface ProjectStage {
  id: string;
  projectId: string;
  name: string;
  order: number;
  color: StageColor;
  createdAt: string;
}

/** Cuerpo de alta o edición de una etapa; el color ausente se conserva. */
export interface ProjectStageRequest {
  name: string;
  color?: StageColor | null;
}

/** Una etapa concreta dentro del cambio atómico de color del tablero. */
export interface StageColorUpdate {
  projectId: string;
  stageId: string;
  color: StageColor;
}

/** Cambia el color de varias etapas en una sola transacción. */
export interface UpdateStageColorsRequest {
  stages: StageColorUpdate[];
}

/** Avance compartido del proyecto, persistido en el backend. */
export interface ProjectProgress {
  projectId: string;
  currentStageId: string | null;
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

/** Aviso SSE: solo metadatos; los datos se vuelven a consultar por la API. */
export interface ProjectChangeEvent {
  eventId: string;
  tenantId: string;
  projectId: string;
  section: 'PROJECT' | 'STAGE' | 'PROGRESS' | 'ASSIGNMENT' | 'SITE_LOG' | 'DOCUMENT';
  entityId: string | null;
  actorUserId: string | null;
  occurredAt: string;
}
