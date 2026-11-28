import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import {
  LucideChevronDown,
  LucideGripVertical,
  LucidePalette,
  LucidePlus,
  LucideSearch,
  LucideSquarePen,
  LucideX
} from '@lucide/angular';
import { watchProjectChanges } from '../core/project-changes';
import { RealtimeService } from '../core/realtime.service';
import {
  Project,
  ProjectAssignment,
  StageColor,
  UpdateStageColorsRequest
} from '../projects/project.model';
import { ProjectService, projectErrorMessage } from '../projects/project.service';
import {
  AreaDetails,
  AreaTipo,
  BoardStage,
  CapituloPresupuestal,
  CategoriaInsumo,
  CreateTaskRequest,
  Disciplina,
  PermisoSst,
  Task,
  TaskArea,
  TaskBoard,
  TaskStatusInfo,
  TipoDocumentoContable,
  UnidadMedida
} from './task.model';
import { TaskService, taskErrorMessage } from './task.service';

interface BoardColumn {
  key: string;
  name: string;
  order: number;
  color: StageColor;
  stages: BoardStage[];
  tasks: Task[];
}

interface ProjectOption {
  id: string;
  name: string;
}

interface StageOption {
  key: string;
  label: string;
}

interface StageColorOption {
  value: StageColor;
  label: string;
  token: string;
}

/** Borrador de los 19 campos específicos del área, tal como los acepta la API. */
interface AreaDetailsDraft {
  frenteObra: string;
  capituloPresupuestal: string;
  unidadMedida: string;
  cantidadProgramada: string;
  contratistaId: string;
  requierePermisoSst: boolean;
  permisosSst: string[];
  codigoRequisicion: string;
  fechaRequeridaEnObra: string;
  categoriaInsumo: string;
  presupuestoEstimado: string;
  proveedorSugerido: string;
  disciplina: string;
  codigoPlano: string;
  versionPlano: string;
  entidad: string;
  numeroRadicado: string;
  tipoDocumento: string;
  numeroDocumento: string;
  monto: string;
}

/** Campos del alta además de proyecto, título y descripción. */
interface TaskFormExtras {
  stageId: string;
  statusId: string;
  areaId: string;
  assigneeUserId: string;
  validatorUserId: string;
  fechaFinPrevista: string;
  details: AreaDetailsDraft;
}

const NO_STAGE_KEY = '__sin_etapa__';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CAPITULOS: CapituloPresupuestal[] = [
  'CIMENTACION', 'ESTRUCTURA', 'MAMPOSTERIA', 'ACABADOS', 'INSTALACIONES', 'OTRO'
];
const UNIDADES: UnidadMedida[] = ['M2', 'M3', 'ML', 'KG', 'UNIDAD', 'GLOBAL'];
const PERMISOS_SST: PermisoSst[] = [
  'TRABAJO_EN_ALTURAS', 'ESPACIO_CONFINADO', 'TRABAJO_EN_CALIENTE', 'OTRO'
];
const CATEGORIAS_INSUMO: CategoriaInsumo[] = [
  'MATERIALES', 'ALQUILER_MAQUINARIA', 'HERRAMIENTAS', 'DOTACION_EPP'
];
const DISCIPLINAS: Disciplina[] = [
  'ARQUITECTONICO', 'ESTRUCTURAL', 'HIDROSANITARIO', 'ELECTRICO', 'REDES_GAS'
];
const TIPOS_DOCUMENTO: TipoDocumentoContable[] = [
  'FACTURA', 'ACTA_CORTE_OBRA', 'ANTICIPO', 'CUENTA_COBRO'
];
const STAGE_COLORS: StageColorOption[] = [
  { value: 'SAGE', label: 'Salvia', token: '--sage-chart-sage' },
  { value: 'LAVENDER', label: 'Lavanda', token: '--sage-chart-lavender' },
  { value: 'SAND', label: 'Arena', token: '--sage-chart-sand' },
  { value: 'TOSCA', label: 'Tosca', token: '--sage-chart-tosca' },
  { value: 'ACCENT', label: 'Verde bosque', token: '--sage-accent' }
];

function emptyDetails(): AreaDetailsDraft {
  return {
    frenteObra: '',
    capituloPresupuestal: '',
    unidadMedida: '',
    cantidadProgramada: '',
    contratistaId: '',
    requierePermisoSst: false,
    permisosSst: [],
    codigoRequisicion: '',
    fechaRequeridaEnObra: '',
    categoriaInsumo: '',
    presupuestoEstimado: '',
    proveedorSugerido: '',
    disciplina: '',
    codigoPlano: '',
    versionPlano: '',
    entidad: '',
    numeroRadicado: '',
    tipoDocumento: '',
    numeroDocumento: '',
    monto: ''
  };
}

/** Convierte los detalles devueltos por la API al borrador editable del formulario. */
function detailsFromTask(details: AreaDetails | null): AreaDetailsDraft {
  const draft = emptyDetails();
  if (!details) return draft;

  const numeric = (value: number | null): string => value == null ? '' : String(value);
  draft.frenteObra = details.frenteObra ?? '';
  draft.capituloPresupuestal = details.capituloPresupuestal ?? '';
  draft.unidadMedida = details.unidadMedida ?? '';
  draft.cantidadProgramada = numeric(details.cantidadProgramada);
  draft.contratistaId = details.contratistaId ?? '';
  draft.requierePermisoSst = details.requierePermisoSst;
  draft.permisosSst = [...(details.permisosSst ?? [])];
  draft.codigoRequisicion = details.codigoRequisicion ?? '';
  draft.fechaRequeridaEnObra = details.fechaRequeridaEnObra ?? '';
  draft.categoriaInsumo = details.categoriaInsumo ?? '';
  draft.presupuestoEstimado = numeric(details.presupuestoEstimado);
  draft.proveedorSugerido = details.proveedorSugerido ?? '';
  draft.disciplina = details.disciplina ?? '';
  draft.codigoPlano = details.codigoPlano ?? '';
  draft.versionPlano = details.versionPlano ?? '';
  draft.entidad = details.entidad ?? '';
  draft.numeroRadicado = details.numeroRadicado ?? '';
  draft.tipoDocumento = details.tipoDocumento ?? '';
  draft.numeroDocumento = details.numeroDocumento ?? '';
  draft.monto = numeric(details.monto);
  return draft;
}

function emptyExtras(): TaskFormExtras {
  return {
    stageId: '',
    statusId: '',
    areaId: '',
    assigneeUserId: '',
    validatorUserId: '',
    fechaFinPrevista: '',
    details: emptyDetails()
  };
}

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
}

function inputChecked(event: Event): boolean {
  return (event.target as HTMLInputElement).checked;
}

/**
 * Tablero global de tareas. Las columnas son etapas (las de todos los proyectos
 * con el mismo nombre se presentan juntas) y cada tarjeta indica su proyecto.
 * Permite crear y editar tareas, y moverlas entre etapas del mismo proyecto.
 */
@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [
    CommonModule,
    LucideChevronDown,
    LucideGripVertical,
    LucidePalette,
    LucidePlus,
    LucideSearch,
    LucideSquarePen,
    LucideX
  ],
  template: `
    <div class="page-shell board-page">
      <header class="topbar">
        <div class="topbar-copy">
          <p class="brand">Proyectos · Seguimiento</p>
          <h1 class="page-title">Tablero de tareas</h1>
          <p class="page-subtitle">Cada tarea, su etapa y el proyecto al que pertenece.</p>
        </div>
        <div class="topbar-actions">
          <button type="button" class="sage-button sage-button--primary" (click)="openAdd(emptyColumn)">
            <svg lucidePlus [size]="18" [strokeWidth]="1.8" aria-hidden="true"></svg>
            Nueva tarea
          </button>
        </div>
      </header>

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }
      @if (actionError() && !addingIn()) {
        <div class="alert alert-error" role="alert">{{ actionError() }}</div>
      }
      @if (board().truncated) {
        <div class="alert board-truncated" role="status">
          Mostrando las tareas más recientes. Filtra por proyecto para ver el resto.
        </div>
      }
      @if (loading()) {
        <p class="muted" role="status">Cargando tablero…</p>
      }

      <section class="board-toolbar" aria-label="Filtros del tablero">
        <label class="board-field">
          <span class="field-label">Proyecto</span>
          <span class="select-wrap">
            <svg lucideChevronDown class="select-chevron" [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
            <select class="sage-select" [value]="selectedProjectId()" (change)="onProjectChange($event)">
              <option value="">Todos los proyectos</option>
              @for (project of projectsList(); track project.id) {
                <option [value]="project.id">{{ project.name }}</option>
              }
            </select>
          </span>
        </label>
        <label class="board-field board-search">
          <span class="field-label">Buscar tarea</span>
          <span class="search-field">
            <svg lucideSearch [size]="20" [strokeWidth]="1.8" aria-hidden="true"></svg>
            <input
              type="search"
              class="sage-input"
              placeholder="Buscar por título o descripción"
              [value]="search()"
              (input)="onSearch($event)"
            >
          </span>
        </label>
      </section>

      @if (!loading() && columns().length === 0) {
        <div class="empty-state" role="status">
          <h2 class="board-empty-title">Todavía no hay tareas para mostrar</h2>
          <p class="muted">Cuando los proyectos tengan etapas y tareas, aparecerán aquí.</p>
          <button type="button" class="sage-button sage-button--primary" (click)="openAdd(emptyColumn)">
            <svg lucidePlus [size]="18" [strokeWidth]="1.8" aria-hidden="true"></svg>
            Agregar tarea
          </button>
        </div>
      } @else {
        <div class="board-scroll">
          <div class="board-grid" role="list" aria-label="Columnas del tablero">
            @for (column of columns(); track column.key) {
              <section
                class="board-column"
                [class.board-column--over]="dropTarget() === column.key"
                [style.--stage-color]="'var(' + stageColorToken(column.color) + ')'"
                role="listitem"
                [attr.aria-label]="column.name"
                (dragover)="onDragOver($event, column)"
                (dragleave)="onDragLeave($event, column)"
                (drop)="onDrop($event, column)"
              >
                <header class="board-column-header">
                  <span class="stage-color-dot" aria-hidden="true"></span>
                  <h2>{{ column.name }}</h2>
                  <span class="board-count" [attr.aria-label]="column.tasks.length + ' tareas'">
                    {{ column.tasks.length }}
                  </span>
                  <button
                    type="button"
                    class="stage-color-trigger"
                    [attr.aria-label]="'Configurar color de ' + column.name"
                    [attr.aria-expanded]="colorPickerFor() === column.key"
                    [disabled]="column.stages.length === 0 || colorSaving() === column.key"
                    (click)="toggleColorPicker(column)"
                  >
                    <svg lucidePalette [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
                  </button>
                  @if (colorPickerFor() === column.key) {
                    <div class="stage-color-menu" role="group" [attr.aria-label]="'Color de ' + column.name">
                      @for (option of stageColors; track option.value) {
                        <button
                          type="button"
                          class="stage-color-option"
                          [class.stage-color-option--active]="column.color === option.value"
                          [style.--swatch]="'var(' + option.token + ')'"
                          [attr.aria-label]="'Usar color ' + option.label"
                          [disabled]="colorSaving() === column.key"
                          (click)="setStageColor(column, option.value)"
                        >
                          <span class="stage-color-swatch" aria-hidden="true"></span>
                          <span>{{ option.label }}</span>
                        </button>
                      }
                    </div>
                  }
                </header>
                @if (column.stages.length > 1) {
                  <p class="board-column-meta">{{ column.stages.length }} etapas de proyectos</p>
                }
                <div class="board-cards">
                  @for (task of column.tasks; track task.id) {
                    <article
                      class="task-card"
                      [class.task-card--dragging]="draggedTaskId() === task.id"
                      draggable="true"
                      (dragstart)="onDragStart($event, task.id)"
                      (dragend)="onDragEnd()"
                    >
                      <div class="task-card-head">
                        <h3 class="task-title">{{ task.title }}</h3>
                        <div class="task-card-actions">
                          <button
                            type="button"
                            class="task-edit-button"
                            [attr.aria-label]="'Editar ' + task.title"
                            [attr.title]="'Editar ' + task.title"
                            (click)="openEdit(task)"
                          >
                            <svg lucideSquarePen [size]="18" [strokeWidth]="1.8" aria-hidden="true"></svg>
                          </button>
                          <svg lucideGripVertical class="drag-handle" [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
                        </div>
                      </div>
                      <p class="project-chip">{{ projectName(task.projectId) }}</p>
                      @if (task.description) {
                        <p class="task-description">{{ task.description }}</p>
                      }
                      <div class="task-meta">
                        <span class="area-pill">
                          <span class="area-dot" aria-hidden="true"></span>Área: {{ task.area?.name ?? 'Sin área' }}
                        </span>
                        @if (task.fechaFinPrevista) {
                          <time class="task-due" [attr.datetime]="task.fechaFinPrevista">
                            Entrega {{ task.fechaFinPrevista }}
                          </time>
                        }
                      </div>
                      <label class="task-stage-field">
                        <span class="field-label">Mover a</span>
                        <span class="select-wrap">
                          <svg lucideChevronDown class="select-chevron" [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
                          <select
                            class="sage-select task-stage-select"
                            [value]="stageColumnKeyFor(task)"
                            [disabled]="movingTaskId() === task.id"
                            [attr.aria-label]="'Mover ' + task.title + ' a otra etapa'"
                            (change)="onTaskStageChange($event, task)"
                          >
                            @for (option of stageOptionsFor(task); track option.key) {
                              <option [value]="option.key">{{ option.label }}</option>
                            }
                          </select>
                        </span>
                      </label>
                    </article>
                  } @empty {
                    <p class="board-empty-column">Sin tareas en esta etapa.</p>
                  }
                </div>

                @if (addProjects(column).length > 0) {
                  <button type="button" class="board-add-button" (click)="openAdd(column)">
                    <svg lucidePlus [size]="18" [strokeWidth]="1.8" aria-hidden="true"></svg>
                    Agregar tarea
                  </button>
                } @else {
                  <p class="board-column-closed">Etapa cerrada: no permite nuevas tareas.</p>
                }
              </section>
            }
          </div>
        </div>
      }

      @if (addingIn()) {
        <div class="task-dialog-backdrop" (click)="closeAdd()">
          <section
            class="task-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-dialog-title"
            tabindex="-1"
            (click)="$event.stopPropagation()"
            (keydown.escape)="closeAdd()"
          >
            <header class="task-dialog-header">
              <div>
                <p class="brand">{{ editingTaskId() ? 'Editar tarea' : 'Nueva tarea' }}</p>
                <h2 id="task-dialog-title">
                  {{ editingTaskId() ? 'Modifica la tarea' : 'Completa la información de entrada' }}
                </h2>
                <p class="task-dialog-subtitle">
                  @if (editingTaskId()) {
                    Actualiza los campos conservando el proyecto y la etapa actuales.
                  } @else {
                    Los campos del área aparecen según el tipo seleccionado.
                  }
                </p>
              </div>
              <button type="button" class="dialog-close" aria-label="Cerrar formulario" (click)="closeAdd()">
                <svg lucideX [size]="20" [strokeWidth]="1.8" aria-hidden="true"></svg>
              </button>
            </header>

            <form class="task-add-form" (submit)="submitAdd(emptyColumn, $event)">
              @if (actionError()) {
                <div class="alert alert-error" role="alert">{{ actionError() }}</div>
              }
              <div class="form-section">
                <h3>Datos de la tarea</h3>
                <div class="form-grid">
                  <label class="board-field">
                    <span class="field-label">Proyecto</span>
                    <span class="select-wrap">
                      <svg lucideChevronDown class="select-chevron" [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
                      <select
                        class="sage-select"
                        [value]="newProjectId()"
                        [disabled]="saving() || !!editingTaskId()"
                        (change)="onNewProjectChange($event)"
                      >
                        @for (project of projectsList(); track project.id) {
                          <option [value]="project.id">{{ project.name }}</option>
                        }
                      </select>
                    </span>
                  </label>
                  <label class="board-field">
                    <span class="field-label">Etapa</span>
                    <span class="select-wrap">
                      <svg lucideChevronDown class="select-chevron" [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
                      <select
                        class="sage-select"
                        [value]="extras().stageId"
                        [disabled]="saving()"
                        (change)="patchExtras('stageId', inputValue($event))"
                      >
                        @for (option of stageOptions(); track option.key) {
                          <option [value]="option.key">{{ option.label }}</option>
                        }
                      </select>
                    </span>
                  </label>
                  <label class="board-field field--wide">
                    <span class="field-label">Título *</span>
                    <input
                      type="text"
                      class="sage-input"
                      maxlength="150"
                      placeholder="¿Qué hay que hacer?"
                      autofocus
                      [value]="newTitle()"
                      [disabled]="saving()"
                      (input)="onNewTitle($event)"
                    >
                  </label>
                  <label class="board-field field--wide">
                    <span class="field-label">Descripción (opcional)</span>
                    <textarea
                      class="sage-input"
                      rows="2"
                      maxlength="2000"
                      [value]="newDescription()"
                      [disabled]="saving()"
                      (input)="onNewDescription($event)"
                    ></textarea>
                  </label>
                </div>
              </div>

              <div class="form-section">
                <h3>Planificación y responsables</h3>
                <div class="form-grid">
                  <label class="board-field">
                    <span class="field-label">Estado</span>
                    <span class="select-wrap">
                      <svg lucideChevronDown class="select-chevron" [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
                      <select
                        class="sage-select"
                        [value]="extras().statusId"
                        [disabled]="saving()"
                        (change)="patchExtras('statusId', inputValue($event))"
                      >
                        <option value="">Estado por defecto del proyecto</option>
                        @for (status of statuses(); track status.id) {
                          <option [value]="status.id">{{ status.name }}</option>
                        }
                      </select>
                    </span>
                  </label>
                  <label class="board-field">
                    <span class="field-label">Área</span>
                    <span class="select-wrap">
                      <svg lucideChevronDown class="select-chevron" [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
                      <select
                        class="sage-select"
                        [value]="extras().areaId"
                        [disabled]="saving()"
                        (change)="onNewAreaChange($event)"
                      >
                        <option value="">Sin área</option>
                        @for (area of areas(); track area.id) {
                          <option [value]="area.id">{{ area.name }}</option>
                        }
                      </select>
                    </span>
                  </label>
                  <label class="board-field">
                    <span class="field-label">Responsable</span>
                    <span class="select-wrap">
                      <svg lucideChevronDown class="select-chevron" [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
                      <select
                        class="sage-select"
                        [value]="extras().assigneeUserId"
                        [disabled]="saving()"
                        (change)="patchExtras('assigneeUserId', inputValue($event))"
                      >
                        <option value="">Sin asignar</option>
                        @for (person of assignments(); track person.userId) {
                          <option [value]="person.userId">{{ person.userFullName || person.userEmail || person.userId }}</option>
                        }
                      </select>
                    </span>
                  </label>
                  <label class="board-field">
                    <span class="field-label">Validador</span>
                    <span class="select-wrap">
                      <svg lucideChevronDown class="select-chevron" [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
                      <select
                        class="sage-select"
                        [value]="extras().validatorUserId"
                        [disabled]="saving()"
                        (change)="patchExtras('validatorUserId', inputValue($event))"
                      >
                        <option value="">Sin asignar</option>
                        @for (person of assignments(); track person.userId) {
                          <option [value]="person.userId">{{ person.userFullName || person.userEmail || person.userId }}</option>
                        }
                      </select>
                    </span>
                  </label>
                  <label class="board-field">
                    <span class="field-label">Fecha fin prevista</span>
                    <input
                      type="date"
                      class="sage-input"
                      [value]="extras().fechaFinPrevista"
                      [disabled]="saving()"
                      (input)="patchExtras('fechaFinPrevista', inputValue($event))"
                    >
                  </label>
                </div>
              </div>

              @if (selectedAreaTipo()) {
                <div class="form-section">
                  <h3>Detalles del área · {{ selectedAreaTipoLabel() }}</h3>
                  <div class="form-grid">
                    @if (selectedAreaTipo() === 'OBRA_INGENIERIA') {
                      <label class="board-field">
                        <span class="field-label">Frente de obra</span>
                        <input type="text" class="sage-input" maxlength="300" [value]="extras().details.frenteObra"
                          (input)="patchDetail('frenteObra', inputValue($event))">
                      </label>
                      <label class="board-field">
                        <span class="field-label">Capítulo presupuestal</span>
                        <span class="select-wrap">
                          <svg lucideChevronDown class="select-chevron" [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
                          <select class="sage-select" [value]="extras().details.capituloPresupuestal"
                            (change)="patchDetail('capituloPresupuestal', inputValue($event))">
                            <option value="">Sin seleccionar</option>
                            @for (item of capitulos; track item) {
                              <option [value]="item">{{ formatEnum(item) }}</option>
                            }
                          </select>
                        </span>
                      </label>
                      <label class="board-field">
                        <span class="field-label">Unidad de medida</span>
                        <span class="select-wrap">
                          <svg lucideChevronDown class="select-chevron" [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
                          <select class="sage-select" [value]="extras().details.unidadMedida"
                            (change)="patchDetail('unidadMedida', inputValue($event))">
                            <option value="">Sin seleccionar</option>
                            @for (item of unidades; track item) {
                              <option [value]="item">{{ formatEnum(item) }}</option>
                            }
                          </select>
                        </span>
                      </label>
                      <label class="board-field">
                        <span class="field-label">Cantidad programada</span>
                        <input type="number" min="0" step="0.001" class="sage-input" [value]="extras().details.cantidadProgramada"
                          (input)="patchDetail('cantidadProgramada', inputValue($event))">
                      </label>
                      <label class="board-field">
                        <span class="field-label">Contratista (UUID)</span>
                        <input type="text" class="sage-input" [value]="extras().details.contratistaId"
                          (input)="patchDetail('contratistaId', inputValue($event))">
                      </label>
                      <div class="board-field field--wide">
                        <label class="check-option">
                          <input type="checkbox" [checked]="extras().details.requierePermisoSst"
                            (change)="patchDetail('requierePermisoSst', inputChecked($event))">
                          Requiere permiso SST
                        </label>
                        @if (extras().details.requierePermisoSst) {
                          <div class="check-group">
                            @for (permiso of permisosSst; track permiso) {
                              <label class="check-option">
                                <input type="checkbox" [checked]="extras().details.permisosSst.includes(permiso)"
                                  (change)="togglePermiso(permiso, inputChecked($event))">
                                {{ formatEnum(permiso) }}
                              </label>
                            }
                          </div>
                        }
                      </div>
                    }
                    @if (selectedAreaTipo() === 'COMPRAS_ALMACEN') {
                      <label class="board-field">
                        <span class="field-label">Código de requisición</span>
                        <input type="text" class="sage-input" maxlength="80" [value]="extras().details.codigoRequisicion"
                          (input)="patchDetail('codigoRequisicion', inputValue($event))">
                      </label>
                      <label class="board-field">
                        <span class="field-label">Fecha requerida en obra</span>
                        <input type="date" class="sage-input" [value]="extras().details.fechaRequeridaEnObra"
                          (input)="patchDetail('fechaRequeridaEnObra', inputValue($event))">
                      </label>
                      <label class="board-field">
                        <span class="field-label">Categoría de insumo</span>
                        <span class="select-wrap">
                          <svg lucideChevronDown class="select-chevron" [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
                          <select class="sage-select" [value]="extras().details.categoriaInsumo"
                            (change)="patchDetail('categoriaInsumo', inputValue($event))">
                            <option value="">Sin seleccionar</option>
                            @for (item of categoriasInsumo; track item) {
                              <option [value]="item">{{ formatEnum(item) }}</option>
                            }
                          </select>
                        </span>
                      </label>
                      <label class="board-field">
                        <span class="field-label">Presupuesto estimado</span>
                        <input type="number" min="0" step="0.01" class="sage-input" [value]="extras().details.presupuestoEstimado"
                          (input)="patchDetail('presupuestoEstimado', inputValue($event))">
                      </label>
                      <label class="board-field field--wide">
                        <span class="field-label">Proveedor sugerido</span>
                        <input type="text" class="sage-input" maxlength="150" [value]="extras().details.proveedorSugerido"
                          (input)="patchDetail('proveedorSugerido', inputValue($event))">
                      </label>
                    }
                    @if (selectedAreaTipo() === 'DISENO_ARQUITECTURA') {
                      <label class="board-field">
                        <span class="field-label">Disciplina</span>
                        <span class="select-wrap">
                          <svg lucideChevronDown class="select-chevron" [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
                          <select class="sage-select" [value]="extras().details.disciplina"
                            (change)="patchDetail('disciplina', inputValue($event))">
                            <option value="">Sin seleccionar</option>
                            @for (item of disciplinas; track item) {
                              <option [value]="item">{{ formatEnum(item) }}</option>
                            }
                          </select>
                        </span>
                      </label>
                      <label class="board-field">
                        <span class="field-label">Código de plano</span>
                        <input type="text" class="sage-input" maxlength="80" [value]="extras().details.codigoPlano"
                          (input)="patchDetail('codigoPlano', inputValue($event))">
                      </label>
                      <label class="board-field">
                        <span class="field-label">Versión del plano</span>
                        <input type="text" class="sage-input" maxlength="20" [value]="extras().details.versionPlano"
                          (input)="patchDetail('versionPlano', inputValue($event))">
                      </label>
                    }
                    @if (selectedAreaTipo() === 'LEGAL_TRAMITES') {
                      <label class="board-field">
                        <span class="field-label">Entidad</span>
                        <input type="text" class="sage-input" maxlength="150" [value]="extras().details.entidad"
                          (input)="patchDetail('entidad', inputValue($event))">
                      </label>
                      <label class="board-field">
                        <span class="field-label">Número de radicado</span>
                        <input type="text" class="sage-input" maxlength="80" [value]="extras().details.numeroRadicado"
                          (input)="patchDetail('numeroRadicado', inputValue($event))">
                      </label>
                    }
                    @if (selectedAreaTipo() === 'CONTABILIDAD_FINANZAS') {
                      <label class="board-field">
                        <span class="field-label">Tipo de documento</span>
                        <span class="select-wrap">
                          <svg lucideChevronDown class="select-chevron" [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
                          <select class="sage-select" [value]="extras().details.tipoDocumento"
                            (change)="patchDetail('tipoDocumento', inputValue($event))">
                            <option value="">Sin seleccionar</option>
                            @for (item of tiposDocumento; track item) {
                              <option [value]="item">{{ formatEnum(item) }}</option>
                            }
                          </select>
                        </span>
                      </label>
                      <label class="board-field">
                        <span class="field-label">Número de documento</span>
                        <input type="text" class="sage-input" maxlength="80" [value]="extras().details.numeroDocumento"
                          (input)="patchDetail('numeroDocumento', inputValue($event))">
                      </label>
                      <label class="board-field">
                        <span class="field-label">Monto</span>
                        <input type="number" min="0" step="0.01" class="sage-input" [value]="extras().details.monto"
                          (input)="patchDetail('monto', inputValue($event))">
                      </label>
                    }
                  </div>
                </div>
              }

              <div class="task-add-actions">
                <button type="submit" class="sage-button sage-button--primary" [disabled]="saving() || !newTitle().trim()">
                  {{ saving() ? 'Guardando…' : (editingTaskId() ? 'Guardar cambios' : 'Guardar tarea') }}
                </button>
                <button type="button" class="sage-button sage-button--ghost" [disabled]="saving()" (click)="closeAdd()">
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        </div>
      }
    </div>
  `
})
export class TaskBoardComponent implements OnInit, OnDestroy {
  private readonly tasks = inject(TaskService);
  private readonly projects = inject(ProjectService);
  private readonly realtime = inject(RealtimeService);
  private stopWatchingChanges: (() => void) | null = null;

  readonly noStageKey = NO_STAGE_KEY;
  readonly emptyColumn: BoardColumn = {
    key: NO_STAGE_KEY,
    name: 'Sin etapa',
    order: Number.MAX_SAFE_INTEGER,
    color: 'SAGE',
    stages: [],
    tasks: []
  };

  readonly stageColors = STAGE_COLORS;
  readonly capitulos = CAPITULOS;
  readonly unidades = UNIDADES;
  readonly permisosSst = PERMISOS_SST;
  readonly categoriasInsumo = CATEGORIAS_INSUMO;
  readonly disciplinas = DISCIPLINAS;
  readonly tiposDocumento = TIPOS_DOCUMENTO;

  readonly projectsList = signal<Project[]>([]);
  readonly board = signal<TaskBoard>({ stages: [], tasks: [], truncated: false });
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionError = signal<string | null>(null);
  readonly selectedProjectId = signal('');
  readonly search = signal('');

  readonly statuses = signal<TaskStatusInfo[]>([]);
  readonly areas = signal<TaskArea[]>([]);
  readonly assignments = signal<ProjectAssignment[]>([]);

  readonly addingIn = signal<string | null>(null);
  readonly editingTaskId = signal<string | null>(null);
  readonly newTitle = signal('');
  readonly newDescription = signal('');
  readonly newProjectId = signal('');
  readonly extras = signal<TaskFormExtras>(emptyExtras());
  readonly saving = signal(false);
  readonly movingTaskId = signal<string | null>(null);
  readonly draggedTaskId = signal<string | null>(null);
  readonly dropTarget = signal<string | null>(null);
  readonly colorPickerFor = signal<string | null>(null);
  readonly colorSaving = signal<string | null>(null);

  readonly selectedAreaTipo = computed<AreaTipo | null>(
    () => this.areas().find(area => area.id === this.extras().areaId)?.tipo ?? null
  );

  readonly selectedAreaTipoLabel = computed(() => {
    const tipo = this.selectedAreaTipo();
    return tipo ? this.formatEnum(tipo) : '';
  });

  readonly stageOptions = computed<StageOption[]>(() => {
    const projectId = this.newProjectId();
    const currentStageId = this.editingTaskId() ? this.extras().stageId : '';
    const options: StageOption[] = [{ key: '', label: 'Sin etapa' }];
    for (const stage of this.board().stages) {
      if (stage.projectId !== projectId) continue;
      if (!stage.closed || stage.id === currentStageId) {
        options.push({ key: stage.id, label: stage.name });
      }
    }
    return options;
  });

  /** Agrupa por nombre de etapa; los IDs de etapa son propios de cada proyecto. */
  readonly columns = computed<BoardColumn[]>(() => {
    const current = this.board();
    if (current.stages.length === 0 && current.tasks.length === 0) {
      return [];
    }

    const byName = new Map<string, BoardStage[]>();
    for (const stage of current.stages) {
      const key = this.stageKey(stage.name);
      const group = byName.get(key) ?? [];
      group.push(stage);
      byName.set(key, group);
    }

    const stageKeyById = new Map<string, string>();
    const columns: BoardColumn[] = [];
    for (const [key, group] of byName) {
      for (const stage of group) {
        stageKeyById.set(stage.id, key);
      }
      columns.push({
        key,
        name: group[0].name,
        order: Math.min(...group.map(stage => stage.order)),
        color: group[0].color,
        stages: group,
        tasks: []
      });
    }
    columns.push({ ...this.emptyColumn });

    const noStage = columns[columns.length - 1];
    const term = this.search().trim().toLowerCase();
    for (const task of current.tasks) {
      if (term && !task.title.toLowerCase().includes(term)
          && !(task.description ?? '').toLowerCase().includes(term)) {
        continue;
      }
      const key = task.stageId ? stageKeyById.get(task.stageId) : undefined;
      const column = columns.find(candidate => candidate.key === (key ?? noStage.key));
      if (!column) continue;
      column.tasks.push(task);
    }

    return columns.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'es'));
  });

  ngOnInit(): void {
    this.projects.list().subscribe({
      next: list => this.projectsList.set(list),
      error: err => this.error.set(projectErrorMessage(err))
    });
    this.load();
    this.watchRealtime();
  }

  ngOnDestroy(): void {
    this.stopWatchingChanges?.();
    this.stopWatchingChanges = null;
  }

  onProjectChange(event: Event): void {
    this.selectedProjectId.set(inputValue(event));
    this.closeAdd();
    this.watchRealtime();
    this.load();
  }

  /** El tablero se actualiza solo: el backend avisa y aquí se vuelve a consultar. */
  private watchRealtime(): void {
    this.stopWatchingChanges?.();
    this.stopWatchingChanges = watchProjectChanges(this.realtime, {
      projectId: this.selectedProjectId() || undefined,
      sections: ['STAGE'],
      onReload: () => this.load()
    });
  }

  onSearch(event: Event): void {
    this.search.set(inputValue(event));
  }

  projectName(projectId: string): string {
    return this.projectsList().find(project => project.id === projectId)?.name ?? 'Proyecto';
  }

  stageColorToken(color: StageColor): string {
    return STAGE_COLORS.find(option => option.value === color)?.token ?? '--sage-chart-sage';
  }

  toggleColorPicker(column: BoardColumn): void {
    this.colorPickerFor.set(this.colorPickerFor() === column.key ? null : column.key);
  }

  /** La columna agrupa etapas del mismo nombre: el color se aplica a todas ellas. */
  setStageColor(column: BoardColumn, color: StageColor): void {
    if (column.stages.length === 0 || this.colorSaving()) return;
    this.actionError.set(null);
    this.colorSaving.set(column.key);
    const request: UpdateStageColorsRequest = {
      stages: column.stages.map(stage => ({
        projectId: stage.projectId,
        stageId: stage.id,
        color
      }))
    };
    this.projects.updateStageColors(request).subscribe({
      next: () => {
        this.colorSaving.set(null);
        this.colorPickerFor.set(null);
        this.load();
      },
      error: err => {
        this.colorSaving.set(null);
        this.actionError.set(projectErrorMessage(err));
        // La BD no cambió: se descarta cualquier estado optimista y se recarga.
        this.load();
      }
    });
  }

  /** El color del backend se traduce a la paleta Sage; el texto nombra siempre el estado. */
  statusTone(task: Task): string {
    const name = task.status.name.toLowerCase();
    if (/hecho|terminad|complet|finaliz/.test(name)) return 'positive';
    if (/curso|proceso|revisi/.test(name)) return 'progress';
    if (/pendiente|por hacer|bloquead/.test(name)) return 'negative';
    return 'neutral';
  }

  /** Proyectos con una etapa abierta en esta columna; en «Sin etapa», todos los visibles. */
  addProjects(column: BoardColumn): ProjectOption[] {
    if (column.key === NO_STAGE_KEY) {
      return this.projectsList().map(project => ({ id: project.id, name: project.name }));
    }
    const seen = new Set<string>();
    return column.stages
      .filter(stage => {
        if (stage.closed || seen.has(stage.projectId)) return false;
        seen.add(stage.projectId);
        return true;
      })
      .map(stage => ({ id: stage.projectId, name: this.projectName(stage.projectId) }));
  }

  openAdd(column: BoardColumn): void {
    this.actionError.set(null);
    this.editingTaskId.set(null);
    this.addingIn.set(column.key);
    this.newTitle.set('');
    this.newDescription.set('');
    const options = this.addProjects(column);
    const preferred = this.selectedProjectId() && options.some(p => p.id === this.selectedProjectId())
      ? this.selectedProjectId()
      : options[0]?.id ?? '';
    this.newProjectId.set(preferred);
    const stageId = column.key === NO_STAGE_KEY
      ? ''
      : column.stages.find(stage => stage.projectId === preferred && !stage.closed)?.id ?? '';
    this.extras.set({ ...emptyExtras(), stageId });
    this.loadCatalogs(preferred);
  }

  openEdit(task: Task): void {
    this.actionError.set(null);
    this.editingTaskId.set(task.id);
    this.addingIn.set(this.stageColumnKeyFor(task));
    this.newTitle.set(task.title);
    this.newDescription.set(task.description ?? '');
    this.newProjectId.set(task.projectId);
    this.extras.set({
      stageId: task.stageId ?? '',
      statusId: task.status.id,
      areaId: task.area?.id ?? '',
      assigneeUserId: task.assignee?.userId ?? '',
      validatorUserId: task.validator?.userId ?? '',
      fechaFinPrevista: task.fechaFinPrevista ?? '',
      details: detailsFromTask(task.areaDetails)
    });
    this.loadCatalogs(task.projectId);
  }

  closeAdd(): void {
    this.addingIn.set(null);
    this.editingTaskId.set(null);
  }

  onNewTitle(event: Event): void {
    this.newTitle.set(inputValue(event));
  }

  onNewDescription(event: Event): void {
    this.newDescription.set(inputValue(event));
  }

  onNewProjectChange(event: Event): void {
    const projectId = inputValue(event);
    this.newProjectId.set(projectId);
    this.extras.update(current => ({
      ...current,
      stageId: '',
      statusId: '',
      areaId: '',
      assigneeUserId: '',
      validatorUserId: '',
      details: emptyDetails()
    }));
    this.loadCatalogs(projectId);
  }

  onNewAreaChange(event: Event): void {
    const areaId = inputValue(event);
    this.extras.update(current => ({ ...current, areaId, details: emptyDetails() }));
  }

  patchExtras<K extends keyof TaskFormExtras>(key: K, value: TaskFormExtras[K]): void {
    this.extras.update(current => ({ ...current, [key]: value }));
  }

  patchDetail<K extends keyof AreaDetailsDraft>(key: K, value: AreaDetailsDraft[K]): void {
    this.extras.update(current => ({
      ...current,
      details: { ...current.details, [key]: value }
    }));
  }

  togglePermiso(permiso: PermisoSst, checked: boolean): void {
    this.extras.update(current => {
      const selected = current.details.permisosSst;
      const permisosSst = checked
        ? [...selected.filter(item => item !== permiso), permiso]
        : selected.filter(item => item !== permiso);
      return { ...current, details: { ...current.details, permisosSst } };
    });
  }

  inputValue(event: Event): string {
    return inputValue(event);
  }

  inputChecked(event: Event): boolean {
    return inputChecked(event);
  }

  formatEnum(value: string): string {
    return value.toLowerCase().replaceAll('_', ' ').replace(/(^|\s)\S/g, part => part.toUpperCase());
  }

  submitAdd(column: BoardColumn, event: Event): void {
    event.preventDefault();
    if (this.saving()) return;

    const title = this.newTitle().trim();
    const projectId = this.newProjectId();
    if (!title) {
      this.actionError.set('Escribe un título para la tarea.');
      return;
    }
    if (!projectId) {
      this.actionError.set('Selecciona un proyecto para la tarea.');
      return;
    }

    const extras = this.extras();
    const contratista = extras.details.contratistaId.trim();
    if (contratista && !UUID_PATTERN.test(contratista)) {
      this.actionError.set('El identificador del contratista debe ser un UUID válido.');
      return;
    }
    const allowedStageIds = this.stageOptions().map(option => option.key);
    const editingId = this.editingTaskId();
    let stageId: string | null = null;
    if (extras.stageId && allowedStageIds.includes(extras.stageId)) {
      stageId = extras.stageId;
    } else if (editingId) {
      stageId = this.board().tasks.find(task => task.id === editingId)?.stageId ?? null;
    }

    const areaId = extras.areaId || null;
    const request: CreateTaskRequest = {
      title,
      description: this.newDescription().trim() || null,
      statusId: extras.statusId || null,
      areaId,
      assigneeUserId: extras.assigneeUserId || null,
      validatorUserId: extras.validatorUserId || null,
      fechaFinPrevista: extras.fechaFinPrevista || null,
      areaDetails: areaId ? this.buildAreaDetails(extras.details, this.selectedAreaTipo()) : null,
      stageId
    };

    this.saving.set(true);
    this.actionError.set(null);
    const operation = editingId
      ? this.tasks.update(editingId, request)
      : this.tasks.create(projectId, request);
    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeAdd();
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.actionError.set(taskErrorMessage(err));
      }
    });
  }

  onDragStart(event: DragEvent, taskId: string): void {
    this.draggedTaskId.set(taskId);
    event.dataTransfer?.setData('text/plain', taskId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragEnd(): void {
    this.draggedTaskId.set(null);
    this.dropTarget.set(null);
  }

  onDragOver(event: DragEvent, column: BoardColumn): void {
    const taskId = this.draggedTaskId();
    if (!taskId || !this.canDropInto(taskId, column)) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dropTarget.set(column.key);
  }

  onDragLeave(event: DragEvent, column: BoardColumn): void {
    const current = event.currentTarget as HTMLElement | null;
    const next = event.relatedTarget as Node | null;
    if (this.dropTarget() === column.key && (!current || !next || !current.contains(next))) {
      this.dropTarget.set(null);
    }
  }

  onDrop(event: DragEvent, column: BoardColumn): void {
    event.preventDefault();
    const taskId = event.dataTransfer?.getData('text/plain') || this.draggedTaskId();
    this.draggedTaskId.set(null);
    this.dropTarget.set(null);
    if (!taskId || !this.canDropInto(taskId, column)) return;
    this.move(taskId, this.stageIdFor(taskId, column));
  }

  stageOptionsFor(task: Task): StageOption[] {
    const currentKey = this.stageColumnKeyFor(task);
    return this.columns()
      .filter(column => column.key === currentKey || this.canDropInto(task.id, column))
      .map(column => ({ key: column.key, label: column.name }));
  }

  stageColumnKeyFor(task: Task): string {
    if (!task.stageId) return NO_STAGE_KEY;
    const stage = this.board().stages.find(candidate => candidate.id === task.stageId);
    return stage ? this.stageKey(stage.name) : NO_STAGE_KEY;
  }

  onTaskStageChange(event: Event, task: Task): void {
    const key = inputValue(event);
    const column = this.columns().find(candidate => candidate.key === key);
    if (!column || !this.canDropInto(task.id, column)) return;
    this.move(task.id, this.stageIdFor(task.id, column));
  }

  private canDropInto(taskId: string, column: BoardColumn): boolean {
    const task = this.board().tasks.find(candidate => candidate.id === taskId);
    if (!task || this.movingTaskId()) return false;
    if (column.key === NO_STAGE_KEY) return true;
    return column.stages.some(stage => stage.projectId === task.projectId && !stage.closed);
  }

  private stageIdFor(taskId: string, column: BoardColumn): string | null {
    if (column.key === NO_STAGE_KEY) return null;
    const task = this.board().tasks.find(candidate => candidate.id === taskId);
    return column.stages.find(stage => stage.projectId === task?.projectId && !stage.closed)?.id
      ?? null;
  }

  private move(taskId: string, stageId: string | null): void {
    if (this.movingTaskId()) return;
    this.movingTaskId.set(taskId);
    this.actionError.set(null);
    this.tasks.moveToStage(taskId, { stageId }).subscribe({
      next: () => {
        this.movingTaskId.set(null);
        this.load();
      },
      error: err => {
        this.movingTaskId.set(null);
        this.actionError.set(taskErrorMessage(err));
      }
    });
  }

  private stageKey(name: string): string {
    return name.trim().toLowerCase();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.tasks.getBoard(this.selectedProjectId() || null).subscribe({
      next: board => {
        this.board.set(board);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(taskErrorMessage(err));
      }
    });
  }

  private loadCatalogs(projectId: string): void {
    if (!projectId) {
      this.statuses.set([]);
      this.areas.set([]);
      this.assignments.set([]);
      return;
    }
    this.tasks.listStatuses(projectId).subscribe({
      next: list => this.statuses.set(list),
      error: err => this.actionError.set(projectErrorMessage(err))
    });
    this.tasks.listAreas(projectId).subscribe({
      next: list => this.areas.set(list),
      error: err => this.actionError.set(projectErrorMessage(err))
    });
    this.projects.listAssignments(projectId).subscribe({
      next: list => this.assignments.set(list),
      error: err => this.actionError.set(projectErrorMessage(err))
    });
  }

  /** Solo envía campos del tipo de área elegido: el backend rechaza los ajenos. */
  private buildAreaDetails(draft: AreaDetailsDraft, tipo: AreaTipo | null): AreaDetails | null {
    const payload: Record<string, unknown> = {};
    const text = (key: string, value: string): void => {
      const trimmed = value.trim();
      if (trimmed) payload[key] = trimmed;
    };
    const number = (key: string, value: string): void => {
      const trimmed = value.trim();
      if (!trimmed) return;
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed) && parsed >= 0) payload[key] = parsed;
    };
    const choice = (key: string, value: string): void => {
      if (value) payload[key] = value;
    };

    if (tipo === 'OBRA_INGENIERIA') {
      text('frenteObra', draft.frenteObra);
      choice('capituloPresupuestal', draft.capituloPresupuestal);
      choice('unidadMedida', draft.unidadMedida);
      number('cantidadProgramada', draft.cantidadProgramada);
      text('contratistaId', draft.contratistaId);
      if (draft.requierePermisoSst) {
        payload['requierePermisoSst'] = true;
        if (draft.permisosSst.length > 0) payload['permisosSst'] = draft.permisosSst;
      }
    } else if (tipo === 'COMPRAS_ALMACEN') {
      text('codigoRequisicion', draft.codigoRequisicion);
      text('fechaRequeridaEnObra', draft.fechaRequeridaEnObra);
      choice('categoriaInsumo', draft.categoriaInsumo);
      number('presupuestoEstimado', draft.presupuestoEstimado);
      text('proveedorSugerido', draft.proveedorSugerido);
    } else if (tipo === 'DISENO_ARQUITECTURA') {
      choice('disciplina', draft.disciplina);
      text('codigoPlano', draft.codigoPlano);
      text('versionPlano', draft.versionPlano);
    } else if (tipo === 'LEGAL_TRAMITES') {
      text('entidad', draft.entidad);
      text('numeroRadicado', draft.numeroRadicado);
    } else if (tipo === 'CONTABILIDAD_FINANZAS') {
      choice('tipoDocumento', draft.tipoDocumento);
      text('numeroDocumento', draft.numeroDocumento);
      number('monto', draft.monto);
    }

    return Object.keys(payload).length > 0 ? payload as unknown as AreaDetails : null;
  }
}
