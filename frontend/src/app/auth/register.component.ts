import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService, authErrorMessage } from './auth.service';

/**
 * HU-01: alta de una empresa (tenant) con su usuario administrador.
 * Consume POST /api/auth/register y, al tener éxito, deja la sesión abierta.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="auth-form-heading">
      <p class="auth-brand">SaaS Constructora</p>
      <h1 class="auth-title">Registra tu constructora</h1>
      <p class="auth-subtitle">Crea la cuenta de tu empresa y designa a su administrador.</p>
    </div>

    @if (error()) {
      <div class="auth-alert auth-alert-error" role="alert">{{ error() }}</div>
    }

    <form class="auth-form" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
      <section class="auth-form-section" aria-labelledby="company-section-title">
        <div class="auth-section-heading">
          <span class="auth-section-step">01</span>
          <div>
            <h2 id="company-section-title">Datos de la empresa</h2>
            <p>Información de la constructora que usará la plataforma.</p>
          </div>
        </div>

        <div class="auth-fields-grid">
          <div class="auth-field">
            <label class="auth-label" for="register-company">Razón social</label>
            <input class="auth-input" id="register-company" type="text" formControlName="companyName" autocomplete="organization" placeholder="Constructora Andes S.A.S.">
            @if (showError('companyName')) {
              <span class="auth-field-error">{{ fieldError('companyName', 'La razón social') }}</span>
            }
          </div>

          <div class="auth-field">
            <label class="auth-label" for="register-trade-name">Nombre comercial</label>
            <input class="auth-input" id="register-trade-name" type="text" formControlName="tradeName" autocomplete="organization" placeholder="Andes Construcciones">
            @if (showError('tradeName')) {
              <span class="auth-field-error">{{ fieldError('tradeName', 'El nombre comercial') }}</span>
            }
          </div>

          <div class="auth-field">
            <label class="auth-label" for="register-tax-id">NIT</label>
            <input class="auth-input" id="register-tax-id" type="text" inputmode="numeric" formControlName="taxId" placeholder="900123456-7">
            @if (showError('taxId')) {
              <span class="auth-field-error">{{ fieldError('taxId', 'El NIT') }}</span>
            }
          </div>

          <div class="auth-field">
            <label class="auth-label" for="register-phone">Teléfono de contacto</label>
            <input class="auth-input" id="register-phone" type="tel" formControlName="contactPhone" autocomplete="tel" placeholder="(601) 555 0100">
            @if (showError('contactPhone')) {
              <span class="auth-field-error">{{ fieldError('contactPhone', 'El teléfono') }}</span>
            }
          </div>

          <div class="auth-field auth-field--wide">
            <label class="auth-label" for="register-address">Dirección</label>
            <input class="auth-input" id="register-address" type="text" formControlName="address" autocomplete="street-address" placeholder="Dirección de la sede principal">
            @if (showError('address')) {
              <span class="auth-field-error">{{ fieldError('address', 'La dirección') }}</span>
            }
          </div>

          <div class="auth-field auth-field--wide">
            <label class="auth-label" for="register-company-email">Correo corporativo</label>
            <input class="auth-input" id="register-company-email" type="email" formControlName="companyEmail" autocomplete="email" placeholder="contacto@constructora.com">
            @if (showError('companyEmail')) {
              <span class="auth-field-error">{{ fieldError('companyEmail', 'El correo corporativo') }}</span>
            }
          </div>
        </div>
      </section>

      <section class="auth-form-section" aria-labelledby="admin-section-title">
        <div class="auth-section-heading">
          <span class="auth-section-step">02</span>
          <div>
            <h2 id="admin-section-title">Datos del administrador</h2>
            <p>Esta persona tendrá acceso para gestionar la cuenta y su equipo.</p>
          </div>
        </div>

        <div class="auth-fields-grid">
          <div class="auth-field auth-field--wide">
            <label class="auth-label" for="register-name">Nombre completo</label>
            <input class="auth-input" id="register-name" type="text" formControlName="adminFullName" autocomplete="name" placeholder="Ana Pérez">
            @if (showError('adminFullName')) {
              <span class="auth-field-error">{{ fieldError('adminFullName', 'El nombre del administrador') }}</span>
            }
          </div>

          <div class="auth-field auth-field--wide">
            <label class="auth-label" for="register-email">Correo electrónico de acceso</label>
            <input class="auth-input" id="register-email" type="email" formControlName="adminEmail" autocomplete="email" placeholder="ana@constructora.com">
            @if (showError('adminEmail')) {
              <span class="auth-field-error">{{ emailError() }}</span>
            }
          </div>

          <div class="auth-field">
            <label class="auth-label" for="register-password">Contraseña</label>
            <input class="auth-input" id="register-password" type="password" formControlName="adminPassword" autocomplete="new-password" placeholder="Mínimo 8 caracteres">
            @if (showError('adminPassword')) {
              <span class="auth-field-error">{{ adminPasswordError() }}</span>
            }
          </div>

          <div class="auth-field">
            <label class="auth-label" for="register-confirm">Confirmar contraseña</label>
            <input class="auth-input" id="register-confirm" type="password" formControlName="confirmPassword" autocomplete="new-password" placeholder="Repite la contraseña">
            @if (showConfirmPasswordError()) {
              <span class="auth-field-error">{{ form.controls.confirmPassword.hasError('required') ? 'Confirma la contraseña' : 'Las contraseñas no coinciden' }}</span>
            }
          </div>
        </div>
      </section>

      <button class="auth-btn" type="submit" [disabled]="loading()">
        {{ loading() ? 'Creando cuenta…' : 'Crear cuenta' }}
      </button>
    </form>

    <div class="auth-back">
      <button class="auth-link" type="button" (click)="back.emit()">¿Ya tienes cuenta? Inicia sesión</button>
    </div>
  `,
  styles: []
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  @Output() readonly back = new EventEmitter<void>();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    companyName: ['', [RegisterComponent.notBlank, Validators.maxLength(100)]],
    tradeName: ['', Validators.maxLength(150)],
    taxId: ['', [RegisterComponent.notBlank, Validators.maxLength(50)]],
    address: ['', [RegisterComponent.notBlank, Validators.maxLength(255)]],
    contactPhone: ['', Validators.maxLength(50)],
    companyEmail: ['', [Validators.email, Validators.maxLength(255)]],
    adminFullName: ['', [RegisterComponent.notBlank, Validators.maxLength(150)]],
    adminEmail: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    adminPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*\p{L})(?=.*\p{N})(?=.*[\p{P}\p{S}]).*$/u)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: RegisterComponent.passwordsMatch });

  showError(control: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  fieldError(control: keyof typeof this.form.controls, label: string): string {
    const errors = this.form.controls[control].errors;
    if (errors?.['required']) return `${label} es obligatorio`;
    if (errors?.['maxlength']) return `${label} admite máximo ${errors['maxlength'].requiredLength} caracteres`;
    return `${label} no tiene un formato válido`;
  }

  showConfirmPasswordError(): boolean {
    const control = this.form.controls.confirmPassword;
    return (control.touched || control.dirty)
      && (control.invalid || this.form.hasError('passwordMismatch'));
  }

  private static notBlank(control: AbstractControl): ValidationErrors | null {
    return typeof control.value === 'string' && control.value.trim() ? null : { required: true };
  }

  emailError(): string {
    return this.fieldError('adminEmail', 'El email');
  }

  adminPasswordError(): string {
    const password = this.form.controls.adminPassword;
    return password.errors?.['required']
      ? 'La contraseña es obligatoria'
      : password.hasError('minlength')
        ? 'La contraseña debe tener al menos 8 caracteres'
        : 'La contraseña debe incluir letras, números y un símbolo';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { confirmPassword, ...values } = this.form.getRawValue();
    const optional = (value: string): string | null => value.trim() || null;
    this.error.set(null);
    this.loading.set(true);
    this.auth.register({
      ...values,
      tradeName: optional(values.tradeName),
      contactPhone: optional(values.contactPhone),
      companyEmail: optional(values.companyEmail)
    }).subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        this.loading.set(false);
        this.error.set(authErrorMessage(err));
      }
    });
  }

  private static passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const adminPassword = group.get('adminPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return adminPassword && confirmPassword && adminPassword !== confirmPassword
      ? { passwordMismatch: true }
      : null;
  }
}
