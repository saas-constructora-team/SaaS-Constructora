import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateProjectRequest,
  Project,
  ProjectAssignment,
  ProjectStage,
  ProjectStageRequest,
  UpdateProjectRequest
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

  deleteStage(projectId: string, stageId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${projectId}/stages/${stageId}`);
  }
}

/** Traduce los errores del backend de proyectos a un mensaje para la persona usuaria. */
export function projectErrorMessage(error: HttpErrorResponse): string {
  const body = error.error as {
    message?: unknown;
    detail?: unknown;
    errors?: Array<{ defaultMessage?: string }>;
  } | null;

  const apiMessage =
    (typeof body?.message === 'string' && body.message) ||
    (typeof body?.detail === 'string' && body.detail) ||
    (Array.isArray(body?.errors)
      ? body.errors.map(e => e.defaultMessage).filter((m): m is string => !!m).join(' ')
      : null);

  switch (error.status) {
    case 400: return apiMessage ?? 'Los datos del proyecto no son válidos.';
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return 'No tienes permiso para realizar esta acción.';
    case 404: return apiMessage ?? 'No se encontró el proyecto solicitado.';
    case 409: return apiMessage ?? 'La operación entra en conflicto con el estado actual.';
    case 0: return 'No se pudo conectar con el servidor. Verifica que esté en ejecución.';
    default: return apiMessage ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  }
}
