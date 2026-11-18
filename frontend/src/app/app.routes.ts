import { AcceptInvitationComponent } from './auth/accept-invitation.component';
import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth.component';
import { authGuard } from './core/auth.guard';
import { PrivateShellComponent } from './core/private-shell.component';
import { NavigationMessageComponent } from './core/navigation-message.component';
import { routeRole } from './core/route-role.resolver';
import { ProjectListComponent } from './projects/project-list.component';
import { usersRoutes } from './users/users.routes';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'app/proyectos' },
  { path: 'invitations/accept', component: AcceptInvitationComponent },
  { path: 'login', component: AuthComponent, data: { view: 'login' } },
  { path: 'registro', component: AuthComponent, data: { view: 'register' } },
  { path: 'recuperar-password', component: AuthComponent, data: { view: 'forgot' } },
  { path: 'reset-password', component: AuthComponent, data: { view: 'reset' } },
  {
    path: 'app', component: PrivateShellComponent, canActivate: [authGuard], canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'proyectos' },
      // Replace this redirect when the independent dashboard is available.
      { path: 'dashboard', pathMatch: 'full', redirectTo: 'proyectos' },
      { path: 'proyectos', component: ProjectListComponent, resolve: { role: routeRole } },
      { path: 'usuarios', children: usersRoutes }
    ]
  },
  { path: '**', component: NavigationMessageComponent }
];
