import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  ForgotPasswordRequest,
  GoogleAuthRequest,
  GoogleAuthResponse,
  LoginRequest,
  LoginResponse,
  MessageResponse,
  RegisterTenantRequest,
  RegisterTenantResponse,
  ResetPasswordRequest
} from './auth.model';

const SESSION_KEY = 'constructora.session';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/auth';

  /** Sesión activa (o null si no hay sesión abierta). */
  readonly session = signal<LoginResponse | null>(loadSession());

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, req)
      .pipe(tap(res => this.openSession(res)));
  }

  /** HU-01: crea la empresa (tenant) y su usuario administrador. Responde 201. */
  register(req: RegisterTenantRequest): Observable<RegisterTenantResponse> {
    return this.http.post<RegisterTenantResponse>(`${this.apiUrl}/register`, req)
      .pipe(tap(res => this.openSession(res)));
  }

  /** HU-01: 200 si la cuenta ya existía, 201 si se creó en esta petición. */
  google(req: GoogleAuthRequest): Observable<GoogleAuthResponse> {
    return this.http.post<GoogleAuthResponse>(`${this.apiUrl}/google`, req)
      .pipe(tap(res => this.openSession(res)));
  }

  /** HU-13: responde 200 siempre, exista o no el email (anti user-enumeration). */
  forgotPassword(req: ForgotPasswordRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/forgot-password`, req);
  }

  resetPassword(req: ResetPasswordRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/reset-password`, req);
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
    this.session.set(null);
  }

  private openSession(res: LoginResponse | GoogleAuthResponse | RegisterTenantResponse): void {
    const session: LoginResponse = {
      accessToken: res.accessToken,
      tokenType: res.tokenType,
      expiresInSeconds: res.expiresInSeconds,
      user: res.user
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.session.set(session);
  }
}

function loadSession(): LoginResponse | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LoginResponse) : null;
  } catch {
    return null;
  }
}

/**
 * Traduce una respuesta HTTP fallosa del backend a un mensaje claro para la
 * persona usuaria (400, 401, 403, 404, 409 y fallos de conexión).
 */
export function authErrorMessage(error: HttpErrorResponse): string {
  const body = error.error as { message?: unknown; errors?: Array<{ defaultMessage?: string }> } | null;
  const apiMessage =
    (typeof body?.message === 'string' && body.message) ||
    (Array.isArray(body?.errors)
      ? body.errors.map(e => e.defaultMessage).filter((m): m is string => !!m).join(' ')
      : null);

  switch (error.status) {
    case 400: return apiMessage ?? 'Los datos enviados no son válidos.';
    case 401: return apiMessage ?? 'Email o contraseña incorrectos.';
    case 403: return apiMessage ?? 'No tienes permiso para realizar esta acción.';
    case 404: return apiMessage ?? 'No se encontró el recurso solicitado.';
    case 409: return apiMessage ?? 'La operación entra en conflicto con el estado actual.';
    case 0: return 'No se pudo conectar con el servidor. Verifica que esté en ejecución.';
    default: return apiMessage ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  }
}
