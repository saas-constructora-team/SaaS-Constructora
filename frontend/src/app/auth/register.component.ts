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
    <p class="auth-brand">Constructora</p>
    <h1 class="auth-title">Crear cuenta</h1>
    <p class="auth-subtitle">Registra tu empresa y tu usuario administrador.</p>

    @if (error()) {
      <div class="auth-alert auth-alert-error" role="alert">{{ error() }}</div>
    }

    <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
      <div class="auth-field">
        <label class="auth-label" for="register-company">Nombre de la empresa</label>
        <input
          class="auth-input"
          id="register-company"
          type="text"
          formControlName="companyName"
          autocomplete="organization"
          placeholder="Constructora Andes"
        >
        @if (showError('companyName')) {
          <span class="auth-field-error">{{ requiredError('El nombre de la empresa') }}</span>
        }
      </div>

      <div class="auth-field">
        <label class="auth-label" for="register-name">Nombre del administrador</label>
        <input
          class="auth-input"
          id="register-name"
          type="text"
          formControlName="adminFullName"
          autocomplete="name"
          placeholder="Ana Pérez"
        >
        @if (showError('adminFullName')) {
          <span class="auth-field-error">{{ requiredError('El nombre del administrador') }}</span>
        }
      </div>

      <div class="auth-field">
        <label class="auth-label" for="register-email">Correo electrónico</label>
        <input
          class="auth-input"
          id="register-email"
          type="email"
          formControlName="adminEmail"
          autocomplete="email"
          placeholder="tu@empresa.com"
        >
        @if (showError('adminEmail')) {
          <span class="auth-field-error">{{ emailError() }}</span>
        }
      </div>

      <div class="auth-field">
        <label class="auth-label" for="register-password">Contraseña</label>
        <input
          class="auth-input"
          id="register-password"
          type="password"
          formControlName="adminPassword"
          autocomplete="new-password"
          placeholder="Mínimo 8 caracteres"
        >
        @if (showError('adminPassword')) {
          <span class="auth-field-error">{{ adminPasswordError() }}</span>
        }
      </div>

      <div class="auth-field">
        <label class="auth-label" for="register-confirm">Confirmar contraseña</label>
        <input
          class="auth-input"
          id="register-confirm"
          type="password"
          formControlName="confirmPassword"
          autocomplete="new-password"
          placeholder="Repite la contraseña"
        >
        @if (showError('confirmPassword')) {
          <span class="auth-field-error">Las contraseñas no coinciden</span>
        }
      </div>

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
