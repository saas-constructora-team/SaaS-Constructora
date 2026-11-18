import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map, switchMap, of, catchError, filter, takeUntil, finalize } from 'rxjs';
import { AuthService } from './auth.service';
import { InvitationService } from './invitation.service';
import { InvitationPreview } from './invitation.model';

@Component({
  standalone: true, imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `<main class="page-shell"><section class="panel invitation-card" aria-labelledby="accept-title">
    <p class="brand">SaaS Constructora</p><h1 id="accept-title" class="page-title">Aceptar invitación</h1>
    @if (loading()) { <p role="status">Consultando invitación…</p> }
    @if (error()) { <div class="alert alert-error" role="alert">{{ error() }}</div> }
    @if (preview(); as invitation) {
      <dl><dt>Constructora</dt><dd>{{ invitation.companyName }}</dd>
        <dt>Correo invitado</dt><dd>{{ invitation.email }}</dd>
        <dt>Vencimiento</dt><dd>{{ invitation.expiresAt | date:'medium' }}</dd></dl>
      <form [formGroup]="form" (ngSubmit)="accept()" novalidate [attr.aria-busy]="saving()">
        <fieldset [disabled]="saving() || accepted()">
          <legend>Tu cuenta</legend>
          <label class="account-choice"><input type="radio" formControlName="account" value="new"> Necesito definir una contraseña</label>
          <label class="account-choice"><input type="radio" formControlName="account" value="existing"> Ya tengo una cuenta activa</label>
          @if (form.controls.account.value === 'new') {
            <div class="auth-field"><label class="form-label" for="invitation-password">Nueva contraseña</label>
              <input id="invitation-password" class="form-input" type="password" autocomplete="new-password" formControlName="password">
              @if (passwordInvalid()) { <span class="auth-field-error">La contraseña debe tener entre 8 y 100 caracteres.</span> }
            </div>
            <div class="auth-field"><label class="form-label" for="invitation-confirm">Confirmar contraseña</label>
              <input id="invitation-confirm" class="form-input" type="password" autocomplete="new-password" formControlName="confirmPassword">
              @if (form.controls.confirmPassword.touched && passwordsDiffer()) { <span class="auth-field-error">Las contraseñas no coinciden.</span> }
            </div>
          } @else { <p class="muted">Tu contraseña actual se conservará. No necesitas introducirla aquí.</p> }
          @if (auth.session()) {
            <p role="status">Hay una sesión abierta. Aceptar abrirá la cuenta invitada en {{ invitation.companyName }} y reemplazará la sesión actual.</p>
            <label class="account-choice"><input type="checkbox" formControlName="switchSession"> Entiendo que cambiará la sesión activa.</label>
          }
        </fieldset>
        <button class="btn btn-primary" type="submit" [disabled]="saving() || accepted()">{{ saving() ? 'Aceptando…' : 'Aceptar invitación' }}</button>
      </form>
    }
    @if (accepted()) {
      <p class="alert alert-success" role="status">Invitación aceptada. Tu membresía está activa.</p>
      <a class="btn btn-ghost" routerLink="/app/proyectos">Ir a mis proyectos</a>
    }
    <p><a class="auth-link" routerLink="/login">Ir al inicio de sesión</a></p>
  </section></main>`,
  styles: [`.invitation-card { max-width: 640px; margin: 1rem auto; }
    .account-choice { display: block; margin: 1rem 0; } fieldset { border: 0; padding: 0; min-width: 0; }
    dd { margin: .25rem 0 1rem; overflow-wrap: anywhere; }`]
})
export class AcceptInvitationComponent {
  readonly auth = inject(AuthService);
  private readonly api = inject(InvitationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private token = '';
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly accepted = signal(false);
  readonly preview = signal<InvitationPreview | null>(null);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({ account: ['new'],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
    confirmPassword: [''], switchSession: [false] });

  constructor() {
    this.route.queryParamMap.pipe(map(params => params.get('token')?.trim() ?? ''), distinctUntilChanged(),
      switchMap(token => {
        this.token = token; this.saving.set(false); this.preview.set(null); this.error.set(null); this.accepted.set(false);
        this.form.reset({ account: 'new', password: '', confirmPassword: '', switchSession: false });
        this.loading.set(!!token);
        if (!token) { this.error.set('El enlace no contiene una invitación. Solicita uno nuevo.'); return of(null); }
        return this.api.preview(token).pipe(catchError(error => {
          this.error.set(error.status === 400 ? 'La invitación no es válida, ha vencido o ya fue utilizada. Solicita un nuevo enlace.'
            : error.status === 0 ? 'No se pudo conectar. Inténtalo nuevamente.' : 'La invitación no está disponible. Solicita un nuevo enlace.');
          return of(null);
        }));
      }), takeUntilDestroyed(this.destroyRef)).subscribe(preview => {
        this.loading.set(false); this.preview.set(preview);
      });
  }
  passwordsDiffer(): boolean { return this.form.controls.password.value !== this.form.controls.confirmPassword.value; }
  passwordInvalid(): boolean { const c = this.form.controls.password; return c.invalid && c.touched; }

  accept(): void {
    if (!this.token || !this.preview() || this.loading() || this.saving() || this.accepted()) return;
    this.form.markAllAsTouched();
    const values = this.form.getRawValue();
    if (values.account === 'new' && (this.form.controls.password.invalid || this.passwordsDiffer())) return;
    if (this.auth.session() && !values.switchSession) {
      this.error.set('Confirma el cambio de sesión antes de continuar.'); return;
    }
    const token = this.token;
    this.saving.set(true); this.error.set(null);
    this.auth.acceptInvitation({ token, ...(values.account === 'new' ? { password: values.password } : {}) })
      .pipe(takeUntil(this.route.queryParamMap.pipe(filter(params => (params.get('token')?.trim() ?? '') !== token))),
        finalize(() => this.saving.set(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.saving.set(false); this.accepted.set(true);
          this.preview.set(null); this.form.controls.password.reset(); this.form.controls.confirmPassword.reset();
          void this.router.navigateByUrl('/app/proyectos', { replaceUrl: true });
        },
        error: error => {
          this.saving.set(false);
          if (this.token !== token) return;
          this.error.set(error.status === 400
            ? 'No se pudo aceptar. Si tu cuenta es nueva, selecciona definir contraseña. Si el enlace venció o ya fue utilizado, solicita otro.'
            : error.status === 0 ? 'No se pudo conectar. Inténtalo nuevamente.' : 'No se pudo aceptar la invitación. Inténtalo de nuevo.');
        }
      });
  }
}
