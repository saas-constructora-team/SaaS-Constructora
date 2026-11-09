import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, OnInit, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { Project, ProjectAssignment, ProjectStage } from './project.model';
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
          (closed)="onAssignmentsClosed()"
        />
      }

      @if (stagesOf(); as project) {
        <app-project-stages
          [projectId]="project.id"
          [projectName]="project.name"
          (closed)="onStagesClosed()"
        />
      }

      @if (!loading() && !stagesLoading() && projects().length > 0) {
        <section class="kpi-grid" aria-label="Indicadores de proyectos">
          <article class="kpi-card">
            <p class="kpi-label">Proyectos Activos</p>
            <p class="kpi-value">{{ activeProjectsCount() }}</p>
            <p class="kpi-caption">Proyectos con estado activo</p>
          </article>
          <article class="kpi-card">
            <p class="kpi-label">Etapas en Progreso</p>
            <p class="kpi-value">{{ stagesInProgressCount() }}</p>
            <p class="kpi-caption">Proyectos activos antes de su etapa final</p>
          </article>
          <article class="kpi-card">
            <p class="kpi-label">Avance Promedio</p>
            <p class="kpi-value">
              @if (averageProgressPercentage() !== null) {
                {{ averageProgressPercentage() }}%
              } @else {
                —
              }
            </p>
            <p class="kpi-caption">Promedio según la etapa actual</p>
          </article>
        </section>
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
                @if (isAdmin) {
                  <th>Asignado a</th>
                }
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
                  <td>
                    <span
                      class="status-badge"
                      [class.status-completed]="projectStatus(project) === 'COMPLETED'"
                    >
                      {{ statusLabel(projectStatus(project)) }}
                    </span>
                  </td>
                  <td>
                    @if (stagesLoading()) {
                      <span class="muted">…</span>
                    } @else if (stagesFor(project.id).length === 0) {
                      <span class="muted">—</span>
                    } @else {
                      <div class="stage-picker">
                        <button
                          class="stage-trigger"
                          type="button"
                          [attr.aria-label]="'Etapa actual de ' + project.name"
                          [attr.aria-expanded]="stageOptions.matches(':popover-open')"
                          (click)="toggleStageOptions($event)"
                        >
                          {{ currentStageLabel(project.id) }}
                          <span class="stage-chevron" aria-hidden="true"></span>
                        </button>
                        <div
                          #stageOptions
                          class="stage-options"
                          popover="manual"
                          role="listbox"
                          [attr.aria-label]="'Etapas de ' + project.name"
                        >
                          @for (stage of stagesFor(project.id); track stage.id) {
                            <button
                              class="stage-option"
                              type="button"
                              role="option"
                              [attr.aria-selected]="stage.id === currentStageId(project.id)"
                              (click)="changeStage(project, stage); stageOptions.hidePopover()"
                            >
                              {{ stage.order }}. {{ stage.name }}
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </td>
                  @if (isAdmin) {
                    <td>
                      @if (assignmentsLoading()) {
                        <span class="muted">Cargando…</span>
                      } @else if (assignmentsError()) {
                        <span class="muted">No se pudo cargar</span>
                      } @else if (assignmentsFor(project.id).length === 0) {
                        <span class="muted">Sin asignar</span>
                      } @else {
                        <div class="assigned-users" [attr.aria-label]="'Personal asignado a ' + project.name">
                          @for (assignment of assignmentsFor(project.id); track assignment.id) {
                            <span
                              class="assigned-user"
                              [attr.title]="assignment.userEmail ?? undefined"
                            >
                              {{ assignment.userFullName ?? 'Usuario' }}
                            </span>
                          }
                        </div>
                      }
                    </td>
                  }
                  <td>{{ project.createdAt | date: 'dd/MM/yyyy' }}</td>
                  <td class="actions-column">
                    <div class="row-actions">
                      <button class="btn btn-small quick-action" type="button" (click)="openEdit(project)">
                        Editar
                      </button>
                      <div class="row-actions-menu">
                        <button
                          class="btn btn-small more-actions-trigger"
                          type="button"
                          [attr.aria-label]="'Más acciones para ' + project.name"
                          aria-haspopup="menu"
                          [attr.aria-expanded]="actionMenu.matches(':popover-open')"
                          (click)="toggleActionMenu($event)"
                        >
                          <span aria-hidden="true">⋯</span>
                        </button>
                        <div
                          #actionMenu
                          class="action-menu"
                          popover="manual"
                          role="menu"
                          [attr.aria-label]="'Más acciones para ' + project.name"
                        >
                          <button
                            class="action-menu-item"
                            type="button"
                            role="menuitem"
                            (click)="actionMenu.hidePopover(); openStages(project)"
                          >
                            Etapas
                          </button>
                          @if (isAdmin) {
                            <button
                              class="action-menu-item"
                              type="button"
                              role="menuitem"
                              (click)="actionMenu.hidePopover(); openAssignments(project)"
                            >
                              Asignar
                            </button>
                          }
                          <button
                            class="action-menu-item action-menu-danger"
                            type="button"
                            role="menuitem"
                            (click)="actionMenu.hidePopover(); confirmDelete(project)"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
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
    .stage-picker {
      position: relative;
      width: max-content;
      max-width: 16rem;
    }

    .stage-trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.2rem 0.55rem;
      border: 1px solid #c7cdfb;
      border-radius: 999px;
      background: #eef0ff;
      color: #4c51bf;
      font: inherit;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }

    .stage-trigger:focus-visible,
    .stage-option:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(90, 103, 216, 0.2);
    }

    .stage-chevron {
      width: 0.4rem;
      height: 0.4rem;
      border-right: 1.5px solid currentColor;
      border-bottom: 1.5px solid currentColor;
      transform: translateY(-0.1rem) rotate(45deg);
    }

    .stage-options {
      position: fixed;
      inset: auto;
      margin: 0;
      display: grid;
      width: max-content;
      max-width: calc(100vw - 1rem);
      max-height: none;
      overflow: visible;
      padding: 0.3rem;
      border: 1px solid #e3e8ef;
      border-radius: 8px;
      background: #fff;
      color: #1f2933;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
    }

    .stage-options:not(:popover-open) {
      display: none;
    }

    .stage-option {
      padding: 0.5rem 0.6rem;
      border: 0;
      border-radius: 5px;
      background: transparent;
      color: #1f2933;
      font: inherit;
      font-size: 0.8rem;
      text-align: left;
      white-space: nowrap;
      cursor: pointer;
    }

    .stage-option:hover,
    .stage-option[aria-selected="true"] {
      background: #eef0ff;
      color: #4c51bf;
    }

    .assigned-users {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      min-width: 8rem;
    }

    .assigned-user {
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      background: #e8eef7;
      color: #334e68;
      font-size: 0.75rem;
      white-space: nowrap;
    }

    .status-badge.status-completed {
      background: #e8eef7;
      color: #334e68;
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
  readonly assignments = signal<Record<string, ProjectAssignment[]>>({});
  readonly stagesLoading = signal(false);
  readonly assignmentsLoading = signal(false);
  readonly assignmentsError = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly formOpen = signal(false);
  readonly editing = signal<Project | null>(null);
  readonly assigning = signal<Project | null>(null);
  readonly stagesOf = signal<Project | null>(null);

  activeProjectsCount(): number {
    return this.projects().filter(project => this.projectStatus(project) === 'ACTIVE').length;
  }

  stagesInProgressCount(): number {
    return this.projects().filter(project => {
      if (this.projectStatus(project) !== 'ACTIVE') {
        return false;
      }
      const stages = this.stagesFor(project.id);
      const currentIndex = stages.findIndex(stage => stage.id === this.currentStageId(project.id));
      return currentIndex >= 0 && currentIndex < stages.length - 1;
    }).length;
  }

  averageProgressPercentage(): number | null {
    const progressValues = this.projects()
      .filter(project => this.projectStatus(project) === 'ACTIVE')
      .map(project => {
        const stages = this.stagesFor(project.id);
        const currentIndex = stages.findIndex(stage => stage.id === this.currentStageId(project.id));
        return currentIndex >= 0 ? ((currentIndex + 1) / stages.length) * 100 : null;
      })
      .filter((progress): progress is number => progress !== null);

    if (progressValues.length === 0) {
      return null;
    }

    return Math.round(progressValues.reduce((total, progress) => total + progress, 0) / progressValues.length);
  }

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

  onAssignmentsClosed(): void {
    this.assigning.set(null);
    this.loadAssignments(this.projects());
  }

  /** Etapas del proyecto, en el orden definido por el backend. */
  stagesFor(projectId: string): ProjectStage[] {
    return this.stages()[projectId] ?? [];
  }

  assignmentsFor(projectId: string): ProjectAssignment[] {
    return this.assignments()[projectId] ?? [];
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

  currentStageLabel(projectId: string): string {
    const stage = this.stagesFor(projectId).find(item => item.id === this.currentStageId(projectId));
    return stage ? `${stage.order}. ${stage.name}` : '—';
  }

  projectStatus(project: Project): string {
    if (project.status === 'COMPLETED') {
      return project.status;
    }

    const currentStage = this.stagesFor(project.id)
      .find(stage => stage.id === this.currentStageId(project.id));
    return project.status === 'ACTIVE' && currentStage?.order === 6
      ? 'COMPLETED'
      : project.status;
  }

  toggleStageOptions(event: MouseEvent): void {
    const trigger = event.currentTarget as HTMLButtonElement;
    const options = trigger.nextElementSibling as HTMLElement;
    if (options.matches(':popover-open')) {
      options.hidePopover();
      return;
    }

    options.showPopover();
    this.positionPopover(trigger, options, false);
  }

  toggleActionMenu(event: MouseEvent): void {
    const trigger = event.currentTarget as HTMLButtonElement;
    const menu = trigger.nextElementSibling as HTMLElement;
    if (menu.matches(':popover-open')) {
      menu.hidePopover();
      return;
    }

    menu.showPopover();
    this.positionPopover(trigger, menu, true);
  }

  private positionPopover(trigger: HTMLButtonElement, popover: HTMLElement, alignRight: boolean): void {
    const triggerBounds = trigger.getBoundingClientRect();
    const popoverBounds = popover.getBoundingClientRect();
    const gap = 6;
    const viewportPadding = 8;
    const belowTop = triggerBounds.bottom + gap;
    const fitsBelow = belowTop + popoverBounds.height <= window.innerHeight - viewportPadding;
    const fitsAbove = triggerBounds.top - popoverBounds.height - gap >= viewportPadding;
    const top = fitsBelow || !fitsAbove
      ? Math.min(belowTop, window.innerHeight - popoverBounds.height - viewportPadding)
      : triggerBounds.top - popoverBounds.height - gap;
    const preferredLeft = alignRight
      ? triggerBounds.right - popoverBounds.width
      : triggerBounds.left;
    const left = Math.min(
      Math.max(viewportPadding, preferredLeft),
      window.innerWidth - popoverBounds.width - viewportPadding
    );

    popover.style.top = `${Math.max(viewportPadding, top)}px`;
    popover.style.left = `${Math.max(viewportPadding, left)}px`;
  }

  @HostListener('document:click', ['$event'])
  closeStageOptionsOnOutsideClick(event: MouseEvent): void {
    if (!(event.target instanceof Element)) {
      return;
    }
    const target = event.target;

    document.querySelectorAll<HTMLElement>('.stage-options:popover-open, .action-menu:popover-open').forEach(options => {
      if (!options.parentElement?.contains(target)) {
        options.hidePopover();
      }
    });
  }

  changeStage(project: Project, stage: ProjectStage): void {
    if (!this.stagesFor(project.id).some(item => item.id === stage.id)) {
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
    if (status === 'ACTIVE') {
      return 'Activo';
    }
    if (status === 'COMPLETED') {
      return 'Completado';
    }
    return status;
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
        this.loadAssignments(projects);
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

  private loadAssignments(projects: Project[]): void {
    if (!this.isAdmin || projects.length === 0) {
      this.assignments.set({});
      this.assignmentsLoading.set(false);
      this.assignmentsError.set(false);
      return;
    }

    this.assignmentsLoading.set(true);
    this.assignmentsError.set(false);
    forkJoin(projects.map(project => this.projectsService.listAssignments(project.id))).subscribe({
      next: assignmentLists => {
        const byProject: Record<string, ProjectAssignment[]> = {};
        projects.forEach((project, index) => {
          byProject[project.id] = assignmentLists[index] ?? [];
        });
        this.assignments.set(byProject);
        this.assignmentsLoading.set(false);
      },
      error: err => {
        this.assignmentsLoading.set(false);
        this.assignmentsError.set(true);
        this.error.set(projectErrorMessage(err));
      }
    });
  }
}
