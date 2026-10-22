import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { Project } from './project.model';
import { ProjectFormComponent } from './project-form.component';
import { ProjectAssignmentsComponent } from './project-assignments.component';
import { ProjectService, projectErrorMessage } from './project.service';
import { AuthService } from '../auth/auth.service';

/**
 * Listado de los proyectos de la empresa del usuario autenticado.
 * El backend filtra por tenant a partir del JWT: ADMIN ve todos y MEMBER
 * solo los que tiene asignados.
 */
@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, ProjectFormComponent, ProjectAssignmentsComponent],
  template: `
    <div class="page-shell">
      <header class="topbar">
        <div>
          <p class="brand">Constructora</p>
          <h1 class="page-title">Proyectos de la empresa</h1>
          <p class="page-subtitle">
            @if (isAdmin) {
              Todos los proyectos vinculados a tu empresa.
            } @else {
              Proyectos asignados a ti dentro de tu empresa.
            }
          </p>
        </div>

        <div class="topbar-actions">
          <span class="user-chip">
            {{ session()?.user?.fullName ?? 'Usuario' }} · {{ role }}
          </span>
          @if (!formOpen()) {
            <button class="btn btn-primary" type="button" (click)="openCreate()">Nuevo proyecto</button>
          }
          <button class="btn btn-ghost" type="button" (click)="logout()">Cerrar sesión</button>
        </div>
      </header>

      @if (notice()) {
        <div class="alert alert-success" role="status">{{ notice() }}</div>
      }

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      @if (formOpen()) {
        <app-project-form
          [project]="editing()"
          (saved)="onSaved()"
          (cancelled)="closeForm()"
        />
      }

      @if (assigning(); as project) {
        <app-project-assignments
          [projectId]="project.id"
          [projectName]="project.name"
          (closed)="assigning.set(null)"
        />
      }

      @if (loading()) {
        <p class="muted">Cargando proyectos…</p>
      } @else if (projects().length === 0) {
        <section class="empty-state">
          <h2 class="panel-title">Aún no hay proyectos</h2>
          <p class="muted">
            @if (isAdmin) {
              Crea el primer proyecto de tu empresa.
            } @else {
              Tu empresa todavía no te ha asignado proyectos.
            }
          </p>
        </section>
      } @else {
        <div class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Cliente</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th>Creado</th>
                <th class="actions-column">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (project of projects(); track project.id) {
                <tr>
                  <td class="cell-strong">{{ project.name }}</td>
                  <td>{{ project.clientName || '—' }}</td>
                  <td>{{ project.location || '—' }}</td>
                  <td><span class="status-badge">{{ statusLabel(project.status) }}</span></td>
                  <td>{{ project.createdAt | date: 'dd/MM/yyyy' }}</td>
                  <td class="actions-column">
                    <div class="row-actions">
                      <button class="btn btn-small" type="button" (click)="openEdit(project)">Editar</button>
                      @if (isAdmin) {
                        <button class="btn btn-small" type="button" (click)="openAssignments(project)">
                          Asignar
                        </button>
                      }
                      <button class="btn btn-small btn-danger-ghost" type="button" (click)="confirmDelete(project)">
                        Eliminar
                      </button>
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
export class ProjectListComponent implements OnInit {
  private readonly projectsService = inject(ProjectService);
  readonly auth = inject(AuthService);

  @Input() role = '';

  readonly session = this.auth.session;
  readonly projects = signal<Project[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly formOpen = signal(false);
  readonly editing = signal<Project | null>(null);
  readonly assigning = signal<Project | null>(null);

  get isAdmin(): boolean {
    return this.role === 'ADMIN';
  }

  ngOnInit(): void {
    this.load();
  }

  openCreate(): void {
    this.notice.set(null);
    this.editing.set(null);
    this.formOpen.set(true);
  }

  openEdit(project: Project): void {
    this.notice.set(null);
    this.editing.set(project);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  onSaved(): void {
    const wasEdit = this.editing() !== null;
    this.closeForm();
    this.notice.set(wasEdit ? 'Proyecto actualizado correctamente.' : 'Proyecto creado correctamente.');
    this.load();
  }

  openAssignments(project: Project): void {
    this.assigning.set(project);
  }

  confirmDelete(project: Project): void {
    const confirmed = window.confirm(
      `¿Eliminar el proyecto "${project.name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) {
      return;
    }

    this.error.set(null);
    this.notice.set(null);
    this.projectsService.delete(project.id).subscribe({
      next: () => {
        if (this.editing()?.id === project.id) {
          this.closeForm();
        }
        if (this.assigning()?.id === project.id) {
          this.assigning.set(null);
        }
        this.notice.set('Proyecto eliminado correctamente.');
        this.load();
      },
      error: err => this.error.set(projectErrorMessage(err))
    });
  }

  statusLabel(status: string): string {
    return status === 'ACTIVE' ? 'Activo' : status;
  }

  logout(): void {
    this.auth.logout();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.projectsService.list().subscribe({
      next: projects => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(projectErrorMessage(err));
      }
    });
  }
}
