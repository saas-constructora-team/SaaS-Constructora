import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from './permission.service';

export const permissionGuard: CanActivateFn = () => {
  return inject(PermissionService).capabilities().administerUsers === 'granted'
    ? true : inject(Router).createUrlTree(['/app/proyectos'], { queryParams: { access: 'denied' } });
};
