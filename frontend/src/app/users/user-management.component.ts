import { CommonModule } from '@angular/common';
import { Component, Input, inject, OnInit, signal } from '@angular/core';
import { UserSummary } from './user.model';
import { UserService } from './user.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-shell">
      <header class="topbar">
        <div>
          <p class="brand">Constructora</p>
          <h1 class="page-title">Usuarios y Roles</h1>
          <p class="page-subtitle">
            Lista de usuarios de la empresa con sus roles y permisos asignados.
          </p>
        </div>

        <div class="topbar-actions">
          <span class="user-chip">
            {{ session?.user?.fullName ?? 'Usuario' }} · {{ role }}
          </span>
          <button class="btn btn-ghost" type="button" (click)="logout()">Cerrar sesión</button>
        </div>
      </header>

      @if (notice()) {
        <div class="alert alert-success" role="status">{{ notice() }}</div>
      }

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      @if (loading()) {
        <p class="muted">Cargando usuarios…</p>
      } @else if (users().length === 0) {
        <section class="empty-state">
          <h2 class="panel-title">No hay usuarios en la empresa</h2>
          <p class="muted">
            Aún no hay usuarios registrados en esta empresa.
          </p>
        </section>
      } @else {
        <div class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo Electrónico</th>
                <th>Rol</th>
                <th>Activo</th>
                <th>Permisos</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td class="cell-strong">{{ user.fullName }}</td>
                  <td>{{ user.email }}</td>
                  <td>
                    <span class="role-badge" [class]="getRoleClass(user.role)">
                      {{ user.role }}
                    </span>
                  </td>
                  <td>
                    @if (user.active) {
                      <span class="status-active">Activo</span>
                    } @else {
                      <span class="status-inactive">Inactivo</span>
                    }
                  </td>
                  <td>
                    <div class="permissions-list">
                      @if (user.role === 'ADMIN') {
                        <span class="permission-tag">Administración Total</span>
                      } @else if (user.role === 'MEMBER') {
                        <span class="permission-tag">Listar/Proyecto Editar Asignado</span>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: []
})
export class UserManagementComponent implements OnInit {
  private readonly userService = inject(UserService);
  readonly auth = inject(AuthService);

  readonly users = signal<UserSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  @Input() role = '';

  get session() {
    return this.auth.session();
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  getRoleClass(role: string): string {
    return role.toLowerCase();
  }

  logout(): void {
    this.auth.logout();
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);
    this.userService.list().subscribe({
      next: users => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(this.getErrorMessage(err));
      }
    });
  }

  private getErrorMessage(error: any): string {
    if (error.status === 403) {
      return 'No tienes permisos para ver la lista de usuarios. Solo los administradores pueden acceder a esta sección.';
    }
    if (error.status === 401) {
      return 'Debes iniciar sesión para ver la lista de usuarios.';
    }
    return 'Error al cargar los usuarios. Por favor, intenta de nuevo.';
  }
}