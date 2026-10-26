import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { Project, ProjectStage } from './project.model';
import { ProjectFormComponent } from './project-form.component';
import { ProjectAssignmentsComponent } from './project-assignments.component';
import { ProjectStagesComponent } from './project-stages.component';
import { ProjectStageProgressService } from './project-stage-progress.service';
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
  imports: [CommonModule, ProjectFormComponent, ProjectAssignmentsComponent, ProjectStagesComponent],
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

      @if (stagesOf(); as project) {
        <app-project-stages
          [projectId]="project.id"
          [projectName]="project.name"
          (closed)="onStagesClosed()"
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
                <th>Etapa</th>
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
                  <td>
                    @if (stagesLoading()) {
                      <span class="muted">…</span>
                    } @else if (stagesFor(project.id).length === 0) {
                      <span class="muted">—</span>
                    } @else {
                      <select
                        class="stage-select"
                        [attr.aria-label]="'Etapa actual de ' + project.name"
                        (change)="changeStage(project, $event)"
                      >
                        @for (stage of stagesFor(project.id); track stage.id) {
                          <option [value]="stage.id" [selected]="stage.id === currentStageId(project.id)">
                            {{ stage.order }}. {{ stage.name }}
                          </option>
                        }
                      </select>
                    }
                  </td>
                  <td>{{ project.createdAt | date: 'dd/MM/yyyy' }}</td>
                  <td class="actions-column">
                    <div class="row-actions">
                      <button class="btn btn-small" type="button" (click)="openEdit(project)">Editar</button>
                      <button class="btn btn-small" type="button" (click)="openStages(project)">Etapas</button>
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
  styles: [`
    .stage-select {
      width: 100%;
      max-width: 16rem;
      padding: 0.35rem 0.4rem;
      border: 1px solid #cbd2d9;
      border-radius: 6px;
      background: #fff;
      color: #1f2933;
      font-family: inherit;
      font-size: 0.85rem;
      cursor: pointer;
    }

    .stage-select:focus {
      outline: none;
      border-color: #0066cc;
      box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.15);
    }
  `]
})
export class ProjectListComponent implements OnInit {
  private readonly projectsService = inject(ProjectService);
  private readonly stageProgress = inject(ProjectStageProgressService);
  readonly auth = inject(AuthService);

  @Input() role = '';

  readonly session = this.auth.session;
  readonly projects = signal<Project[]>([]);
  readonly stages = signal<Record<string, ProjectStage[]>>({});
  readonly stagesLoading = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly formOpen = signal(false);
  readonly editing = signal<Project | null>(null);
  readonly assigning = signal<Project | null>(null);
  readonly stagesOf = signal<Project | null>(null);

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

  openStages(project: Project): void {
    this.notice.set(null);
    this.stagesOf.set(project);
  }

  /** Al cerrar el panel, refresca las etapas para reflejar altas o cambios. */
  onStagesClosed(): void {
    this.stagesOf.set(null);
    this.loadStages(this.projects());
  }

  /** Etapas del proyecto, en el orden definido por el backend. */
  stagesFor(projectId: string): ProjectStage[] {
    return this.stages()[projectId] ?? [];
  }

  /**
   * Etapa actual del proyecto: la última elegida o, si nunca se cambió,
   * la primera etapa (donde el backend deja todo proyecto nuevo).
   */
  currentStageId(projectId: string): string | null {
    const stages = this.stagesFor(projectId);
    if (stages.length === 0) {
      return null;
    }
    const saved = this.stageProgress.stageId(projectId);
    return (stages.find(stage => stage.id === saved) ?? stages[0]).id;
  }

  changeStage(project: Project, event: Event): void {
    const stageId = (event.target as HTMLSelectElement).value;
    const stage = this.stagesFor(project.id).find(item => item.id === stageId);
    if (!stage) {
      return;
    }

    this.stageProgress.select(project.id, stage.id);
    this.error.set(null);
    this.notice.set(`"${project.name}" ahora está en la etapa "${stage.name}".`);
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
        if (this.stagesOf()?.id === project.id) {
          this.stagesOf.set(null);
        }
        this.stageProgress.clear(project.id);
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
        this.loadStages(projects);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(projectErrorMessage(err));
      }
    });
  }

  /** Carga las etapas de todos los proyectos para poder elegir la actual. */
  private loadStages(projects: Project[]): void {
    if (projects.length === 0) {
      this.stages.set({});
      this.stagesLoading.set(false);
      return;
    }

    this.stagesLoading.set(true);
    forkJoin(
      projects.map(project =>
        this.projectsService.listStages(project.id).pipe(
          catchError(() => of<ProjectStage[]>([]))
        )
      )
    ).subscribe(stageLists => {
      const byProject: Record<string, ProjectStage[]> = {};
      projects.forEach((project, index) => {
        byProject[project.id] = stageLists[index] ?? [];
      });
      this.stages.set(byProject);
      this.stagesLoading.set(false);
    });
  }
}
