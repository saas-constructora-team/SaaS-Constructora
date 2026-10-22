import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService, authErrorMessage } from './auth.service';

/** HU-13: consumo del token del correo y fijado de la nueva contraseña. */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <p class="auth-brand">Constructora</p>
    <h1 class="auth-title">Nueva contraseña</h1>
    <p class="auth-subtitle">Define una contraseña nueva para tu cuenta.</p>

    @if (error()) {
      <div class="auth-alert auth-alert-error" role="alert">{{ error() }}</div>
    }

    @if (result(); as message) {
      <div class="auth-alert auth-alert-success" role="status">{{ message }}</div>
      <button class="auth-btn" type="button" (click)="done.emit()">Ir a iniciar sesión</button>
    } @else {
      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <div class="auth-field">
          <label class="auth-label" for="reset-password">Nueva contraseña</label>
          <input
            class="auth-input"
            id="reset-password"
            type="password"
            formControlName="newPassword"
            autocomplete="new-password"
            placeholder="Mínimo 8 caracteres"
          >
          @if (showError('newPassword')) {
            <span class="auth-field-error">{{ newPasswordError() }}</span>
          }
        </div>

        <div class="auth-field">
          <label class="auth-label" for="reset-confirm">Confirmar contraseña</label>
          <input
            class="auth-input"
            id="reset-confirm"
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
          {{ loading() ? 'Guardando…' : 'Guardar contraseña' }}
        </button>
      </form>
    }
  `,
  styles: []
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  @Input({ required: true }) token = '';
  @Output() readonly done = new EventEmitter<void>();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: ResetPasswordComponent.passwordsMatch });

  showError(control: 'newPassword' | 'confirmPassword'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  newPasswordError(): string {
    const control = this.form.controls.newPassword;
    return control.errors?.['required']
      ? 'La nueva contraseña es obligatoria'
      : 'La contraseña debe tener al menos 8 caracteres';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    this.auth.resetPassword({
      token: this.token,
      newPassword: this.form.controls.newPassword.value
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.result.set(res.message);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(authErrorMessage(err));
      }
    });
  }

  private static passwordsMatch(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword && confirmPassword && newPassword !== confirmPassword
      ? { passwordMismatch: true }
      : null;
  }
}
