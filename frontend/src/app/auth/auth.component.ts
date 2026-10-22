import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { LoginComponent } from './login.component';
import { RegisterComponent } from './register.component';
import { ForgotPasswordComponent } from './forgot-password.component';
import { ResetPasswordComponent } from './reset-password.component';

type AuthView = 'login' | 'register' | 'forgot' | 'reset';

/**
 * Contenedor de la autenticación: alterna entre login, creación de cuenta,
 * recuperación de contraseña y restablecimiento (este último se activa con
 * ?token=... del enlace enviado por correo, HU-13).
 */
@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, LoginComponent, RegisterComponent, ForgotPasswordComponent, ResetPasswordComponent],
  template: `
    <div class="auth-page">
      <div class="auth-card">

        @if (auth.session(); as session) {
          <div class="auth-session">
            <p class="auth-brand">Constructora</p>
            <h1 class="auth-session-name">¡Hola, {{ session.user.fullName }}!</h1>
            <p class="auth-meta">{{ session.user.email }} · Rol: {{ session.user.role }}</p>
            <button class="auth-btn" type="button" (click)="logout()">Cerrar sesión</button>
          </div>
        } @else {
          @switch (view) {
            @case ('login') {
              <app-login (forgot)="view = 'forgot'" (register)="view = 'register'"></app-login>
            }
            @case ('register') {
              <app-register (back)="view = 'login'"></app-register>
            }
            @case ('forgot') {
              <app-forgot-password (back)="view = 'login'"></app-forgot-password>
            }
            @case ('reset') {
              <app-reset-password [token]="resetToken" (done)="onResetDone()"></app-reset-password>
            }
          }
        }

      </div>
    </div>
  `,
  styles: []
})
export class AuthComponent {
  readonly auth = inject(AuthService);

  view: AuthView = 'login';
  resetToken = '';

  constructor() {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      this.resetToken = token;
      this.view = 'reset';
    }
  }

  logout(): void {
    this.clearTokenParam();
    this.view = 'login';
    this.auth.logout();
  }

  onResetDone(): void {
    this.clearTokenParam();
    this.resetToken = '';
    this.view = 'login';
  }

  private clearTokenParam(): void {
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }
}
