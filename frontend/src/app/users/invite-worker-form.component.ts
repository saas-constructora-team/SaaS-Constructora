import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../auth/auth.service';
import { InvitationService, invitationError } from '../auth/invitation.service';
import { DocumentType, InvitationRole } from '../auth/invitation.model';
import { PermissionService } from '../core/permission.service';
import { ProjectService } from '../projects/project.service';

@Component({
  selector: 'app-invite-worker-form', standalone: true, imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="panel" aria-labelledby="invite-title">
      <h2 id="invite-title" class="panel-title">Invitar trabajador</h2>
      @if (!allowed()) { <p role="alert">No tienes autorización para enviar esta invitación.</p> }
      @else {
        @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }
        @if (success()) { <div class="alert alert-success" role="status">{{ success() }}</div> }
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate [attr.aria-busy]="saving()">
          <fieldset [disabled]="saving() || sent()">
            <legend>Datos del trabajador</legend>
            <div class="invite-grid">
              @for (field of fields; track field.key) {
                <div class="auth-field">
                  <label class="form-label" [for]="'invite-' + field.key">{{ field.label }}</label>
                  <input class="form-input" [id]="'invite-' + field.key" [type]="field.type" [formControlName]="field.key"
                    [attr.aria-invalid]="invalid(field.key)" [attr.aria-describedby]="invalid(field.key) ? 'invite-error-' + field.key : null">
                  @if (invalid(field.key)) {
                    <span class="auth-field-error" [id]="'invite-error-' + field.key">{{ fieldError(field.key) }}</span>
                  }
                </div>
              }
              <div class="auth-field">
                <label class="form-label" for="invite-documentType">Tipo de documento</label>
                <select id="invite-documentType" class="form-input" formControlName="documentType">
                  @for (option of documents; track option.value) { <option [value]="option.value">{{ option.label }}</option> }
                </select>
              </div>
            </div>
          </fieldset>
          <fieldset [disabled]="saving() || sent()">
            <legend>Vinculación a la constructora</legend>
            <div class="invite-grid">
              <div class="auth-field">
                <label class="form-label" for="invite-role">Rol en la constructora</label>
                <select id="invite-role" class="form-input" formControlName="role">
                  <option value="WORKER">Trabajador</option><option value="MEMBER">Miembro</option>
                </select>
              </div>
              <div class="auth-field">
                <label class="form-label" for="invite-project">Proyecto (opcional)</label>
                <select id="invite-project" class="form-input" formControlName="projectId" [attr.aria-describedby]="'invite-project-help'">
                  <option value="">Sin proyecto</option>
                  @for (project of projects(); track project.id) { <option [value]="project.id">{{ project.name }}</option> }
                </select>
                <p id="invite-project-help" class="muted">Esta vinculación no concede acceso al proyecto. La asignación se realiza después de aceptar la invitación.</p>
                @if (projectError()) { <p class="muted" role="status">{{ projectError() }}</p> }
              </div>
            </div>
          </fieldset>
          <div class="invite-actions">
            <button class="btn btn-primary" type="submit" [disabled]="saving() || sent()">{{ saving() ? 'Enviando…' : 'Enviar invitación' }}</button>
            <button class="btn btn-ghost" type="button" [disabled]="saving()" (click)="closed.emit()">Cerrar</button>
          </div>
        </form>
      }
    </section>`,
  styles: [`fieldset { border: 0; padding: 0; margin: 1rem 0; min-width: 0; }
    legend { font-weight: 600; margin-bottom: 1rem; }
    .invite-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
    .invite-actions { display: flex; flex-wrap: wrap; gap: .75rem; }
    @media(max-width: 640px) { .invite-grid { grid-template-columns: 1fr; } }`]
})
export class InviteWorkerFormComponent {
  private readonly auth = inject(AuthService);
  private readonly scope = this.auth.session();
  private readonly permissions = inject(PermissionService);
  private readonly api = inject(InvitationService);
  private readonly projectService = inject(ProjectService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  @Output() readonly closed = new EventEmitter<void>();
  readonly allowed = computed(() => !!this.scope && this.auth.session() === this.scope
    && this.permissions.capabilities().managePersonnel === 'granted');
  readonly saving = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly projects = signal<{ id: string; name: string }[]>([]);
  readonly projectError = signal<string | null>(null);
  readonly fields = [
    { key: 'fullName', label: 'Nombre completo', type: 'text' },
    { key: 'documentNumber', label: 'Número de documento', type: 'text' },
    { key: 'phone', label: 'Teléfono', type: 'tel' },
    { key: 'email', label: 'Correo electrónico', type: 'email' },
    { key: 'emergencyContactName', label: 'Nombre del contacto de emergencia', type: 'text' },
    { key: 'emergencyContactPhone', label: 'Teléfono del contacto de emergencia', type: 'tel' },
    { key: 'position', label: 'Cargo', type: 'text' }
  ];
  readonly documents = [
    { value: 'NATIONAL_ID', label: 'Cédula de ciudadanía' }, { value: 'FOREIGN_ID', label: 'Cédula de extranjería' },
    { value: 'PASSPORT', label: 'Pasaporte' }, { value: 'IDENTITY_CARD', label: 'Tarjeta de identidad' }, { value: 'OTHER', label: 'Otro' }
  ];
  readonly form = this.fb.nonNullable.group({
    fullName: ['', [notBlank, Validators.maxLength(150)]],
    documentType: this.fb.nonNullable.control<DocumentType>('NATIONAL_ID', [Validators.required, Validators.pattern(/^(NATIONAL_ID|FOREIGN_ID|PASSPORT|IDENTITY_CARD|OTHER)$/)]),
    documentNumber: ['', [notBlank, Validators.maxLength(50)]],
    phone: ['', [notBlank, Validators.maxLength(30)]],
    email: ['', [notBlank, Validators.email, Validators.maxLength(255)]],
    emergencyContactName: ['', [notBlank, Validators.maxLength(150)]],
    emergencyContactPhone: ['', [notBlank, Validators.maxLength(30)]],
    position: ['', [notBlank, Validators.maxLength(50)]],
    role: this.fb.nonNullable.control<InvitationRole>('WORKER', [Validators.required, Validators.pattern(/^(WORKER|MEMBER)$/)]),
    projectId: ['']
  });

  constructor() {
    if (this.allowed()) this.projectService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: projects => { if (this.allowed()) this.projects.set(projects); },
      error: () => { if (this.allowed()) this.projectError.set('No se pudieron cargar los proyectos. Puedes invitar sin seleccionar uno.'); }
    });
  }
  invalid(key: string): boolean {
    const control = this.form.get(key);
    return !!control && control.invalid && (control.touched || control.dirty);
  }
  fieldError(key: string): string {
    const errors = this.form.get(key)?.errors;
    if (errors?.['required']) return 'Este campo es obligatorio.';
    if (errors?.['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres.`;
    return 'Introduce un correo electrónico válido.';
  }
  submit(): void {
    if (!this.allowed() || this.saving() || this.sent()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { projectId, ...values } = this.form.getRawValue();
    if (projectId && !this.projects().some(project => project.id === projectId)) {
      this.error.set('Selecciona un proyecto disponible.'); return;
    }
    this.saving.set(true); this.error.set(null);
    this.api.invite({ ...values, ...(projectId ? { projectId } : {}) }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.saving.set(false);
        if (!this.allowed()) return;
        this.sent.set(true);
        this.success.set(`Invitación enviada a ${response.email}. Está pendiente de aceptación. El acceso a proyectos se asigna posteriormente.`);
      },
      error: error => { this.saving.set(false); if (this.allowed()) this.error.set(invitationError(error.status)); }
    });
  }
}
function notBlank(control: AbstractControl) {
  return typeof control.value === 'string' && control.value.trim() ? null : { required: true };
}
