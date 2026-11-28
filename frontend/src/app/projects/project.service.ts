import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiError } from '../core/api-error.model';
import {
  CreateProjectRequest,
  Project,
  ProjectAssignment,
  ProjectProgress,
  ProjectStage,
  ProjectStageRequest,
  UpdateProjectRequest,
  UpdateStageColorsRequest
} from './project.model';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/projects';

  list(): Observable<Project[]> {
    return this.http.get<Project[]>(this.apiUrl);
  }

  create(req: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, req);
  }

  update(id: string, req: UpdateProjectRequest): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  listAssignments(projectId: string): Observable<ProjectAssignment[]> {
    return this.http.get<ProjectAssignment[]>(`${this.apiUrl}/${projectId}/assignments`);
  }

  assign(projectId: string, userId: string): Observable<ProjectAssignment> {
    return this.http.post<ProjectAssignment>(
      `${this.apiUrl}/${projectId}/assignments`,
      { userId }
    );
  }

  unassign(projectId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${projectId}/assignments/${userId}`);
  }

  listStages(projectId: string): Observable<ProjectStage[]> {
    return this.http.get<ProjectStage[]>(`${this.apiUrl}/${projectId}/stages`);
  }

  createStage(projectId: string, req: ProjectStageRequest): Observable<ProjectStage> {
    return this.http.post<ProjectStage>(`${this.apiUrl}/${projectId}/stages`, req);
  }

  updateStage(
    projectId: string,
    stageId: string,
    req: ProjectStageRequest
  ): Observable<ProjectStage> {
    return this.http.put<ProjectStage>(
      `${this.apiUrl}/${projectId}/stages/${stageId}`,
      req
    );
  }

  /** Guarda en una sola transacción el color de todas las etapas indicadas. */
  updateStageColors(req: UpdateStageColorsRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/stages/color`, req);
  }

  deleteStage(projectId: string, stageId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${projectId}/stages/${stageId}`);
  }

  /** Etapa en curso compartida: se persiste en el backend, no en el navegador. */
  getProgress(projectId: string): Observable<ProjectProgress> {
    return this.http.get<ProjectProgress>(`${this.apiUrl}/${projectId}/progress`);
  }

  selectStage(projectId: string, stageId: string): Observable<ProjectProgress> {
    return this.http.put<ProjectProgress>(`${this.apiUrl}/${projectId}/progress`, { stageId });
  }
}

/** Traduce los errores del backend de proyectos a un mensaje para la persona usuaria. */
export function projectErrorMessage(error: HttpErrorResponse): string {
  const body = error.error as Partial<ApiError> | null;

  const validationDetails = body?.details
    ? Object.values(body.details).filter((value): value is string => typeof value === 'string' && !!value)
    : [];
  const detailsMessage = validationDetails.length > 0 ? validationDetails.join(' ') : null;
  const apiMessage =
    (body?.code === 'VALIDATION_ERROR' && detailsMessage) ||
    (typeof body?.message === 'string' && body.message) ||
    detailsMessage;

  // Los errores 5xx nunca se toman del body: pueden contener detalles internos.
  if (error.status === 503) {
    return body?.code === 'SERVICE_UNAVAILABLE'
      ? 'El servicio no está disponible en este momento. Intenta de nuevo en unos segundos.'
      : 'El servicio no está disponible temporalmente.';
  }
  if (error.status >= 500) {
    return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  }

  switch (error.status) {
    case 400: return apiMessage ?? 'Los datos del proyecto no son válidos.';
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return 'No tienes permiso para realizar esta acción.';
    case 404: return apiMessage ?? 'No se encontró el proyecto solicitado.';
    case 409: return apiMessage ?? 'La operación entra en conflicto con el estado actual.';
    case 413: return apiMessage ?? 'El archivo supera el tamaño permitido.';
    case 0: return 'No se pudo conectar con el servidor. Verifica que esté en ejecución.';
    default: return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  }
}
