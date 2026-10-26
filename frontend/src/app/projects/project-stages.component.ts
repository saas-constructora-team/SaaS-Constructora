import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal
} from '@angular/core';
import { ProjectStage } from './project.model';
import { ProjectService, projectErrorMessage } from './project.service';

/**
 * Etapas de un proyecto. El backend crea las seis etapas iniciales al
 * registrar el proyecto y permite agregar, renombrar y eliminar etapas.
 * ADMIN gestiona cualquier proyecto de su empresa; un MEMBER solo los
 * proyectos que tiene asignados.
 */
@Component({
  selector: 'app-project-stages',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel">
      <header class="panel-header">
        <div>
          <h2 class="panel-title">Etapas del proyecto</h2>
          <p class="panel-subtitle">{{ projectName }}</p>
        </div>
        <button class="btn btn-ghost" type="button" (click)="closed.emit()">Cerrar</button>
      </header>

      @if (notice()) {
        <div class="alert alert-success" role="status">{{ notice() }}</div>
      }

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      <div class="stage-add">
        <label class="form-label" for="stage-new-name">Agregar etapa</label>
        <div class="stage-add-controls">
          <input
            class="form-input"
            id="stage-new-name"
            type="text"
            maxlength="150"
            placeholder="Nombre de la etapa"
            [value]="newStageName()"
            [disabled]="saving()"
            (input)="onNewStageInput($event)"
            (keyup.enter)="addStage()"
          >
          <button
            class="btn btn-primary"
            type="button"
            [disabled]="saving() || newStageName().trim().length === 0"
            (click)="addStage()"
          >
            {{ saving() ? 'Guardando…' : 'Agregar' }}
          </button>
        </div>
      </div>

      @if (loading()) {
        <p class="muted">Cargando etapas…</p>
      } @else if (stages().length === 0) {
        <p class="muted">Este proyecto todavía no tiene etapas.</p>
      } @else {
        <ol class="stage-list">
          @for (stage of stages(); track stage.id) {
            <li class="stage-item">
              <span class="stage-order">{{ stage.order }}</span>

              @if (editingId() === stage.id) {
                <input
                  class="form-input stage-input"
                  type="text"
                  maxlength="150"
                  [value]="editingName()"
                  [disabled]="saving()"
                  (input)="onEditingInput($event)"
                  (keyup.enter)="saveEditing(stage)"
                  (keyup.escape)="cancelEditing()"
                >
                <div class="stage-actions">
                  <button
                    class="btn btn-small btn-primary"
                    type="button"
                    [disabled]="saving() || editingName().trim().length === 0"
                    (click)="saveEditing(stage)"
                  >
                    Guardar
                  </button>
                  <button
                    class="btn btn-small"
                    type="button"
                    [disabled]="saving()"
                    (click)="cancelEditing()"
                  >
                    Cancelar
                  </button>
                </div>
              } @else {
                <span class="stage-name">{{ stage.name }}</span>
                <div class="stage-actions">
                  <button
                    class="btn btn-small"
                    type="button"
                    [disabled]="saving()"
                    (click)="startEditing(stage)"
                  >
                    Editar
                  </button>
                  <button
                    class="btn btn-small btn-danger-ghost"
                    type="button"
                    [disabled]="saving()"
                    (click)="confirmDelete(stage)"
                  >
                    Eliminar
                  </button>
                </div>
              }
            </li>
          }
        </ol>
      }
    </section>
  `,
  styles: [`
    .stage-add {
      margin-bottom: 1rem;
    }

    .stage-add-controls {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.35rem;
    }

    .stage-add-controls .form-input {
      flex: 1;
    }

    .stage-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .stage-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.7rem 0;
      border-top: 1px solid #eef2f6;
    }

    .stage-item:first-child {
      border-top: none;
    }

    .stage-order {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      flex: 0 0 auto;
      border-radius: 999px;
      background: #e8eef7;
      color: #334e68;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .stage-name {
      flex: 1;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .stage-input {
      flex: 1;
    }

    .stage-actions {
      display: flex;
      gap: 0.35rem;
      margin-left: auto;
    }
  `]
})
export class ProjectStagesComponent implements OnChanges {
  private readonly projects = inject(ProjectService);

  @Input({ required: true }) projectId!: string;
  @Input() projectName = '';
  @Output() readonly closed = new EventEmitter<void>();

  readonly stages = signal<ProjectStage[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly newStageName = signal('');
  readonly editingId = signal<string | null>(null);
  readonly editingName = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projectId']) {
      this.cancelEditing();
      this.newStageName.set('');
      this.notice.set(null);
      this.load();
    }
  }

  onNewStageInput(event: Event): void {
    this.newStageName.set((event.target as HTMLInputElement).value);
  }

  onEditingInput(event: Event): void {
    this.editingName.set((event.target as HTMLInputElement).value);
  }

  addStage(): void {
    const name = this.newStageName().trim();
    if (!name || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.projects.createStage(this.projectId, { name }).subscribe({
      next: () => {
        this.saving.set(false);
        this.newStageName.set('');
        this.notice.set('Etapa agregada correctamente.');
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.error.set(projectErrorMessage(err));
      }
    });
  }

  startEditing(stage: ProjectStage): void {
    this.error.set(null);
    this.notice.set(null);
    this.editingId.set(stage.id);
    this.editingName.set(stage.name);
  }

  cancelEditing(): void {
    this.editingId.set(null);
    this.editingName.set('');
  }

  saveEditing(stage: ProjectStage): void {
    const name = this.editingName().trim();
    if (!name || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.projects.updateStage(this.projectId, stage.id, { name }).subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelEditing();
        this.notice.set('Etapa actualizada correctamente.');
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.error.set(projectErrorMessage(err));
      }
    });
  }

  confirmDelete(stage: ProjectStage): void {
    const confirmed = window.confirm(
      `¿Eliminar la etapa "${stage.name}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.projects.deleteStage(this.projectId, stage.id).subscribe({
      next: () => {
        this.saving.set(false);
        if (this.editingId() === stage.id) {
          this.cancelEditing();
        }
        this.notice.set('Etapa eliminada correctamente.');
        this.load();
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
    this.projects.listStages(this.projectId).subscribe({
      next: stages => {
        this.stages.set(stages);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(projectErrorMessage(err));
      }
    });
  }
}
