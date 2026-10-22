import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, authErrorMessage } from './auth.service';

/** HU-13: solicitud de recuperación de contraseña por correo. */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <p class="auth-brand">Constructora</p>
    <h1 class="auth-title">Recuperar contraseña</h1>
    <p class="auth-subtitle">Escribe tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>

    @if (error()) {
      <div class="auth-alert auth-alert-error" role="alert">{{ error() }}</div>
    }

    @if (sent(); as message) {
      <div class="auth-alert auth-alert-success" role="status">{{ message }}</div>
      <button class="auth-btn" type="button" (click)="back.emit()">Volver a iniciar sesión</button>
    } @else {
      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <div class="auth-field">
          <label class="auth-label" for="forgot-email">Correo electrónico</label>
          <input
            class="auth-input"
            id="forgot-email"
            type="email"
            formControlName="email"
            autocomplete="email"
            placeholder="tu@empresa.com"
          >
          @if (showError()) {
            <span class="auth-field-error">{{ emailError() }}</span>
          }
        </div>

        <button class="auth-btn" type="submit" [disabled]="loading()">
          {{ loading() ? 'Enviando…' : 'Enviar enlace' }}
        </button>
      </form>

      <div class="auth-back">
        <button class="auth-link" type="button" (click)="back.emit()">Volver a iniciar sesión</button>
      </div>
    }
  `,
  styles: []
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  @Output() readonly back = new EventEmitter<void>();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly sent = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  showError(): boolean {
    const email = this.form.controls.email;
    return email.invalid && (email.touched || email.dirty);
  }

  emailError(): string {
    const email = this.form.controls.email;
    return email.errors?.['required'] ? 'El email es obligatorio' : 'El email no tiene un formato válido';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    this.auth.forgotPassword(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.sent.set(res.message);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(authErrorMessage(err));
      }
    });
  }
}
