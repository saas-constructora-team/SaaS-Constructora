import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ProjectAssignment } from './project.model';
import { ProjectService, projectErrorMessage } from './project.service';
import { UserSummary } from '../users/user.model';
import { UserService } from '../users/user.service';

/**
 * Gestión de los usuarios asignados a un proyecto. Solo se muestra a ADMIN,
 * que es el único rol autorizado por el backend para listar usuarios y asignar.
 */
@Component({
  selector: 'app-project-assignments',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel">
      <header class="panel-header">
        <div>
          <h2 class="panel-title">Personal asignado</h2>
          <p class="panel-subtitle">{{ projectName }}</p>
        </div>
        <button class="btn btn-ghost" type="button" (click)="closed.emit()">Cerrar</button>
      </header>

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      @if (loading()) {
        <p class="muted">Cargando personal…</p>
      } @else {
        <div class="assign-row">
          <label class="form-label" for="assignment-user">Asignar usuario</label>
          <div class="assign-controls">
            <select
              class="form-input"
              id="assignment-user"
              [value]="selectedUserId()"
              [disabled]="saving() || availableUsers().length === 0"
              (change)="onSelect($event)"
            >
              <option value="">
                {{ availableUsers().length === 0 ? 'No hay usuarios disponibles' : 'Selecciona un usuario' }}
              </option>
              @for (user of availableUsers(); track user.id) {
                <option [value]="user.id">{{ user.fullName }} · {{ user.email }}</option>
              }
            </select>
            <button
              class="btn btn-primary"
              type="button"
              [disabled]="!selectedUserId() || saving()"
              (click)="assign()"
            >
              {{ saving() ? 'Asignando…' : 'Asignar' }}
            </button>
          </div>
        </div>

        @if (assignments().length === 0) {
          <p class="muted">Este proyecto todavía no tiene usuarios asignados.</p>
        } @else {
          <ul class="assignment-list">
            @for (assignment of assignments(); track assignment.id) {
              <li class="assignment-item">
                <div>
                  <p class="assignment-name">{{ assignment.userFullName ?? 'Usuario' }}</p>
                  <p class="assignment-meta">
                    {{ assignment.userEmail ?? '—' }} · Rol: {{ assignment.userRole ?? '—' }}
                  </p>
                </div>
                <button
                  class="btn btn-danger-ghost"
                  type="button"
                  [disabled]="saving()"
                  (click)="unassign(assignment.userId)"
                >
                  Desasignar
                </button>
              </li>
            }
          </ul>
        }
      }
    </section>
  `,
  styles: []
})
export class ProjectAssignmentsComponent implements OnInit {
  private readonly projects = inject(ProjectService);
  private readonly usersService = inject(UserService);

  @Input({ required: true }) projectId!: string;
  @Input() projectName = '';
  @Output() readonly closed = new EventEmitter<void>();

  readonly assignments = signal<ProjectAssignment[]>([]);
  readonly users = signal<UserSummary[]>([]);
  readonly selectedUserId = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly availableUsers = computed(() => {
    const assignedIds = new Set(this.assignments().map(a => a.userId));
    return this.users().filter(user => user.active && !assignedIds.has(user.id));
  });

  ngOnInit(): void {
    this.load();
  }

  onSelect(event: Event): void {
    this.selectedUserId.set((event.target as HTMLSelectElement).value);
  }

  assign(): void {
    const userId = this.selectedUserId();
    if (!userId || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.projects.assign(this.projectId, userId).subscribe({
      next: () => {
        this.saving.set(false);
        this.selectedUserId.set('');
        this.reloadAssignments();
      },
      error: err => {
        this.saving.set(false);
        this.error.set(projectErrorMessage(err));
      }
    });
  }

  unassign(userId: string): void {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.projects.unassign(this.projectId, userId).subscribe({
      next: () => {
        this.saving.set(false);
        this.reloadAssignments();
      },
      error: err => {
        this.saving.set(false);
        this.error.set(projectErrorMessage(err));
      }
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      assignments: this.projects.listAssignments(this.projectId),
      users: this.usersService.list()
    }).subscribe({
      next: ({ assignments, users }) => {
        this.assignments.set(assignments);
        this.users.set(users);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(projectErrorMessage(err));
      }
    });
  }

  private reloadAssignments(): void {
    this.projects.listAssignments(this.projectId).subscribe({
      next: assignments => this.assignments.set(assignments),
      error: err => this.error.set(projectErrorMessage(err))
    });
  }
}
