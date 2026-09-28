import { HttpInterceptorFn } from '@angular/common/http';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/api')) {
    const cloned = req.clone({
      setHeaders: { 'X-Tenant-Id': TENANT_ID }
    });
    return next(cloned);
  }
  return next(req);
};