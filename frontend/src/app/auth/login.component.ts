import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  NgZone,
  OnDestroy,
  Output,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GOOGLE_CLIENT_ID } from './auth.config';
import { GoogleIdentityApi } from './auth.model';
import { AuthService, authErrorMessage } from './auth.service';

type GoogleState = 'loading' | 'ready' | 'unconfigured' | 'unavailable';

const GOOGLE_INIT_ATTEMPTS = 40;
const GOOGLE_RETRY_MS = 250;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <p class="auth-brand">Constructora</p>
    <h1 class="auth-title">Iniciar sesión</h1>
    <p class="auth-subtitle">Accede con tu correo y contraseña o con tu cuenta de Google.</p>

    @if (error()) {
      <div class="auth-alert auth-alert-error" role="alert">{{ error() }}</div>
    }

    <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
      <div class="auth-field">
        <label class="auth-label" for="login-email">Correo electrónico</label>
        <input
          class="auth-input"
          id="login-email"
          type="email"
          formControlName="email"
          autocomplete="email"
          placeholder="tu@empresa.com"
        >
        @if (showError('email')) {
          <span class="auth-field-error">{{ emailError() }}</span>
        }
      </div>

      <div class="auth-field">
        <label class="auth-label" for="login-password">Contraseña</label>
        <input
          class="auth-input"
          id="login-password"
          type="password"
          formControlName="password"
          autocomplete="current-password"
          placeholder="••••••••"
        >
        @if (showError('password')) {
          <span class="auth-field-error">La contraseña es obligatoria</span>
        }
      </div>

      <div class="auth-row-end">
        <button class="auth-link" type="button" (click)="forgot.emit()">¿Olvidaste tu contraseña?</button>
      </div>

      <button class="auth-btn" type="submit" [disabled]="loading()">
        {{ loading() ? 'Ingresando…' : 'Iniciar sesión' }}
      </button>
    </form>

    <div class="auth-back">
      <button class="auth-link" type="button" (click)="register.emit()">¿No tienes cuenta? Crear una</button>
    </div>

    <div class="auth-divider"><span>o continúa con</span></div>

    <div class="auth-google-slot" #googleSlot [hidden]="googleState() !== 'ready'"></div>

    @if (googleState() !== 'ready') {
      <button class="auth-google" type="button" disabled aria-disabled="true">
        <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Continuar con Google
      </button>

      @if (googleState() === 'unconfigured') {
        <p class="auth-hint">Configura GOOGLE_CLIENT_ID en el archivo .env para habilitar el acceso con Google.</p>
      } @else if (googleState() === 'unavailable') {
        <p class="auth-hint">No se pudo cargar Google. Revisa tu conexión e inténtalo de nuevo.</p>
      }
    }

    @if (googleLoading()) {
      <p class="auth-hint">Verificando cuenta de Google…</p>
    }
  `,
  styles: []
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);

  @Output() readonly forgot = new EventEmitter<void>();
  @Output() readonly register = new EventEmitter<void>();

  @ViewChild('googleSlot', { static: true })
  private googleSlot!: ElementRef<HTMLDivElement>;
  private googleTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  readonly loading = signal(false);
  readonly googleLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly googleState = signal<GoogleState>('loading');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  ngAfterViewInit(): void {
    this.initGoogle(0);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.googleTimer) {
      clearTimeout(this.googleTimer);
    }
  }

  showError(control: 'email' | 'password'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
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
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        this.loading.set(false);
        this.error.set(authErrorMessage(err));
      }
    });
  }

  private onGoogleCredential(idToken: string): void {
    this.error.set(null);
    this.googleLoading.set(true);
    this.auth.google({ idToken }).subscribe({
      next: () => this.googleLoading.set(false),
      error: (err) => {
        this.googleLoading.set(false);
        this.error.set(authErrorMessage(err));
      }
    });
  }

  /**
   * Carga Google Identity Services (script agregado en index.html) y renderiza
   * el botón oficial dentro del contenedor. Si no hay client-id configurado o
   * el script no llega a cargar, se deja el botón de respaldo deshabilitado.
   */
  private initGoogle(attempt: number): void {
    if (this.destroyed) {
      return;
    }
    if (!GOOGLE_CLIENT_ID) {
      this.googleState.set('unconfigured');
      return;
    }

    const api = (globalThis as { google?: GoogleIdentityApi }).google?.accounts?.id;
    if (api) {
      api.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => this.zone.run(() => this.onGoogleCredential(response.credential))
      });
      this.googleState.set('ready');
      this.googleTimer = setTimeout(() => {
        if (!this.destroyed) {
          api.renderButton(this.googleSlot.nativeElement, {
            theme: 'outline',
            size: 'large',
            shape: 'rectangular',
            text: 'signin_with',
            width: 320
          });
        }
      }, 0);
      return;
    }

    if (attempt >= GOOGLE_INIT_ATTEMPTS) {
      this.googleState.set('unavailable');
      return;
    }
    this.googleTimer = setTimeout(() => this.initGoogle(attempt + 1), GOOGLE_RETRY_MS);
  }
}
