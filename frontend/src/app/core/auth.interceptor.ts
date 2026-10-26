import { HttpInterceptorFn } from '@angular/common/http';

const SESSION_KEY = 'constructora.session';

/**
 * Adjunta el JWT de la sesión a todas las llamadas al backend.
 * El tenant lo deriva el servidor desde el token: no se envía X-Tenant-Id.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api')) {
    return next(req);
  }

  const token = readAccessToken();
  return next(
    token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req
  );
};

function readAccessToken(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    const session = JSON.parse(raw) as { accessToken?: unknown };
    return typeof session.accessToken === 'string' ? session.accessToken : null;
  } catch {
    return null;
  }
}
