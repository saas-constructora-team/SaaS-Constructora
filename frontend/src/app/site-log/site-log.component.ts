import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { RealtimeService } from '../core/realtime.service';
import { Project, ProjectAssignment, ProjectChangeEvent } from '../projects/project.model';
import { ProjectService, projectErrorMessage } from '../projects/project.service';
import { SiteLogEntry, SiteLogRecordRequest, SiteLogStatus, SiteLogType } from './site-log.model';
import { SiteLogService, siteLogErrorMessage } from './site-log.service';

@Component({
  selector: 'app-site-log',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-shell site-log-page">
      <header class="topbar">
        <div>
          <p class="brand">Obras · Campo</p>
          <h1 class="page-title">Bitácora de obra</h1>
          <p class="page-subtitle">Registra avances y novedades con trazabilidad completa.</p>
        </div>
        <div class="topbar-actions">
          <button class="btn btn-primary" type="button" (click)="openForm()">Nueva entrada</button>
        </div>
      </header>

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      @if (notice()) {
        <div class="alert alert-success" role="status">{{ notice() }}</div>
      }

      @if (loading()) {
        <p class="muted" role="status">Cargando bitácora…</p>
      }

      <section class="project-toolbar" aria-label="Controles de la bitácora">
        <label class="project-select">
          <span>Proyecto</span>
          <select [value]="selectedProjectId()" (change)="changeProject($event)">
            @for (project of projects(); track project.id) {
              <option [value]="project.id">{{ project.name }}</option>
            }
            @if (projects().length === 0) {
              <option value="">Todos los proyectos</option>
            }
          </select>
        </label>

        <label class="search-field">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6"></circle>
            <path d="M16 16l4 4"></path>
          </svg>
          <span class="sr-only">Buscar</span>
          <input
            type="search"
            placeholder="Buscar novedades..."
            [value]="search()"
            (input)="search.set(searchInput($event))"
          >
        </label>

        <div class="filter-chips" aria-label="Filtrar por tipo">
          <button type="button" [class.active]="typeFilter() === 'TODOS'" (click)="typeFilter.set('TODOS')">Todos</button>
          <button type="button" [class.active]="typeFilter() === 'AVANCE'" (click)="typeFilter.set('AVANCE')">Avances</button>
          <button type="button" [class.active]="typeFilter() === 'NOVEDAD'" (click)="typeFilter.set('NOVEDAD')">Novedades</button>
          <button type="button" [class.active]="typeFilter() === 'RETRASO'" (click)="typeFilter.set('RETRASO')">Retrasos</button>
        </div>
      </section>

      <section class="summary-grid" aria-label="Resumen de actividad">
        <article>
          <span class="summary-icon summary-blue">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"></path></svg>
          </span>
          <div><strong>{{ entriesToday().length }}</strong><span>Entradas hoy</span></div>
        </article>
        <article>
          <span class="summary-icon summary-orange">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"></path></svg>
          </span>
          <div><strong>{{ openCount() }}</strong><span>Novedades abiertas</span></div>
        </article>
        <article>
          <span class="summary-icon summary-green">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4 10-10"></path></svg>
          </span>
          <div><strong>{{ resolvedCount() }}</strong><span>Resueltos</span></div>
        </article>
      </section>

      @if (formOpen()) {
        <section class="entry-panel" aria-labelledby="entry-form-title">
          <header class="entry-panel-header">
            <div>
              <p class="brand">{{ editingId() ? 'Editar registro' : 'Nuevo registro' }}</p>
              <h2 id="entry-form-title">{{ editingId() ? 'Actualizar entrada' : 'Agregar a la bitácora' }}</h2>
            </div>
            <button class="icon-button" type="button" aria-label="Cerrar formulario" (click)="closeForm()">×</button>
          </header>

          <form [formGroup]="entryForm" (ngSubmit)="saveEntry()">
            <div class="form-grid">
              <label>
                <span>Tipo de registro</span>
                <select formControlName="type">
                  <option value="AVANCE">Avance</option>
                  <option value="NOVEDAD">Novedad</option>
                  <option value="RETRASO">Retraso</option>
                </select>
              </label>
              <label>
                <span>Estado</span>
                <select formControlName="status">
                  <option value="ABIERTO">Abierto</option>
                  <option value="EN_PROCESO">En proceso</option>
                  <option value="RESUELTO">Resuelto</option>
                </select>
              </label>
              <label>
                <span>Fecha y hora</span>
                <input type="datetime-local" formControlName="when">
              </label>
              <label>
                <span>Ubicación</span>
                <input type="text" formControlName="where" placeholder="Ej. Piso 3 - Torre A">
              </label>
              <label>
                <span>Usuario responsable</span>
                <select formControlName="assigneeId">
                  <option value="">Sin asignar</option>
                  @for (assignment of assignments(); track assignment.userId) {
                    <option [value]="assignment.userId">{{ assignment.userFullName || assignment.userEmail || 'Usuario asignado' }}</option>
                  }
                </select>
              </label>
              <label class="wide-field">
                <span>¿Qué ocurrió?</span>
                <input type="text" formControlName="what" placeholder="Describe el avance o la novedad">
              </label>
              <label class="wide-field">
                <span>¿Cómo se realizó o qué se encontró?</span>
                <textarea formControlName="how" rows="3" placeholder="Incluye métodos, detalles técnicos o evidencias"></textarea>
              </label>
              <label class="wide-field">
                <span>¿Por qué ocurrió?</span>
                <textarea formControlName="why" rows="2" placeholder="Causa, contexto o razón"></textarea>
              </label>
            </div>

            <div class="entry-form-actions">
              <button class="btn btn-ghost" type="button" (click)="closeForm()">Cancelar</button>
              <button class="btn btn-primary" type="submit" [disabled]="entryForm.invalid || saving()">Guardar entrada</button>
            </div>
          </form>
        </section>
      }

      <section class="log-section" aria-labelledby="log-title">
        <div class="log-heading">
          <div>
            <h2 id="log-title">Actividad reciente</h2>
            <p>{{ filteredEntries().length }} registros encontrados</p>
          </div>
        </div>

        @if (filteredEntries().length === 0) {
          <div class="empty-log">
            <span>01</span>
            <h3>No hay registros que mostrar</h3>
            <p>Agrega una entrada para iniciar la trazabilidad de este proyecto.</p>
          </div>
        } @else {
          <div class="timeline">
            @for (entry of filteredEntries(); track entry.id) {
              <article class="timeline-entry" [class]="'tone-' + entry.type.toLowerCase()">
                <div class="timeline-marker" aria-hidden="true"></div>
                <div class="timeline-card">
                  <header>
                    <div class="entry-meta">
                      <span class="type-badge">{{ typeLabel(entry.type) }}</span>
                      <span class="entry-date">{{ entry.when | date: 'dd MMM yyyy · HH:mm' }}</span>
                    </div>
                    <span class="status-badge" [class.status-resolved]="entry.status === 'RESUELTO'">
                      {{ statusLabel(entry.status) }}
                    </span>
                  </header>

                  <h3>{{ entry.what }}</h3>
                  <p class="entry-location">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>
                    {{ entry.where }}
                  </p>
                  <div class="entry-details">
                    <p><span>Cómo</span>{{ entry.how }}</p>
                    @if (entry.why) {
                      <p><span>Por qué</span>{{ entry.why }}</p>
                    }
                  </div>
                  <footer>
                    @if (entry.assigneeName) {
                      <span class="assignee-chip" [attr.title]="'Responsable: ' + entry.assigneeName">
                        Responsable: {{ entry.assigneeName }}
                      </span>
                    }
                    @if (entry.photos > 0) {
                      <button type="button" class="photo-count" (click)="notice.set(entry.photos + ' evidencia(s) adjunta(s).')">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8.5" cy="10" r="1.5"></circle><path d="M4 17l5-5 3 3 3-3 5 5"></path></svg>
                        {{ entry.photos }}
                      </button>
                    }
                    <div class="entry-actions" aria-label="Acciones de la entrada">
                      <button
                        type="button"
                        class="entry-action"
                        title="Actualizar entrada"
                        aria-label="Actualizar entrada"
                        (click)="refreshEntry(entry)"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6v5h-5"></path><path d="M18.5 15.5A8 8 0 1 1 19.7 9"></path></svg>
                      </button>
                      <button
                        type="button"
                        class="entry-action"
                        title="Editar entrada"
                        aria-label="Editar entrada"
                        (click)="editEntry(entry)"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"></path></svg>
                      </button>
                      <button
                        type="button"
                        class="entry-action entry-action-danger"
                        title="Eliminar entrada"
                        aria-label="Eliminar entrada"
                        (click)="deleteEntry(entry)"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V3h8v3M19 6l-1 15H6L5 6M10 10v7M14 10v7"></path></svg>
                      </button>
                    </div>
                  </footer>
                </div>
              </article>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .site-log-page { gap: 1rem; padding-bottom: 4rem; }
    .project-toolbar { display: grid; grid-template-columns: 230px minmax(220px, 1fr) auto; align-items: end; gap: .75rem; }
    .project-select, .search-field { display: flex; flex-direction: column; gap: .35rem; }
    .project-select > span { color: #52606d; font-size: .75rem; font-weight: 700; }
    select, input, textarea { box-sizing: border-box; width: 100%; border: 1px solid #dfe4ea; border-radius: 8px; background: #fff; color: #1f2933; font: inherit; outline: none; }
    select, input { height: 42px; padding: 0 .75rem; }
    textarea { padding: .65rem .75rem; resize: vertical; }
    select:focus, input:focus, textarea:focus { border-color: #5a67d8; box-shadow: 0 0 0 3px rgba(90,103,216,.12); }
    .search-field { position: relative; height: 42px; align-self: end; }
    .search-field svg { position: absolute; left: .8rem; top: 12px; width: 18px; height: 18px; fill: none; stroke: #87909a; stroke-width: 1.8; }
    .search-field input { padding-left: 2.25rem; }
    .filter-chips { display: flex; height: 42px; align-items: center; gap: .25rem; padding: 3px; border: 1px solid #e1e5ea; border-radius: 9px; background: #fff; }
    .filter-chips button { height: 34px; padding: 0 .65rem; border: 0; border-radius: 6px; background: transparent; color: #64748b; font: inherit; font-size: .78rem; cursor: pointer; }
    .filter-chips button.active { background: #222326; color: #fff; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; }
    .summary-grid article { display: flex; align-items: center; gap: .75rem; padding: .85rem 1rem; border: 1px solid #e3e8ef; border-radius: 10px; background: #fff; }
    .summary-grid article div { display: flex; flex-direction: column; }
    .summary-grid strong { color: #1f2933; font-size: 1.25rem; }
    .summary-grid article div span { color: #64748b; font-size: .78rem; }
    .summary-icon { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 9px; }
    .summary-icon svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.8; }
    .summary-blue { background: #edf1ff; color: #5966c5; } .summary-orange { background: #fff1e8; color: #d07845; } .summary-green { background: #eaf7ef; color: #4b9463; }
    .entry-panel { border: 1px solid #dfe4ea; border-radius: 12px; background: #fff; box-shadow: 0 10px 30px rgba(15,23,42,.08); overflow: hidden; }
    .entry-panel-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid #edf0f3; }
    .entry-panel-header h2 { margin: 0; font-size: 1.05rem; }
    .icon-button { width: 34px; height: 34px; border: 0; border-radius: 50%; background: #f1f3f5; color: #52606d; font-size: 1.25rem; cursor: pointer; }
    form { padding: 1.25rem; }
    .form-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .85rem; }
    .form-grid label { display: flex; flex-direction: column; gap: .35rem; color: #52606d; font-size: .78rem; font-weight: 700; }
    .wide-field { grid-column: span 2; }
    .entry-form-actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1rem; }
    .log-section { margin-top: .25rem; }
    .log-heading { display: flex; justify-content: space-between; align-items: end; padding: .55rem 0; }
    .log-heading h2 { margin: 0 0 .15rem; font-size: 1.05rem; } .log-heading p { margin: 0; color: #7b8794; font-size: .78rem; }
    .timeline { position: relative; padding: .25rem 0; }
    .timeline::before { content: ''; position: absolute; left: 15px; top: 0; bottom: 0; width: 1px; background: #dfe4ea; }
    .timeline-entry { position: relative; display: grid; grid-template-columns: 32px minmax(0, 1fr); padding-bottom: .75rem; }
    .timeline-marker { position: relative; z-index: 1; width: 11px; height: 11px; margin: 20px 0 0 10px; border: 3px solid #fff; border-radius: 50%; background: #5a67d8; box-shadow: 0 0 0 1px #dfe4ea; }
    .tone-novedad .timeline-marker { background: #d07845; } .tone-retraso .timeline-marker { background: #c84f56; }
    .timeline-card { border: 1px solid #e3e8ef; border-radius: 10px; background: #fff; }
    .timeline-card header { display: flex; align-items: center; justify-content: space-between; padding: .75rem 1rem .35rem; }
    .entry-meta { display: flex; align-items: center; gap: .65rem; } .type-badge { padding: .22rem .48rem; border-radius: 999px; background: #edf1ff; color: #5966c5; font-size: .68rem; font-weight: 800; text-transform: uppercase; }
    .tone-novedad .type-badge { background: #fff1e8; color: #a85e35; } .tone-retraso .type-badge { background: #fdebec; color: #a53f46; }
    .entry-date { color: #7b8794; font-size: .75rem; }
    .timeline-card h3 { margin: .35rem 1rem .25rem; font-size: .98rem; } .entry-location { display: flex; align-items: center; gap: .35rem; margin: 0 1rem .7rem; color: #64748b; font-size: .78rem; }
    .entry-location svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.8; }
    .entry-details { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: .5rem; margin: 0 1rem; }
    .entry-details p { margin: 0 0 .75rem; color: #52606d; font-size: .8rem; line-height: 1.45; } .entry-details p span { display: block; margin-bottom: .15rem; color: #1f2933; font-weight: 700; }
    .timeline-card footer { min-height: 42px; display: flex; align-items: center; gap: .5rem; padding: .45rem 1rem; border-top: 1px solid #edf0f3; color: #64748b; font-size: .75rem; }
    .entry-author { width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; background: #d98b71; color: #fff; font-size: .65rem; font-weight: 800; }
    .assignee-chip { margin-right: auto; margin-left: .35rem; padding: .22rem .5rem; border-radius: 999px; background: #edf1ff; color: #5966c5; font-size: .72rem; font-weight: 700; }
    .photo-count { margin-left: auto; display: flex; align-items: center; gap: .35rem; border: 0; background: transparent; color: #64748b; font: inherit; cursor: pointer; } .photo-count svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.6; }
    .entry-actions { display: flex; align-items: center; gap: .35rem; margin-left: auto; }
    .entry-action { width: 32px; height: 32px; display: grid; place-items: center; padding: 0; border: 1px solid #dfe4ea; border-radius: 7px; background: #fff; color: #52606d; cursor: pointer; transition: .15s ease; }
    .entry-action svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .entry-action:hover { border-color: #bcc4ce; background: #f6f7f9; color: #222326; }
    .entry-action-danger:hover { border-color: #efb7bb; background: #fff4f4; color: #b42318; }
    .entry-action:focus-visible { outline: 3px solid rgba(90,103,216,.18); border-color: #5a67d8; }
    .status-badge.status-resolved { background: #eaf7ef; color: #3f8054; }
    .empty-log { display: grid; place-items: center; min-height: 220px; border: 1px dashed #dfe4ea; border-radius: 12px; background: #fff; text-align: center; }
    .empty-log span { color: #dfe4ea; font-size: 3rem; font-weight: 800; } .empty-log h3 { margin: -.5rem 0 .25rem; } .empty-log p { margin: 0; color: #64748b; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
    @media (max-width: 900px) { .project-toolbar { grid-template-columns: 1fr; } .summary-grid { grid-template-columns: 1fr; } .form-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } .filter-chips { width: 100%; overflow-x: auto; } }
    @media (max-width: 600px) { .form-grid, .entry-details { grid-template-columns: 1fr; } .wide-field { grid-column: auto; } .timeline-card header { align-items:flex-start; gap:.5rem; } }
  `]
})
export class SiteLogComponent implements OnInit, OnDestroy {
  private readonly projectsService = inject(ProjectService);
  private readonly siteLogService = inject(SiteLogService);
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(RealtimeService);
  private stopRealtime: (() => void) | null = null;

  readonly projects = signal<Project[]>([]);
  readonly selectedProjectId = signal('');
  readonly search = signal('');
  readonly typeFilter = signal<'TODOS' | SiteLogType>('TODOS');
  readonly formOpen = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly entries = signal<SiteLogEntry[]>([]);
  readonly editingId = signal<string | null>(null);
  readonly assignments = signal<ProjectAssignment[]>([]);

  readonly entryForm = new FormGroup({
    type: new FormControl<SiteLogType>('AVANCE', { nonNullable: true }),
    status: new FormControl<SiteLogStatus>('ABIERTO', { nonNullable: true }),
    when: new FormControl(this.localDateTime(), { nonNullable: true, validators: [Validators.required] }),
    where: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    what: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    how: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    why: new FormControl('', { nonNullable: true }),
    assigneeId: new FormControl('', { nonNullable: true })
  });

  ngOnInit(): void {
    this.projectsService.list().subscribe({
      next: projects => {
        this.projects.set(projects);
        const firstProjectId = projects[0]?.id ?? '';
        this.selectedProjectId.set(firstProjectId);
        if (firstProjectId) {
          this.loadAssignments(firstProjectId, true);
        }
        this.loadEntries(firstProjectId);
        this.subscribeToProject(firstProjectId);
      },
      error: err => this.error.set(projectErrorMessage(err))
    });
  }

  ngOnDestroy(): void {
    this.stopRealtime?.();
    this.stopRealtime = null;
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    const projectId = this.selectedProjectId();
    if (projectId) {
      this.loadEntries(projectId);
    }
  }

  private subscribeToProject(projectId: string): void {
    this.stopRealtime?.();
    this.stopRealtime = projectId
      ? this.realtime.changes(event => this.onProjectChanged(event), projectId)
      : null;
  }

  private onProjectChanged(event: ProjectChangeEvent): void {
    if (event.projectId === this.selectedProjectId()
        && (event.section === 'SITE_LOG' || event.section === 'DOCUMENT')) {
      this.loadEntries(this.selectedProjectId());
      if (event.section === 'SITE_LOG') {
        this.loadAssignments(this.selectedProjectId(), false);
      }
    }
  }

  openForm(): void {
    this.notice.set(null);
    this.editingId.set(null);
    const session = this.auth.session();
    this.entryForm.reset({
      type: 'AVANCE',
      status: 'ABIERTO',
      when: this.localDateTime(),
      where: '',
      what: '',
      how: '',
      why: '',
      assigneeId: this.assignments().some(item => item.userId === session?.user.id)
        ? session?.user.id ?? ''
        : ''
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
  }

  saveEntry(): void {
    if (this.entryForm.invalid || this.saving()) return;
    const value = this.entryForm.getRawValue();
    const projectId = this.selectedProjectId();
    if (!projectId) {
      this.error.set('Selecciona un proyecto para guardar la entrada.');
      return;
    }

    const req: SiteLogRecordRequest = {
      type: value.type,
      status: value.status,
      when: value.when,
      where: value.where.trim(),
      what: value.what.trim(),
      how: value.how.trim(),
      why: value.why.trim() || null,
      assigneeId: value.assigneeId || null
    };
    const editingId = this.editingId();
    this.saving.set(true);
    this.error.set(null);
    const request$ = editingId
      ? this.siteLogService.update(projectId, editingId, req)
      : this.siteLogService.create(projectId, req);

    request$.subscribe({
      next: entry => {
        this.saving.set(false);
        this.entries.update(items => editingId
          ? items.map(item => item.id === editingId ? entry : item)
          : [entry, ...items]);
        this.notice.set(editingId
          ? 'Entrada actualizada correctamente.'
          : 'Entrada agregada correctamente a la bitácora.');
        this.closeForm();
      },
      error: err => {
        this.saving.set(false);
        this.error.set(siteLogErrorMessage(err));
      }
    });
  }

  editEntry(entry: SiteLogEntry): void {
    this.notice.set(null);
    this.error.set(null);
    this.editingId.set(entry.id);
    if (entry.projectId) {
      this.selectedProjectId.set(entry.projectId);
      this.loadAssignments(entry.projectId, false);
    }
    this.entryForm.reset({
      type: entry.type,
      status: entry.status,
      when: entry.when.slice(0, 16),
      where: entry.where,
      what: entry.what,
      how: entry.how,
      why: entry.why ?? '',
      assigneeId: entry.assigneeId ?? ''
    });
    this.formOpen.set(true);
  }

  refreshEntry(entry: SiteLogEntry): void {
    const projectId = entry.projectId || this.selectedProjectId();
    if (!projectId) return;
    this.notice.set(null);
    this.siteLogService.touch(projectId, entry.id).subscribe({
      next: updated => {
        this.entries.update(items => items.map(item => item.id === updated.id ? updated : item));
        this.notice.set('Entrada actualizada con la fecha de modificación.');
      },
      error: err => this.error.set(siteLogErrorMessage(err))
    });
  }

  deleteEntry(entry: SiteLogEntry): void {
    if (!window.confirm(`¿Eliminar la entrada "${entry.what}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    const projectId = entry.projectId || this.selectedProjectId();
    if (!projectId) return;
    this.notice.set(null);
    this.siteLogService.remove(projectId, entry.id).subscribe({
      next: () => {
        this.entries.update(items => items.filter(item => item.id !== entry.id));
        if (this.editingId() === entry.id) {
          this.closeForm();
        }
        this.notice.set('Entrada eliminada correctamente.');
      },
      error: err => this.error.set(siteLogErrorMessage(err))
    });
  }

  changeProject(event: Event): void {
    const projectId = (event.target as HTMLSelectElement).value;
    this.selectedProjectId.set(projectId);
    this.entryForm.patchValue({ assigneeId: '' });
    this.loadAssignments(projectId, false);
    this.loadEntries(projectId);
    this.subscribeToProject(projectId);
  }

  searchInput(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  filteredEntries(): SiteLogEntry[] {
    const term = this.search().trim().toLowerCase();
    const projectId = this.selectedProjectId();
    return this.entries().filter(entry =>
      (!projectId || entry.projectId === projectId || entry.projectId === '') &&
      (this.typeFilter() === 'TODOS' || entry.type === this.typeFilter()) &&
      (!term || `${entry.what} ${entry.how} ${entry.where} ${entry.why}`.toLowerCase().includes(term))
    );
  }

  entriesToday(): SiteLogEntry[] {
    const today = new Date().toISOString().slice(0, 10);
    return this.filteredEntries().filter(entry => entry.when.startsWith(today));
  }

  openCount(): number {
    return this.filteredEntries().filter(entry => entry.status !== 'RESUELTO').length;
  }

  resolvedCount(): number {
    return this.filteredEntries().filter(entry => entry.status === 'RESUELTO').length;
  }

  typeLabel(type: SiteLogType): string {
    return type === 'AVANCE' ? 'Avance' : type === 'NOVEDAD' ? 'Novedad' : 'Retraso';
  }

  statusLabel(status: SiteLogStatus): string {
    return status === 'ABIERTO' ? 'Abierto' : status === 'EN_PROCESO' ? 'En proceso' : 'Resuelto';
  }

  initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();
  }

  private loadAssignments(projectId: string, setCurrentUserAsDefault: boolean): void {
    if (!projectId) {
      this.assignments.set([]);
      return;
    }
    this.projectsService.listAssignments(projectId).subscribe({
      next: assignments => {
        const session = this.auth.session();
        const merged = [...assignments];
        if (session && !merged.some(item => item.userId === session.user.id)) {
          merged.push({
            id: `session-${session.user.id}`,
            projectId,
            userId: session.user.id,
            userFullName: session.user.fullName,
            userEmail: session.user.email,
            userRole: session.user.role,
            assignedAt: new Date().toISOString()
          });
        }
        this.assignments.set(merged);
        if (setCurrentUserAsDefault) {
          this.entryForm.patchValue({
            assigneeId: merged.some(item => item.userId === session?.user.id)
              ? session?.user.id ?? ''
              : ''
          });
        }
      },
      error: err => {
        const session = this.auth.session();
        if (session) {
          this.assignments.set([{
            id: `session-${session.user.id}`,
            projectId,
            userId: session.user.id,
            userFullName: session.user.fullName,
            userEmail: session.user.email,
            userRole: session.user.role,
            assignedAt: new Date().toISOString()
          }]);
          if (setCurrentUserAsDefault) {
            this.entryForm.patchValue({ assigneeId: session.user.id });
          }
        } else {
          this.assignments.set([]);
        }
        if (err.status !== 403) {
          this.error.set(projectErrorMessage(err));
        }
      }
    });
  }

  private loadEntries(projectId: string): void {
    if (!projectId) {
      this.entries.set([]);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.siteLogService.list(projectId).subscribe({
      next: entries => {
        this.loading.set(false);
        this.entries.set(entries);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(siteLogErrorMessage(err));
      }
    });
  }

  private localDateTime(): string {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 16);
  }
}
