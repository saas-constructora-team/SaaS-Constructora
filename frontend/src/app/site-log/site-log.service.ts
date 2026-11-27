import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SiteLogEntry, SiteLogRecordRequest } from './site-log.model';

@Injectable({ providedIn: 'root' })
export class SiteLogService {
  private readonly http = inject(HttpClient);

  list(projectId: string): Observable<SiteLogEntry[]> {
    return this.http.get<SiteLogEntry[]>(`/api/projects/${projectId}/site-log`);
  }

  create(projectId: string, req: SiteLogRecordRequest): Observable<SiteLogEntry> {
    return this.http.post<SiteLogEntry>(`/api/projects/${projectId}/site-log`, req);
  }

  update(projectId: string, entryId: string, req: SiteLogRecordRequest): Observable<SiteLogEntry> {
    return this.http.put<SiteLogEntry>(`/api/projects/${projectId}/site-log/${entryId}`, req);
  }

  touch(projectId: string, entryId: string): Observable<SiteLogEntry> {
    return this.http.patch<SiteLogEntry>(`/api/projects/${projectId}/site-log/${entryId}/touch`, {});
  }

  remove(projectId: string, entryId: string): Observable<void> {
    return this.http.delete<void>(`/api/projects/${projectId}/site-log/${entryId}`);
  }
}

/** Traduce los errores de la bitácora a un mensaje para la persona usuaria. */
export function siteLogErrorMessage(error: HttpErrorResponse): string {
  const body = error.error as { message?: unknown; detail?: unknown } | null;
  const apiMessage =
    (typeof body?.message === 'string' && body.message) ||
    (typeof body?.detail === 'string' && body.detail) ||
    null;

  switch (error.status) {
    case 400: return apiMessage ?? 'Los datos de la entrada no son válidos.';
    case 401: return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403: return apiMessage ?? 'No tienes permiso para realizar esta acción.';
    case 404: return apiMessage ?? 'No se encontró la entrada solicitada.';
    case 409: return apiMessage ?? 'La operación entra en conflicto con el estado actual.';
    case 0: return 'No se pudo conectar con el servidor. Verifica que esté en ejecución.';
    default: return apiMessage ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  }
}
