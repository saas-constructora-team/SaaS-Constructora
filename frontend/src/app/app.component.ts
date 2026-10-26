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
      <div class="app-container">
        <header class="app-header">
          <div class="header-content">
            <p class="brand">Constructora</p>
            @if (session.user.role === 'ADMIN') {
              <nav class="nav-tabs">
                <a class="nav-tab active" href="#">Usuarios</a>
                <a class="nav-tab" href="#" (click)="showProjects()">Proyectos</a>
              </nav>
            } @else {
              <h1 class="page-title">Proyectos de la empresa</h1>
            }
            <div class="user-info">
              <span class="user-name">{{ session.user.fullName }}</span>
              <span class="user-role role-{{ session.user.role.toLowerCase() }}">{{ session.user.role }}</span>
              <button class="btn-logout" type="button" (click)="logout()">Cerrar sesión</button>
            </div>
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
    } @else {
      <app-auth />
    }
  `,
  styles: [
    `
    .app-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .app-header {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      padding: 20px 0;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .brand {
      font-size: 24px;
      font-weight: 700;
      color: #5a67d8;
      margin: 0;
    }

    .nav-tabs {
      display: flex;
      gap: 20px;
      margin-top: 10px;
    }

    .nav-tab {
      padding: 8px 16px;
      text-decoration: none;
      color: #4a5568;
      font-weight: 500;
      border-radius: 8px;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .nav-tab.active {
      background: #5a67d8;
      color: white;
      box-shadow: 0 2px 8px rgba(90, 103, 216, 0.3);
    }

    .nav-tab:not(.active):hover {
      background: #f7fafc;
      color: #5a67d8;
    }

    .page-title {
      font-size: 20px;
      color: #2d3748;
      margin: 10px 0;
      font-weight: 600;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .user-name {
      font-weight: 600;
      color: #2d3748;
    }

    .user-role {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .role-admin {
      background: #fed7aa;
      color: #ea580c;
      border: 1px solid #fb923c;
    }

    .role-member {
      background: #bfdbfe;
      color: #2563eb;
      border: 1px solid #60a5fa;
    }

    .btn-logout {
      background: #ef4444;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-logout:hover {
      background: #dc2626;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
    }

    .app-content {
      max-width: 1200px;
      margin: 30px auto;
      padding: 0 20px;
    }

    /* User management component styles */
    .permissions-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 5px;
    }

    .permission-tag {
      background: #f3e8ff;
      color: #7c3aed;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid #e9d5ff;
    }

    .role-badge {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .role-badge.admin {
      background: #fef3c7;
      color: #d97706;
      border: 1px solid #fbbf24;
    }

    .role-badge.member {
      background: #dbeafe;
      color: #2563eb;
      border: 1px solid #60a5fa;
    }

    .status-active {
      color: #10b981;
      font-weight: 600;
    }

    .status-inactive {
      color: #ef4444;
      font-weight: 600;
    }
    `
  ]
})
export class AppComponent {
  readonly auth = inject(AuthService);
  private showUserManagementState = true;

  showUserManagement(): boolean {
    return this.showUserManagementState;
  }

  showProjects(): void {
    this.showUserManagementState = false;
  }

  logout(): void {
    this.auth.logout();
  }
}