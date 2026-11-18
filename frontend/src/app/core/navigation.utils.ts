import { LoginResponse } from '../auth/auth.model';

/** Only implemented private destinations may be used as a login return URL. */
export function safeReturnUrl(value: string | null): string {
  const path = value?.split(/[?#]/)[0];
  return value && !/[\\\u0000-\u0020]/.test(value)
    && ['/app', '/app/proyectos', '/app/usuarios', '/app/dashboard'].includes(path ?? '')
    ? value : '/app/proyectos';
}

/** Reading exp is a UI expiry check, never a signature or authorization check. */
export function tokenExpiresAt(session: LoginResponse): number | null {
  try {
    const part = session.accessToken.split('.')[1];
    const encoded = part.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp)
      && Number.isFinite(payload.exp * 1000) ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}
