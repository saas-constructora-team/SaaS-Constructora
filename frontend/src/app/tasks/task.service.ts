import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateTaskRequest,
  MoveTaskRequest,
  Task,
  TaskArea,
  TaskBoard,
  TaskStatusInfo
} from './task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/tasks';

  /** Una sola lectura para el tablero; el backend resuelve la visibilidad por tenant y rol. */
  getBoard(projectId?: string | null): Observable<TaskBoard> {
    let params = new HttpParams();
    if (projectId) {
      params = params.set('projectId', projectId);
    }
    return this.http.get<TaskBoard>(`${this.apiUrl}/board`, { params });
  }

  /** Crea una tarea en el proyecto indicado, vinculada opcionalmente a una etapa. */
  create(projectId: string, request: CreateTaskRequest): Observable<Task> {
    return this.http.post<Task>(`/api/projects/${projectId}/tasks`, request);
  }

  /** Edita una tarea existente sin cambiar su proyecto. */
  update(taskId: string, request: CreateTaskRequest): Observable<Task> {
    return this.http.put<Task>(`${this.apiUrl}/${taskId}`, request);
  }

  /** Catálogo de estados del proyecto para el formulario de alta. */
  listStatuses(projectId: string): Observable<TaskStatusInfo[]> {
    return this.http.get<TaskStatusInfo[]>(`/api/projects/${projectId}/task-statuses`);
  }

  /** Catálogo de áreas del proyecto; el tipo define los campos específicos. */
  listAreas(projectId: string): Observable<TaskArea[]> {
    return this.http.get<TaskArea[]>(`/api/projects/${projectId}/areas`);
  }

  /** Mueve una tarea a otra etapa de su proyecto; `null` la deja sin etapa. */
  moveToStage(taskId: string, request: MoveTaskRequest): Observable<Task> {
    return this.http.patch<Task>(`${this.apiUrl}/${taskId}/stage`, request);
  }
}

/** Traduce los errores del tablero a un mensaje para la persona usuaria. */
export function taskErrorMessage(error: HttpErrorResponse): string {
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
    case 400: return apiMessage ?? 'Los datos del tablero no son válidos.';
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return 'No tienes permiso para consultar estas tareas.';
    case 404: return apiMessage ?? 'No se encontró el proyecto solicitado.';
    case 409: return apiMessage ?? 'La operación entra en conflicto con el estado actual.';
    case 0: return 'No se pudo conectar con el servidor. Verifica que esté en ejecución.';
    default: return apiMessage ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  }
}
