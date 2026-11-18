import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { SKIP_AUTH } from '../core/auth.interceptor';
import { InvitationPreview, InviteWorkerRequest, InviteWorkerResponse } from './invitation.model';

@Injectable({ providedIn: 'root' })
export class InvitationService {
  private readonly http = inject(HttpClient);
  invite(request: InviteWorkerRequest) {
    return this.http.post<InviteWorkerResponse>('/api/personnel/invite', request);
  }
  preview(token: string) {
    return this.http.get<InvitationPreview>(`/api/auth/invitations/${encodeURIComponent(token)}`,
      { context: new HttpContext().set(SKIP_AUTH, true) });
  }
}

/** Fixed user-facing messages; never display internal server exceptions. */
export function invitationError(status: number): string {
  switch (status) {
    case 0: return 'No se pudo conectar. Inténtalo nuevamente.';
    case 400: return 'Revisa los datos y vuelve a intentarlo.';
    case 401: return 'Tu sesión no está autorizada o ha expirado. Inicia sesión nuevamente.';
    case 403: return 'No tienes autorización para invitar trabajadores.';
    case 404: return 'La información solicitada no está disponible.';
    case 409: return 'La persona ya pertenece a la empresa o sus datos están en conflicto. Revisa la información.';
    default: return 'No se pudo completar la operación. Inténtalo nuevamente.';
  }
}
