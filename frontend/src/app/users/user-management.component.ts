import { InviteWorkerFormComponent } from './invite-worker-form.component';
import { CommonModule } from '@angular/common';
import { Component, Input, inject, OnInit, signal, computed, DestroyRef } from '@angular/core';
import { UserSummary } from './user.model';
import { UserService } from './user.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { PermissionService } from '../core/permission.service';
import { LoginResponse } from '../auth/auth.model';
import { AuthService } from '../auth/auth.service';

type PermissionAction = 'promote' | 'demote' | 'grantPersonnel' | 'revokePersonnel';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, InviteWorkerFormComponent],
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
          @if (canViewUsers() && permissions.capabilities().managePersonnel === 'granted') {
            <button class="btn btn-primary" type="button" [disabled]="saving()" (click)="showInvitation.set(!showInvitation())"
              [attr.aria-expanded]="showInvitation()">Invitar trabajador</button>
          }
          <button class="btn btn-ghost" type="button" (click)="logout()">Cerrar sesión</button>
        </div>
      </header>

      @if (showInvitation() && canViewUsers() && permissions.capabilities().managePersonnel === 'granted') {
        <app-invite-worker-form (closed)="showInvitation.set(false)" />
      }
      @if (notice()) {
        <div class="alert alert-success" role="status">{{ notice() }}</div>
      }

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      @if (!canViewUsers()) {
        <p class="muted" role="status">No tienes autorización para administrar usuarios.</p>
      } @else if (loading()) {
        <p class="muted">Cargando usuarios…</p>
      } @else if (users().length === 0) {
        <section class="empty-state">
          <h2 class="panel-title">No hay usuarios en la empresa</h2>
          <p class="muted">
            Aún no hay usuarios registrados en esta empresa.
          </p>
        </section>
      } @else {
        @if (saving()) {
          <p class="muted" role="status">Actualizando permisos…</p>
        }
        <div class="table-card" tabindex="0" role="region" aria-label="Usuarios de la constructora" [attr.aria-busy]="saving()">
          <table class="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo Electrónico</th>
                <th>Rol</th>
                <th>Activo</th>
                <th scope="col">Gestión de personal</th>
                <th scope="col">Acciones</th>
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
                    <span class="permission-tag">
                      {{ user.canCreatePersonnel === true ? 'Permitida' : user.canCreatePersonnel === false ? 'No permitida' : 'No determinada' }}
                    </span>
                    @if (user.role === 'ADMIN') {
                      <p class="muted">Incluida en el rol ADMIN.</p>
                    }
                  </td>
                  <td>
                    @if (canManagePermissions()) {
                      <div class="user-permission-actions" [attr.aria-label]="'Permisos de ' + user.fullName">
                        <button class="btn btn-ghost" type="button" [disabled]="saving() || !user.active"
                          (click)="changePermission(user, user.role === 'ADMIN' ? 'demote' : 'promote')">
                          {{ user.role === 'ADMIN' ? 'Cambiar a MEMBER' : 'Convertir en ADMIN' }}
                        </button>
                        @if (user.role !== 'ADMIN' && user.canCreatePersonnel !== undefined) {
                          <button class="btn btn-ghost" type="button" [disabled]="saving() || !user.active"
                            (click)="changePermission(user, user.canCreatePersonnel ? 'revokePersonnel' : 'grantPersonnel')">
                            {{ user.canCreatePersonnel ? 'Revocar gestión de personal' : 'Permitir gestión de personal' }}
                          </button>
                        }
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .table-card { overflow-x: auto; }
    .user-permission-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
    .user-permission-actions .btn { white-space: normal; }
  `]
})
export class UserManagementComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);
  readonly permissions = inject(PermissionService);
  private readonly snapshot = signal<{ session: LoginResponse; users: UserSummary[] } | null>(null);
  private readonly blockedSession = signal<LoginResponse | null>(null);
  readonly users = computed(() => {
    const data = this.snapshot();
    return data?.session === this.auth.session() ? data!.users : [];
  });
  readonly canViewUsers = computed(() => this.permissions.capabilities().administerUsers === 'granted'
    && this.blockedSession() !== this.auth.session());
  readonly canManagePermissions = computed(() => this.canViewUsers()
    && this.permissions.capabilities().managePermissions === 'granted');
  readonly showInvitation = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  @Input() role = '';

  get session() { return this.auth.session(); }

  ngOnInit(): void { this.loadUsers(); }

  getRoleClass(role: string): string { return role.toLowerCase(); }

  logout(): void { this.auth.logout(); }

  changePermission(user: UserSummary, action: PermissionAction): void {
    const session = this.auth.session();
    if (!session || !this.canManagePermissions() || this.saving() || this.loading()) return;
    const current = this.users().find(item => item.id === user.id);
    if (!current?.active) return;
    if ((action === 'promote' && current.role === 'ADMIN')
      || (action === 'demote' && current.role !== 'ADMIN')
      || ((action === 'grantPersonnel' || action === 'revokePersonnel')
        && (current.role === 'ADMIN' || typeof current.canCreatePersonnel !== 'boolean'))) return;

    const descriptions: Record<PermissionAction, string> = {
      promote: 'convertir en ADMIN, con acceso a la administración de la constructora, a',
      demote: 'cambiar a MEMBER, retirando el rol de administrador, a',
      grantPersonnel: 'permitir gestionar personal a',
      revokePersonnel: 'revocar la gestión de personal de'
    };
    const selfDemotion = action === 'demote' && current.id === session.user.id;
    if (!window.confirm(`¿Deseas ${descriptions[action]} ${current.fullName}?`
      + (selfDemotion ? ' Tu sesión se cerrará para actualizar tu acceso.' : ''))) return;
    if (this.auth.session() !== session || !this.canManagePermissions()) return;

    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    const requests = {
      promote: () => this.userService.enablePermissions(current.id),
      demote: () => this.userService.disablePermissions(current.id),
      grantPersonnel: () => this.userService.enablePersonnelCreation(current.id),
      revokePersonnel: () => this.userService.disablePersonnelCreation(current.id)
    };
    requests[action]().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => {
        this.saving.set(false);
        if (this.auth.session() !== session) return;
        this.snapshot.set({ session, users: this.users().map(item => item.id === updated.id ? updated : item) });
        if (updated.id === session.user.id) {
          this.permissions.receivePersonnelPermissions({ tenantId: session.user.tenantId,
            accessToken: session.accessToken }, updated);
        }
        this.notice.set('Permisos actualizados. Los cambios de rol se reflejarán al iniciar una nueva sesión.');
        if (selfDemotion) this.auth.logout();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        if (this.auth.session() === session) this.handleError(error, session);
      }
    });
  }

  private loadUsers(): void {
    const session = this.auth.session();
    if (!session || !this.canViewUsers()) return;
    this.loading.set(true);
    this.error.set(null);
    this.userService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: users => {
        this.loading.set(false);
        if (this.auth.session() !== session) return;
        this.snapshot.set({ session, users });
        const current = users.find(user => user.id === session.user.id);
        if (current) this.permissions.receivePersonnelPermissions({ tenantId: session.user.tenantId,
          accessToken: session.accessToken }, current);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        if (this.auth.session() === session) this.handleError(error, session);
      }
    });
  }

  private handleError(error: HttpErrorResponse, session: LoginResponse): void {
    const messages: Record<number, string> = {
      401: 'Tu sesión no está autorizada o ha expirado. Inicia sesión nuevamente.',
      403: 'No tienes permisos suficientes para administrar usuarios.',
      404: 'El usuario ya no está disponible en esta constructora.',
      409: 'No se pudo realizar el cambio por un conflicto con el estado actual. Actualiza la página e inténtalo nuevamente.',
      0: 'No se pudo conectar con el servidor. Inténtalo nuevamente.'
    };
    this.error.set(messages[error.status] ?? 'No se pudo completar la operación. Inténtalo nuevamente.');
    if (error.status === 401 || error.status === 403) this.blockedSession.set(session);
    if (error.status === 401) this.auth.logout();
  }
}
