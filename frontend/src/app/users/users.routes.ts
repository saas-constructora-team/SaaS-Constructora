import { permissionGuard } from '../core/permission.guard';
import { routeRole } from '../core/route-role.resolver';
import { Routes } from '@angular/router';
import { UserManagementComponent } from './user-management.component';

export const usersRoutes: Routes = [
  {
    path: '',
    component: UserManagementComponent,
    canActivate: [permissionGuard],
    resolve: { role: routeRole },
    title: 'Gestión de Usuarios'
  }
];