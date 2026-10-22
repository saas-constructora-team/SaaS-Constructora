import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
  signal
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  BudgetRange,
  CreateProjectRequest,
  LotOwnership,
  Project,
  ProjectType
} from './project.model';
import { ProjectService, projectErrorMessage } from './project.service';

type FieldName =
  | 'name'
  | 'clientName'
  | 'contactEmail'
  | 'contactPhone'
  | 'location'
  | 'estimatedArea'
  | 'occupantCount'
  | 'requiredSpaces'
  | 'styleReferences';

/**
 * Formulario para crear o editar un proyecto. Si recibe un proyecto,
 * precarga sus datos y guarda con PUT; si no, crea con POST.
 */
@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="panel">
      <header class="panel-header">
        <div>
          <h2 class="panel-title">{{ isEdit ? 'Editar proyecto' : 'Nuevo proyecto' }}</h2>
          <p class="panel-subtitle">
            {{ isEdit ? 'Actualiza los datos del proyecto.' : 'Registra los datos iniciales del proyecto y del cliente.' }}
          </p>
        </div>
        <button class="btn btn-ghost" type="button" (click)="cancelled.emit()">Cerrar</button>
      </header>

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <h3 class="form-section-title">Datos del proyecto</h3>
        <div class="form-grid">
          <div class="form-field form-field-wide">
            <label class="form-label" for="project-name">Nombre del proyecto *</label>
            <input
              class="form-input"
              id="project-name"
              type="text"
              formControlName="name"
              maxlength="200"
              placeholder="Edificio Torres del Valle"
            >
            @if (errorFor('name'); as message) {
              <span class="form-error">{{ message }}</span>
            }
          </div>

          <div class="form-field">
            <label class="form-label" for="project-location">Ubicación</label>
            <input
              class="form-input"
              id="project-location"
              type="text"
              formControlName="location"
              maxlength="300"
              placeholder="Tuluá, Valle del Cauca"
            >
            @if (errorFor('location'); as message) {
              <span class="form-error">{{ message }}</span>
            }
          </div>

          <div class="form-field">
            <label class="form-label" for="project-lot">Propiedad del lote / inmueble</label>
            <select class="form-input" id="project-lot" formControlName="lotOwnership">
              <option value="">Selecciona una opción</option>
              @for (option of lotOwnerships; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>
        </div>

        <h3 class="form-section-title">Cliente</h3>
        <div class="form-grid">
          <div class="form-field">
            <label class="form-label" for="project-client">Nombre completo / Razón social</label>
            <input
              class="form-input"
              id="project-client"
              type="text"
              formControlName="clientName"
              maxlength="200"
              placeholder="Inmobiliaria XYZ S.A.S."
            >
            @if (errorFor('clientName'); as message) {
              <span class="form-error">{{ message }}</span>
            }
          </div>

          <div class="form-field">
            <label class="form-label" for="project-email">Correo electrónico</label>
            <input
              class="form-input"
              id="project-email"
              type="email"
              formControlName="contactEmail"
              maxlength="200"
              placeholder="contacto@cliente.com"
            >
            @if (errorFor('contactEmail'); as message) {
              <span class="form-error">{{ message }}</span>
            }
          </div>

          <div class="form-field">
            <label class="form-label" for="project-phone">Teléfono</label>
            <input
              class="form-input"
              id="project-phone"
              type="tel"
              formControlName="contactPhone"
              maxlength="50"
              placeholder="+57 300 123 4567"
            >
            @if (errorFor('contactPhone'); as message) {
              <span class="form-error">{{ message }}</span>
            }
          </div>
        </div>

        <h3 class="form-section-title">Datos de la obra</h3>
        <div class="form-grid">
          <div class="form-field">
            <label class="form-label" for="project-type">Tipo de obra</label>
            <select class="form-input" id="project-type" formControlName="projectType">
              <option value="">Selecciona una opción</option>
              @for (type of projectTypes; track type.value) {
                <option [value]="type.value">{{ type.label }}</option>
              }
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="project-use">Uso del inmueble</label>
            <select class="form-input" id="project-use" formControlName="propertyUse">
              <option value="">Selecciona una opción</option>
              @for (type of projectTypes; track type.value) {
                <option [value]="type.value">{{ type.label }}</option>
              }
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="project-area">Área estimada (m², opcional)</label>
            <input
              class="form-input"
              id="project-area"
              type="number"
              formControlName="estimatedArea"
              min="0"
              step="0.01"
              placeholder="120"
            >
            @if (errorFor('estimatedArea'); as message) {
              <span class="form-error">{{ message }}</span>
            }
          </div>

          <div class="form-field">
            <label class="form-label" for="project-occupants">Número de usuarios</label>
            <input
              class="form-input"
              id="project-occupants"
              type="number"
              formControlName="occupantCount"
              min="0"
              step="1"
              placeholder="4"
            >
            @if (errorFor('occupantCount'); as message) {
              <span class="form-error">{{ message }}</span>
            }
          </div>
        </div>

        <h3 class="form-section-title">Alcance, estilo y presupuesto</h3>
        <div class="form-grid">
          <div class="form-field form-field-wide">
            <label class="form-label" for="project-spaces">Espacios indispensables</label>
            <textarea
              class="form-input"
              id="project-spaces"
              formControlName="requiredSpaces"
              rows="3"
              maxlength="1000"
              placeholder="Ej.: 4 habitaciones, 3 baños, estacionamiento para 2 carros, jardín y estudio para teletrabajo."
            ></textarea>
            @if (errorFor('requiredSpaces'); as message) {
              <span class="form-error">{{ message }}</span>
            }
          </div>

          <div class="form-field form-field-wide">
            <label class="form-label" for="project-style">Estilo o referencias</label>
            <textarea
              class="form-input"
              id="project-style"
              formControlName="styleReferences"
              rows="3"
              maxlength="2000"
              placeholder="Estilo moderno y minimalista. Enlaces de referencia: https://..."
            ></textarea>
            @if (errorFor('styleReferences'); as message) {
              <span class="form-error">{{ message }}</span>
            }
          </div>

          <div class="form-field">
            <label class="form-label" for="project-budget">Presupuesto estimado</label>
            <select class="form-input" id="project-budget" formControlName="budgetRange">
              <option value="">Selecciona un rango</option>
              @for (option of budgetRanges; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>

          <div class="form-field">
            <label class="form-label" for="project-start">Fecha estimada de inicio</label>
            <input class="form-input" id="project-start" type="date" formControlName="estimatedStartDate">
          </div>

          <div class="form-field">
            <label class="form-label" for="project-delivery">Fecha estimada de entrega</label>
            <input class="form-input" id="project-delivery" type="date" formControlName="estimatedDeliveryDate">
          </div>
        </div>

        <h3 class="form-section-title">Documentación disponible</h3>
        <div class="checkbox-grid">
          <label class="checkbox-item">
            <input type="checkbox" formControlName="hasDeeds"> Escrituras
          </label>
          <label class="checkbox-item">
            <input type="checkbox" formControlName="hasTopographicSurvey"> Levantamiento topográfico
          </label>
          <label class="checkbox-item">
            <input type="checkbox" formControlName="hasPreviousPlans"> Planos previos
          </label>
          <label class="checkbox-item">
            <input type="checkbox" formControlName="hasSitePhotos"> Fotos del sitio
          </label>
        </div>

        <div class="form-actions">
          <button class="btn btn-ghost" type="button" (click)="cancelled.emit()" [disabled]="saving()">
            Cancelar
          </button>
          <button class="btn btn-primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Crear proyecto') }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [`
    .form-section-title {
      margin: 1.5rem 0 0.75rem;
      font-size: 0.95rem;
      color: #243b53;
      border-bottom: 1px solid #e3e8ef;
      padding-bottom: 0.35rem;
    }

    .form-section-title:first-of-type {
      margin-top: 0;
    }

    textarea.form-input {
      resize: vertical;
      font-family: inherit;
    }

    .checkbox-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.5rem 1rem;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.9rem;
    }

    @media (max-width: 640px) {
      .checkbox-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProjectFormComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly projects = inject(ProjectService);

  @Input() project: Project | null = null;
  @Output() readonly saved = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly projectTypes: ReadonlyArray<{ value: ProjectType; label: string }> = [
    { value: 'RESIDENTIAL', label: 'Residencial (casa/apto)' },
    { value: 'COMMERCIAL', label: 'Comercial (local/oficina)' },
    { value: 'INDUSTRIAL', label: 'Industrial' },
    { value: 'MIXED', label: 'Mixto' }
  ];

  readonly budgetRanges: ReadonlyArray<{ value: BudgetRange; label: string }> = [
    { value: 'UNDER_50M', label: 'Menos de $50 millones' },
    { value: 'FROM_50M_TO_100M', label: '$50 a $100 millones' },
    { value: 'FROM_100M_TO_250M', label: '$100 a $250 millones' },
    { value: 'FROM_250M_TO_500M', label: '$250 a $500 millones' },
    { value: 'OVER_500M', label: 'Más de $500 millones' }
  ];

  readonly lotOwnerships: ReadonlyArray<{ value: LotOwnership; label: string }> = [
    { value: 'OWNED', label: 'Propio' },
    { value: 'IN_PURCHASE', label: 'En proceso de compra' },
    { value: 'RENTED', label: 'En arriendo' }
  ];

  readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    clientName: this.fb.nonNullable.control('', [Validators.maxLength(200)]),
    contactEmail: this.fb.nonNullable.control('', [Validators.email, Validators.maxLength(200)]),
    contactPhone: this.fb.nonNullable.control('', [Validators.maxLength(50)]),
    location: this.fb.nonNullable.control('', [Validators.maxLength(300)]),
    projectType: this.fb.nonNullable.control(''),
    propertyUse: this.fb.nonNullable.control(''),
    estimatedArea: this.fb.control<number | null>(null, [Validators.min(0)]),
    occupantCount: this.fb.control<number | null>(null, [
      Validators.min(0),
      Validators.pattern(/^\d+$/)
    ]),
    requiredSpaces: this.fb.nonNullable.control('', [Validators.maxLength(1000)]),
    styleReferences: this.fb.nonNullable.control('', [Validators.maxLength(2000)]),
    budgetRange: this.fb.nonNullable.control(''),
    estimatedStartDate: this.fb.nonNullable.control(''),
    estimatedDeliveryDate: this.fb.nonNullable.control(''),
    lotOwnership: this.fb.nonNullable.control(''),
    hasDeeds: this.fb.nonNullable.control(false),
    hasTopographicSurvey: this.fb.nonNullable.control(false),
    hasPreviousPlans: this.fb.nonNullable.control(false),
    hasSitePhotos: this.fb.nonNullable.control(false)
  });

  get isEdit(): boolean {
    return this.project !== null;
  }

  ngOnChanges(): void {
    this.error.set(null);
    this.form.reset({
      name: this.project?.name ?? '',
      clientName: this.project?.clientName ?? '',
      contactEmail: this.project?.contactEmail ?? '',
      contactPhone: this.project?.contactPhone ?? '',
      location: this.project?.location ?? '',
      projectType: this.project?.projectType ?? '',
      propertyUse: this.project?.propertyUse ?? '',
      estimatedArea: this.project?.estimatedArea ?? null,
      occupantCount: this.project?.occupantCount ?? null,
      requiredSpaces: this.project?.requiredSpaces ?? '',
      styleReferences: this.project?.styleReferences ?? '',
      budgetRange: this.project?.budgetRange ?? '',
      estimatedStartDate: this.project?.estimatedStartDate ?? '',
      estimatedDeliveryDate: this.project?.estimatedDeliveryDate ?? '',
      lotOwnership: this.project?.lotOwnership ?? '',
      hasDeeds: this.project?.hasDeeds ?? false,
      hasTopographicSurvey: this.project?.hasTopographicSurvey ?? false,
      hasPreviousPlans: this.project?.hasPreviousPlans ?? false,
      hasSitePhotos: this.project?.hasSitePhotos ?? false
    });
  }

  errorFor(controlName: FieldName): string | null {
    const control = this.form.controls[controlName];
    if (!control.invalid || (!control.dirty && !control.touched)) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    if (control.hasError('email')) {
      return 'Ingresa un correo electrónico válido';
    }
    if (control.hasError('maxlength')) {
      return 'El texto es demasiado largo';
    }
    if (control.hasError('min')) {
      return 'El valor no puede ser negativo';
    }
    if (control.hasError('pattern')) {
      return 'Ingresa un número entero';
    }
    return 'Valor no válido';
  }

  onSubmit(): void {
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request: CreateProjectRequest = {
      name: value.name.trim(),
      clientName: textOrNull(value.clientName),
      location: textOrNull(value.location),
      contactEmail: textOrNull(value.contactEmail),
      contactPhone: textOrNull(value.contactPhone),
      projectType: value.projectType ? value.projectType as ProjectType : null,
      propertyUse: value.propertyUse ? value.propertyUse as ProjectType : null,
      estimatedArea: value.estimatedArea,
      occupantCount: value.occupantCount,
      requiredSpaces: textOrNull(value.requiredSpaces),
      styleReferences: textOrNull(value.styleReferences),
      budgetRange: value.budgetRange ? value.budgetRange as BudgetRange : null,
      estimatedStartDate: value.estimatedStartDate || null,
      estimatedDeliveryDate: value.estimatedDeliveryDate || null,
      lotOwnership: value.lotOwnership ? value.lotOwnership as LotOwnership : null,
      hasDeeds: value.hasDeeds,
      hasTopographicSurvey: value.hasTopographicSurvey,
      hasPreviousPlans: value.hasPreviousPlans,
      hasSitePhotos: value.hasSitePhotos
    };

    this.saving.set(true);
    this.error.set(null);

    const operation = this.project
      ? this.projects.update(this.project.id, request)
      : this.projects.create(request);

    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(projectErrorMessage(err));
      }
    });
  }
}

function textOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
