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
    <div class="auth-layout" [class.auth-layout--register]="!auth.session() && view === 'register'">
      <aside class="auth-brand-panel" aria-label="SaaS Constructora">
        <div class="auth-brand-lockup">
          <span class="auth-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <path d="M6 33V15.5L20 7l14 8.5V33H6Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
              <path d="M14 33V22h12v11M11 17h.01M20 17h.01M29 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </span>
          <span class="auth-brand-wordmark"><strong>SaaS</strong> Constructora<small>GESTIÓN DE OBRA</small></span>
        </div>

        <div class="auth-brand-copy">
          <p class="auth-brand-kicker"><span></span> TODO TU PROYECTO, EN UN SOLO LUGAR</p>
          <h2>Construye con<br><em>claridad.</em></h2>
        </div>

        <div class="auth-brand-bottom">
          <p class="auth-brand-description">Coordina equipos, proyectos y avances de obra desde una plataforma diseñada para constructoras.</p>
          <div class="auth-blueprint" aria-hidden="true">
            <svg viewBox="0 0 620 330" fill="none">
              <path class="blueprint-grid" d="M0 40H620M0 90H620M0 140H620M0 190H620M0 240H620M0 290H620M40 0V330M90 0V330M140 0V330M190 0V330M240 0V330M290 0V330M340 0V330M390 0V330M440 0V330M490 0V330M540 0V330M590 0V330" />
              <path class="blueprint-line" d="M93 265V116l105-61 105 61v149H93Z" />
              <path class="blueprint-line blueprint-line--strong" d="M128 265v-97h139v97M162 168v-47h70v47M197 121V55M93 116h210M303 116l75-43 75 43v149H303" />
              <path class="blueprint-line" d="M338 265v-95h80v95M338 199h80M378 170v95M475 265V126h65v139M475 160h65M507 126V87M83 282h470M72 296h493M82 275v14M303 275v14M553 275v14" />
              <path class="blueprint-accent" d="M378 73l30-17 45 26M198 55l30-17 45 17" />
              <circle class="blueprint-dot" cx="198" cy="55" r="4" />
              <circle class="blueprint-dot" cx="378" cy="73" r="4" />
            </svg>
          </div>
          <div class="auth-brand-footer"><span class="auth-footer-rule"></span> PLANIFICA · COORDINA · CONSTRUYE</div>
        </div>
      </aside>

      <section class="auth-form-panel">
        <div class="auth-card" [class.auth-card--register]="view === 'register'">
          @if (auth.session(); as session) {
            <div class="auth-session">
              <p class="auth-brand">SaaS Constructora</p>
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
        <p class="auth-form-footer">© SaaS Constructora · Gestión profesional de proyectos</p>
      </section>
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
