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
              <span class="auth-field-error">{{ requiredError('La razón social') }}</span>
            }
          </div>

          <div class="auth-field">
            <label class="auth-label" for="register-trade-name">Nombre comercial</label>
            <input class="auth-input" id="register-trade-name" type="text" formControlName="tradeName" autocomplete="organization" placeholder="Andes Construcciones">
          </div>

          <div class="auth-field">
            <label class="auth-label" for="register-tax-id">NIT</label>
            <input class="auth-input" id="register-tax-id" type="text" inputmode="numeric" formControlName="taxId" placeholder="900123456-7">
          </div>

          <div class="auth-field">
            <label class="auth-label" for="register-phone">Teléfono de contacto</label>
            <input class="auth-input" id="register-phone" type="tel" formControlName="contactPhone" autocomplete="tel" placeholder="(601) 555 0100">
          </div>

          <div class="auth-field auth-field--wide">
            <label class="auth-label" for="register-address">Dirección</label>
            <input class="auth-input" id="register-address" type="text" formControlName="address" autocomplete="street-address" placeholder="Dirección de la sede principal">
          </div>

          <div class="auth-field auth-field--wide">
            <label class="auth-label" for="register-company-email">Correo corporativo</label>
            <input class="auth-input" id="register-company-email" type="email" formControlName="companyEmail" autocomplete="email" placeholder="contacto@constructora.com">
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
              <span class="auth-field-error">{{ requiredError('El nombre del administrador') }}</span>
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
            @if (showError('confirmPassword')) {
              <span class="auth-field-error">Las contraseñas no coinciden</span>
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
    companyName: ['', [Validators.required, Validators.maxLength(100)]],
    tradeName: [''],
    taxId: [''],
    address: [''],
    contactPhone: [''],
    companyEmail: [''],
    adminFullName: ['', [Validators.required, Validators.maxLength(150)]],
    adminEmail: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    adminPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: RegisterComponent.passwordsMatch });

  showError(control: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  requiredError(label: string): string {
    return `${label} es obligatorio`;
  }

  emailError(): string {
    const email = this.form.controls.adminEmail;
    return email.errors?.['required'] ? 'El email es obligatorio' : 'El email no tiene un formato válido';
  }

  adminPasswordError(): string {
    const password = this.form.controls.adminPassword;
    return password.errors?.['required']
      ? 'La contraseña es obligatoria'
      : 'La contraseña debe tener al menos 8 caracteres';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { companyName, adminFullName, adminEmail, adminPassword } = this.form.getRawValue();
    this.error.set(null);
    this.loading.set(true);
    this.auth.register({ companyName, adminFullName, adminEmail, adminPassword }).subscribe({
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
