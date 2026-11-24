import { Component, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PermissionService } from './permission.service';

@Component({
  selector: 'app-private-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (auth.session(); as session) {
      <div class="app-shell">
        <aside class="app-sidebar">
          <span class="brand-mark" aria-label="Constructora" title="Constructora">C</span>

            <nav class="sidebar-nav" aria-label="Secciones principales">
              <a
                class="nav-tab"
                title="Proyectos"
                aria-label="Proyectos"
                routerLink="/app/proyectos" routerLinkActive="active" ariaCurrentWhenActive="page"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="4" y="4" width="6" height="6" rx="1.5" />
                  <rect x="14" y="4" width="6" height="6" rx="1.5" />
                  <rect x="4" y="14" width="6" height="6" rx="1.5" />
                  <rect x="14" y="14" width="6" height="6" rx="1.5" />
                </svg>
              </a>
              <a
                class="nav-tab"
                title="Bitácora"
                aria-label="Bitácora"
                routerLink="/app/bitacora" routerLinkActive="active" ariaCurrentWhenActive="page"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 3h10a2 2 0 0 1 2 2v16H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" />
                  <path d="M7 3v18M10 8h6M10 12h6M10 16h4" />
                </svg>
              </a>
              @if (permissions.capabilities().administerUsers === 'granted') {
              <a
                class="nav-tab"
                title="Usuarios"
                aria-label="Usuarios"
                routerLink="/app/usuarios" routerLinkActive="active" ariaCurrentWhenActive="page"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="9" cy="8" r="3" />
                  <path d="M3.5 19v-1.2a5.5 5.5 0 0 1 11 0V19z" />
                  <path d="M16 5.3a3 3 0 0 1 0 5.8M17 13.5a5 5 0 0 1 3.5 4.8V19h-4" />
                </svg>
              </a>
              }
            </nav>
          <div class="sidebar-footer">
            <button
              class="sidebar-logout"
              type="button"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              (click)="logout()"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 17l5-5-5-5M15 12H3" />
                <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
              </svg>
            </button>
            <span
              class="user-avatar"
              [attr.title]="roleLabel(session.user.role)"
              [attr.aria-label]="session.user.fullName + ', ' + roleLabel(session.user.role)"
            >
              {{ userInitials(session.user.fullName) }}
            </span>
          </div>
        </aside>

        <div class="workspace">
          <header class="welcome-header">
            <div>
              <h1
                class="welcome-title"
                [attr.title]="roleLabel(session.user.role)"
              >
                Hola, {{ session.user.fullName }}
              </h1>
              <p class="welcome-subtitle">
                @if (router.url.startsWith('/app/usuarios')) {
                  Administra los usuarios de tu empresa.
                } @else if (router.url.startsWith('/app/bitacora')) {
                  Registra avances y novedades de tus proyectos.
                } @else {
                  Consulta los proyectos y sus etapas.
                }
              </p>
            </div>
          </header>

          <main class="app-content">
            @if (route.snapshot.queryParamMap.get('access') === 'denied') {
              <div class="alert alert-error" role="alert">No tienes autorización para acceder a esa sección.</div>
            }
            <router-outlet />
          </main>
        </div>
      </div>
    }
  `,
  styles: []
})
export class PrivateShellComponent {
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  readonly permissions = inject(PermissionService);

  userInitials(fullName: string): string {
    return fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase();
  }

  roleLabel(role: string): string {
    switch (role) {
      case 'ADMIN': return 'Administrador';
      case 'MEMBER': return 'Miembro';
      case 'WORKER': return 'Trabajador';
      default: return role;
    }
  }

  logout(): void {
    this.auth.logout();
  }
}