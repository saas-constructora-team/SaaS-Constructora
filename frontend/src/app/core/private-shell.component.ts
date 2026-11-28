import { Component, HostListener, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PermissionService } from './permission.service';

@Component({
  selector: 'app-private-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (auth.session(); as session) {
      <div class="app-shell" [class.is-expanded]="sidebarExpanded">
        <aside class="app-sidebar">
          <span class="brand-mark" aria-label="Constructora" title="Constructora">C</span>

            <nav class="sidebar-nav" aria-label="Secciones principales">
              <a
                class="nav-tab"
                title="Proyectos"
                aria-label="Proyectos"
                routerLink="/app/proyectos" routerLinkActive="active" ariaCurrentWhenActive="page"
                (click)="onNavigate('/app/proyectos')"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="4" y="4" width="6" height="6" rx="1.5" />
                  <rect x="14" y="4" width="6" height="6" rx="1.5" />
                  <rect x="4" y="14" width="6" height="6" rx="1.5" />
                  <rect x="14" y="14" width="6" height="6" rx="1.5" />
                </svg>
                <span class="nav-label">Proyectos</span>
              </a>
              <a
                class="nav-tab"
                title="Tablero"
                aria-label="Tablero"
                routerLink="/app/tablero" routerLinkActive="active" ariaCurrentWhenActive="page"
                (click)="onNavigate('/app/tablero')"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3.5" y="4" width="5" height="16" rx="1.5" />
                  <rect x="9.5" y="4" width="5" height="11" rx="1.5" />
                  <rect x="15.5" y="4" width="5" height="14" rx="1.5" />
                </svg>
                <span class="nav-label">Tablero</span>
              </a>
              <a
                class="nav-tab"
                title="Bitácora"
                aria-label="Bitácora"
                routerLink="/app/bitacora" routerLinkActive="active" ariaCurrentWhenActive="page"
                (click)="onNavigate('/app/bitacora')"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7 3h10a2 2 0 0 1 2 2v16H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" />
                  <path d="M7 3v18M10 8h6M10 12h6M10 16h4" />
                </svg>
                <span class="nav-label">Bitácora</span>
              </a>
              @if (permissions.capabilities().administerUsers === 'granted') {
              <a
                class="nav-tab"
                title="Usuarios"
                aria-label="Usuarios"
                routerLink="/app/usuarios" routerLinkActive="active" ariaCurrentWhenActive="page"
                (click)="onNavigate('/app/usuarios')"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="9" cy="8" r="3" />
                  <path d="M3.5 19v-1.2a5.5 5.5 0 0 1 11 0V19z" />
                  <path d="M16 5.3a3 3 0 0 1 0 5.8M17 13.5a5 5 0 0 1 3.5 4.8V19h-4" />
                </svg>
                <span class="nav-label">Usuarios</span>
              </a>
              }
            </nav>
          <div class="sidebar-footer">
            <a
              class="sidebar-user sidebar-user-link"
              [class.is-open]="accountMenuOpen"
              routerLink="/app/cuenta"
              routerLinkActive="active"
              ariaCurrentWhenActive="page"
              aria-controls="sidebar-logout"
              [attr.aria-expanded]="accountMenuOpen"
              [attr.title]="'Mi cuenta: ' + session.user.fullName"
              [attr.aria-label]="'Abrir mi cuenta de ' + session.user.fullName"
              (click)="toggleAccountMenu()"
            >
              <span class="user-avatar">{{ userInitials(session.user.fullName) }}</span>
              <span class="user-name">{{ session.user.fullName }}</span>
            </a>
            <button
              id="sidebar-logout"
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
              <span class="nav-label">Cerrar sesión</span>
            </button>
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
                } @else if (router.url.startsWith('/app/tablero')) {
                  Consulta las tareas por etapa y proyecto.
                } @else if (router.url.startsWith('/app/bitacora')) {
                  Registra avances y novedades de tus proyectos.
                } @else if (router.url.startsWith('/app/cuenta')) {
                  Administra tu cuenta y, si eres dueño, la información de la empresa.
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

  sidebarExpanded = false;
  accountMenuOpen = false;

  onNavigate(path: string): void {
    this.accountMenuOpen = false;
    this.sidebarExpanded = this.router.url.startsWith(path)
      ? !this.sidebarExpanded
      : true;
  }

  toggleAccountMenu(): void {
    this.sidebarExpanded = true;
    this.accountMenuOpen = !this.accountMenuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInsideSidebar = (event.target as HTMLElement | null)?.closest?.('.app-sidebar');
    if (!clickedInsideSidebar && (this.sidebarExpanded || this.accountMenuOpen)) {
      this.sidebarExpanded = false;
      this.accountMenuOpen = false;
    }
  }

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
    this.accountMenuOpen = false;
    this.auth.logout();
  }
}