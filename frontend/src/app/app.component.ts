import { Component, inject } from '@angular/core';
import { AuthComponent } from './auth/auth.component';
import { ProjectListComponent } from './projects/project-list.component';
import { UserManagementComponent } from './users/user-management.component';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AuthComponent, ProjectListComponent, UserManagementComponent],
  template: `
    @if (auth.session(); as session) {
      <div class="app-shell">
        <aside class="app-sidebar">
          <span class="brand-mark" aria-label="Constructora" title="Constructora">C</span>
          @if (session.user.role === 'ADMIN') {
            <nav class="sidebar-nav" aria-label="Secciones principales">
              <button
                class="nav-tab"
                type="button"
                title="Proyectos"
                aria-label="Proyectos"
                [class.active]="!showUserManagement()"
                [attr.aria-pressed]="!showUserManagement()"
                (click)="showProjects()"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="4" y="4" width="6" height="6" rx="1.5" />
                  <rect x="14" y="4" width="6" height="6" rx="1.5" />
                  <rect x="4" y="14" width="6" height="6" rx="1.5" />
                  <rect x="14" y="14" width="6" height="6" rx="1.5" />
                </svg>
              </button>
              <button
                class="nav-tab"
                type="button"
                title="Usuarios"
                aria-label="Usuarios"
                [class.active]="showUserManagement()"
                [attr.aria-pressed]="showUserManagement()"
                (click)="showUsers()"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="9" cy="8" r="3" />
                  <path d="M3.5 19v-1.2a5.5 5.5 0 0 1 11 0V19z" />
                  <path d="M16 5.3a3 3 0 0 1 0 5.8M17 13.5a5 5 0 0 1 3.5 4.8V19h-4" />
                </svg>
              </button>
            </nav>
          }
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
                @if (session.user.role === 'ADMIN' && showUserManagement()) {
                  Administra los usuarios de tu empresa.
                } @else {
                  Consulta los proyectos y sus etapas.
                }
              </p>
            </div>
          </header>

          <main class="app-content">
            @if (session.user.role === 'ADMIN') {
              @if (showUserManagement()) {
                <app-user-management [role]="session.user.role" />
              } @else {
                <app-project-list [role]="session.user.role" />
              }
            } @else {
              <app-project-list [role]="session.user.role" />
            }
          </main>
        </div>
      </div>
    } @else {
      <app-auth />
    }
  `,
  styles: []
})
export class AppComponent {
  readonly auth = inject(AuthService);
  private showUserManagementState = true;

  showUserManagement(): boolean {
    return this.showUserManagementState;
  }

  showUsers(): void {
    this.showUserManagementState = true;
  }

  showProjects(): void {
    this.showUserManagementState = false;
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
      default: return role;
    }
  }

  logout(): void {
    this.auth.logout();
  }
}