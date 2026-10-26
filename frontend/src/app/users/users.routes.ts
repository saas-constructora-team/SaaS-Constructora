import { Routes } from '@angular/router';
import { UserManagementComponent } from './user-management.component';

export const usersRoutes: Routes = [
  {
    path: '',
    component: UserManagementComponent,
    title: 'Gestión de Usuarios'
  }
];