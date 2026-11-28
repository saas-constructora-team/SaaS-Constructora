import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import {
  LucideAtSign,
  LucideBuilding2,
  LucideHash,
  LucideIdCard,
  LucideMail,
  LucideMapPin,
  LucidePhone,
  LucideSave,
  LucideShield,
  LucideUser
} from '@lucide/angular';
import { authErrorMessage } from '../auth/auth.service';
import { AuthService } from '../auth/auth.service';
import { AccountProfileResponse } from './account.model';
import { AccountService } from './account.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAtSign,
    LucideBuilding2,
    LucideHash,
    LucideIdCard,
    LucideMail,
    LucideMapPin,
    LucidePhone,
    LucideSave,
    LucideShield,
    LucideUser
  ],
  template: `
    <div class="account-page">
      <header class="account-header">
        <div class="account-header-copy">
          <p class="account-kicker">Configuración</p>
          <h1 class="account-title">Mi cuenta</h1>
          <p class="account-subtitle">
            Administra tu información personal y, si eres dueño del tenant, los datos visibles de la empresa.
          </p>
        </div>
        @if (profile(); as p) {
          <div class="account-header-badge" aria-label="Rol actual">
            <span class="badge-dot" aria-hidden="true"></span>
            <span>{{ roleLabel(p.user.role) }}</span>
          </div>
        }
      </header>

      @if (loading()) {
        <section class="sage-card account-state" aria-live="polite">
          <div class="state-skeleton state-skeleton--title"></div>
          <div class="state-skeleton state-skeleton--line"></div>
          <div class="state-skeleton state-skeleton--line state-skeleton--short"></div>
          <p class="state-text">Cargando información de la cuenta…</p>
        </section>
      } @else if (loadError()) {
        <div class="sage-alert sage-alert--error" role="alert">
          <span class="sage-alert-title">No se pudo cargar la cuenta</span>
          <span>{{ loadError() }}</span>
        </div>
      } @else if (profile(); as p) {
        @if (notice()) {
          <div class="sage-alert sage-alert--success" role="status">
            <span class="sage-alert-title">Cambios guardados</span>
            <span>{{ notice() }}</span>
          </div>
        }
        @if (error()) {
          <div class="sage-alert sage-alert--error" role="alert">
            <span class="sage-alert-title">No se pudo guardar</span>
            <span>{{ error() }}</span>
          </div>
        }

        <div class="account-grid">
          <section class="sage-card account-card" aria-labelledby="profile-title">
            <div class="card-head">
              <div class="card-head-icon" aria-hidden="true">
                <svg lucideUser [size]="20" [strokeWidth]="1.8"></svg>
              </div>
              <div class="card-head-copy">
                <p class="card-eyebrow">Perfil personal</p>
                <h2 id="profile-title" class="card-title">Información personal</h2>
                <p class="card-description">Estos datos identifican tu cuenta dentro del espacio de trabajo.</p>
              </div>
            </div>

            <div class="identity-strip">
              <div class="identity-item">
                <span class="identity-label">
                  <svg lucideMail [size]="14" [strokeWidth]="1.8" aria-hidden="true"></svg>
                  Correo
                </span>
                <span class="identity-value">{{ p.user.email }}</span>
              </div>
              <div class="identity-item">
                <span class="identity-label">
                  <svg lucideShield [size]="14" [strokeWidth]="1.8" aria-hidden="true"></svg>
                  Rol
                </span>
                <span class="identity-value">{{ roleLabel(p.user.role) }}</span>
              </div>
            </div>

            <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" novalidate class="sage-form">
              <div class="field-grid">
                <label class="sage-field">
                  <span class="sage-label">Nombre completo</span>
                  <div class="input-wrap">
                    <span class="input-icon" aria-hidden="true">
                      <svg lucideIdCard [size]="16" [strokeWidth]="1.8"></svg>
                    </span>
                    <input
                      class="sage-input"
                      type="text"
                      formControlName="fullName"
                      maxlength="150"
                      autocomplete="name"
                      [attr.aria-invalid]="profileForm.controls.fullName.touched && profileForm.controls.fullName.invalid ? 'true' : null"
                    />
                  </div>
                  @if (profileForm.controls.fullName.touched && profileForm.controls.fullName.hasError('required')) {
                    <span class="field-error" role="status">El nombre completo es obligatorio.</span>
                  }
                </label>

                <label class="sage-field">
                  <span class="sage-label">Username</span>
                  <div class="input-wrap">
                    <span class="input-icon" aria-hidden="true">
                      <svg lucideAtSign [size]="16" [strokeWidth]="1.8"></svg>
                    </span>
                    <input
                      class="sage-input"
                      type="text"
                      formControlName="username"
                      maxlength="30"
                      placeholder="ej. juan.perez"
                      autocomplete="username"
                      spellcheck="false"
                      [attr.aria-invalid]="profileForm.controls.username.touched && profileForm.controls.username.invalid ? 'true' : null"
                    />
                  </div>
                  <span class="field-hint">3–30 caracteres: letras, números, punto, guion o guion bajo. Se guarda en minúsculas.</span>
                  @if (profileForm.controls.username.touched && profileForm.controls.username.hasError('pattern')) {
                    <span class="field-error" role="status">Usa solo letras, números, punto, guion o guion bajo.</span>
                  }
                </label>
              </div>

              <div class="form-actions">
                <button class="sage-button sage-button--primary" type="submit" [disabled]="savingProfile()">
                  <svg lucideSave [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
                  <span>{{ savingProfile() ? 'Guardando…' : 'Guardar perfil' }}</span>
                </button>
              </div>
            </form>
          </section>

          <section class="sage-card account-card" aria-labelledby="company-title">
            <div class="card-head">
              <div class="card-head-icon" aria-hidden="true">
                <svg lucideBuilding2 [size]="20" [strokeWidth]="1.8"></svg>
              </div>
              <div class="card-head-copy">
                <p class="card-eyebrow">Empresa</p>
                <h2 id="company-title" class="card-title">Información de la empresa</h2>
                <p class="card-description">
                  @if (p.canEditCompany) {
                    Como dueño del tenant, puedes actualizar los datos visibles de la constructora.
                  } @else {
                    Esta información es visible para tu cuenta. Solo el dueño del tenant puede editarla.
                  }
                </p>
              </div>
              @if (p.canEditCompany) {
                <span class="owner-badge">Dueño del tenant</span>
              }
            </div>

            @if (p.canEditCompany) {
              <form [formGroup]="companyForm" (ngSubmit)="saveCompany()" novalidate class="sage-form">
                <div class="field-grid">
                  <label class="sage-field">
                    <span class="sage-label">Razón social</span>
                    <div class="input-wrap">
                      <span class="input-icon" aria-hidden="true"><svg lucideBuilding2 [size]="16" [strokeWidth]="1.8"></svg></span>
                      <input class="sage-input" type="text" formControlName="name" maxlength="100" autocomplete="organization" />
                    </div>
                    @if (companyForm.controls.name.touched && companyForm.controls.name.hasError('required')) {
                      <span class="field-error" role="status">La razón social es obligatoria.</span>
                    }
                  </label>

                  <label class="sage-field">
                    <span class="sage-label">Nombre comercial</span>
                    <div class="input-wrap">
                      <span class="input-icon" aria-hidden="true"><svg lucideBuilding2 [size]="16" [strokeWidth]="1.8"></svg></span>
                      <input class="sage-input" type="text" formControlName="tradeName" maxlength="150" />
                    </div>
                  </label>

                  <label class="sage-field">
                    <span class="sage-label">NIT</span>
                    <div class="input-wrap">
                      <span class="input-icon" aria-hidden="true"><svg lucideHash [size]="16" [strokeWidth]="1.8"></svg></span>
                      <input class="sage-input sage-input--numeric" type="text" formControlName="taxId" maxlength="50" />
                    </div>
                    @if (companyForm.controls.taxId.touched && companyForm.controls.taxId.hasError('required')) {
                      <span class="field-error" role="status">El NIT es obligatorio.</span>
                    }
                  </label>

                  <label class="sage-field">
                    <span class="sage-label">Teléfono de contacto</span>
                    <div class="input-wrap">
                      <span class="input-icon" aria-hidden="true"><svg lucidePhone [size]="16" [strokeWidth]="1.8"></svg></span>
                      <input class="sage-input sage-input--numeric" type="text" formControlName="contactPhone" maxlength="50" autocomplete="tel" />
                    </div>
                  </label>

                  <label class="sage-field sage-field--full">
                    <span class="sage-label">Dirección</span>
                    <div class="input-wrap">
                      <span class="input-icon" aria-hidden="true"><svg lucideMapPin [size]="16" [strokeWidth]="1.8"></svg></span>
                      <input class="sage-input" type="text" formControlName="address" maxlength="255" autocomplete="street-address" />
                    </div>
                    @if (companyForm.controls.address.touched && companyForm.controls.address.hasError('required')) {
                      <span class="field-error" role="status">La dirección es obligatoria.</span>
                    }
                  </label>

                  <label class="sage-field">
                    <span class="sage-label">Correo corporativo</span>
                    <div class="input-wrap">
                      <span class="input-icon" aria-hidden="true"><svg lucideMail [size]="16" [strokeWidth]="1.8"></svg></span>
                      <input class="sage-input" type="email" formControlName="companyEmail" maxlength="255" autocomplete="email" />
                    </div>
                    @if (companyForm.controls.companyEmail.touched && companyForm.controls.companyEmail.hasError('email')) {
                      <span class="field-error" role="status">Ingresa un correo corporativo válido.</span>
                    }
                  </label>
                </div>

                <p class="company-note">El identificador interno de la empresa (slug) se mantiene estable y no se edita desde esta pantalla.</p>

                <div class="form-actions">
                  <button class="sage-button sage-button--primary" type="submit" [disabled]="savingCompany()">
                    <svg lucideSave [size]="16" [strokeWidth]="1.8" aria-hidden="true"></svg>
                    <span>{{ savingCompany() ? 'Guardando…' : 'Guardar empresa' }}</span>
                  </button>
                </div>
              </form>
            } @else {
              <dl class="company-readonly">
                <div class="readonly-item">
                  <dt>Razón social</dt>
                  <dd>{{ p.company.name }}</dd>
                </div>
                <div class="readonly-item">
                  <dt>Nombre comercial</dt>
                  <dd>{{ p.company.tradeName || '—' }}</dd>
                </div>
                <div class="readonly-item">
                  <dt>NIT</dt>
                  <dd class="numeric">{{ p.company.taxId || '—' }}</dd>
                </div>
                <div class="readonly-item">
                  <dt>Teléfono</dt>
                  <dd class="numeric">{{ p.company.contactPhone || '—' }}</dd>
                </div>
                <div class="readonly-item readonly-item--full">
                  <dt>Dirección</dt>
                  <dd>{{ p.company.address || '—' }}</dd>
                </div>
                <div class="readonly-item">
                  <dt>Correo corporativo</dt>
                  <dd>{{ p.company.companyEmail || '—' }}</dd>
                </div>
              </dl>
              <p class="company-note">Solo el dueño del tenant puede editar la información de la empresa.</p>
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      --sage-surface: #FFFFFF;
      --sage-surface-accent: #E6EFEA;
      --sage-canvas: #EAE9E3;
      --sage-text-primary: #201F23;
      --sage-text-secondary: #596269;
      --sage-text-faint: #8F8E96;
      --sage-separator: #D9D9D9;
      --sage-accent: #4C6C5A;
      --sage-accent-strong: #395917;
      --sage-accent-soft: #E6EFEA;
      --sage-status-negative: #98140B;
      --sage-radius-card: 27px;
      --sage-radius-compact: 8px;
      --sage-radius-pill: 9999px;
      --sage-font-display: "General Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --sage-font-numeric: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --sage-font-meta: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    .account-page {
      box-sizing: border-box;
      width: 100%;
      max-width: none;
      min-height: calc(100vh - 88px);
      margin: -20px -28px 0;
      padding: 44px 40px 48px;
      background: var(--sage-canvas);
      color: var(--sage-text-primary);
      font-family: var(--sage-font-display);
    }

    .account-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 24px;
    }

    .account-kicker {
      margin: 0 0 6px;
      color: var(--sage-accent);
      font: 500 12px/normal var(--sage-font-meta);
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .account-title {
      margin: 0;
      color: var(--sage-text-primary);
      font: 500 32px/1.15 var(--sage-font-display);
      letter-spacing: 0;
    }

    .account-subtitle {
      max-width: 720px;
      margin: 8px 0 0;
      color: var(--sage-text-secondary);
      font: 400 16px/1.5 var(--sage-font-display);
      letter-spacing: 0.03em;
    }

    .account-header-badge,
    .owner-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 36px;
      padding: 0 14px;
      border-radius: var(--sage-radius-pill);
      background: var(--sage-accent-soft);
      color: var(--sage-accent-strong);
      font: 500 12px/1.4 var(--sage-font-display);
      letter-spacing: 0.005em;
      white-space: nowrap;
    }

    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--sage-accent);
    }

    .account-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .sage-card {
      box-sizing: border-box;
      padding: 28px;
      border: 1px solid var(--sage-separator);
      border-radius: var(--sage-radius-card);
      background: var(--sage-surface);
    }

    .account-state {
      max-width: 720px;
    }

    .state-skeleton {
      height: 12px;
      margin-bottom: 12px;
      border-radius: 999px;
      background: var(--sage-accent-soft);
    }

    .state-skeleton--title { width: 180px; height: 16px; }
    .state-skeleton--line { width: 100%; max-width: 420px; }
    .state-skeleton--short { width: 100%; max-width: 280px; margin-bottom: 18px; }

    .state-text {
      margin: 0;
      color: var(--sage-text-secondary);
      font: 500 14px/1.4 var(--sage-font-display);
      letter-spacing: 0.01em;
    }

    .sage-alert {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-bottom: 12px;
      padding: 14px 18px;
      border-radius: var(--sage-radius-compact);
      font: 500 14px/1.4 var(--sage-font-display);
    }

    .sage-alert-title {
      font: 600 14px/1.4 var(--sage-font-display);
    }

    .sage-alert--error {
      border: 1px solid rgba(152, 20, 11, 0.28);
      color: var(--sage-status-negative);
      background: #F6ECEA;
    }

    .sage-alert--success {
      border: 1px solid rgba(76, 108, 90, 0.24);
      color: var(--sage-accent-strong);
      background: var(--sage-accent-soft);
    }

    .card-head {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 22px;
    }

    .card-head-icon {
      flex: 0 0 44px;
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      background: var(--sage-accent-soft);
      color: var(--sage-accent);
    }

    .card-head-copy { flex: 1; min-width: 0; }

    .card-eyebrow {
      margin: 0 0 4px;
      color: var(--sage-text-faint);
      font: 500 12px/normal var(--sage-font-meta);
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .card-title {
      margin: 0;
      color: var(--sage-text-primary);
      font: 500 20px/1.3 var(--sage-font-display);
      letter-spacing: 0;
    }

    .card-description {
      margin: 6px 0 0;
      color: var(--sage-text-secondary);
      font: 400 14px/1.5 var(--sage-font-display);
      letter-spacing: 0.01em;
    }

    .identity-strip {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 24px;
      padding: 16px 18px;
      border: 1px solid var(--sage-separator);
      border-radius: 18px;
      background: #FAFAF8;
    }

    .identity-item { min-width: 0; }

    .identity-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      color: var(--sage-text-faint);
      font: 500 12px/1.4 var(--sage-font-display);
    }

    .identity-value {
      display: block;
      color: var(--sage-text-primary);
      font: 500 14px/1.5 var(--sage-font-display);
      overflow-wrap: anywhere;
    }

    .sage-form { display: flex; flex-direction: column; gap: 20px; }

    .field-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px 16px;
    }

    .sage-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }

    .sage-field--full { grid-column: 1 / -1; }

    .sage-label {
      color: var(--sage-text-secondary);
      font: 500 12px/20px var(--sage-font-display);
      letter-spacing: 0;
    }

    .input-wrap {
      position: relative;
      display: block;
    }

    .input-icon {
      position: absolute;
      top: 50%;
      left: 14px;
      display: inline-flex;
      color: var(--sage-text-faint);
      transform: translateY(-50%);
      pointer-events: none;
    }

    .sage-input {
      box-sizing: border-box;
      width: 100%;
      min-height: 44px;
      padding: 10px 14px 10px 42px;
      border: 1px solid var(--sage-separator);
      border-radius: var(--sage-radius-compact);
      color: var(--sage-text-primary);
      background: var(--sage-surface);
      font: 400 14px/1.4 var(--sage-font-display);
      letter-spacing: 0.01em;
      transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
    }

    .sage-input::placeholder { color: var(--sage-text-faint); }

    .sage-input:hover:not(:disabled) {
      border-color: #A4C8AE;
      background: #FCFCFB;
    }

    .sage-input:focus-visible {
      outline: 2px solid var(--sage-accent);
      outline-offset: 2px;
      border-color: var(--sage-accent);
    }

    .sage-input:disabled {
      opacity: 0.65;
      cursor: not-allowed;
      background: #F5F5F3;
    }

    .sage-input--numeric {
      font-family: var(--sage-font-numeric);
      font-variant-numeric: tabular-nums;
    }

    .field-hint {
      color: var(--sage-text-faint);
      font: 500 12px/1.5 var(--sage-font-display);
    }

    .field-error {
      color: var(--sage-status-negative);
      font: 500 12px/1.5 var(--sage-font-display);
    }

    .form-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .sage-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 44px;
      padding: 0 20px;
      border: 1px solid transparent;
      border-radius: var(--sage-radius-pill);
      font: 500 14px/1.4 var(--sage-font-display);
      letter-spacing: 0.03em;
      cursor: pointer;
      transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, opacity 160ms ease;
    }

    .sage-button--primary {
      color: var(--sage-surface);
      background: var(--sage-accent);
    }

    .sage-button--primary:hover:not(:disabled) { background: var(--sage-accent-strong); }
    .sage-button--primary:active:not(:disabled) { background: var(--sage-text-primary); }

    .sage-button:focus-visible {
      outline: 2px solid var(--sage-accent);
      outline-offset: 3px;
    }

    .sage-button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .company-note {
      margin: 0;
      color: var(--sage-text-secondary);
      font: 400 13px/1.5 var(--sage-font-display);
    }

    .company-readonly {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin: 0 0 18px;
    }

    .readonly-item {
      padding: 14px 16px;
      border: 1px solid var(--sage-separator);
      border-radius: 14px;
      background: #FAFAF8;
    }

    .readonly-item--full { grid-column: 1 / -1; }

    .readonly-item dt {
      margin: 0 0 4px;
      color: var(--sage-text-faint);
      font: 500 12px/1.4 var(--sage-font-display);
    }

    .readonly-item dd {
      margin: 0;
      color: var(--sage-text-primary);
      font: 500 14px/1.5 var(--sage-font-display);
      overflow-wrap: anywhere;
    }

    .readonly-item dd.numeric {
      font-family: var(--sage-font-numeric);
      font-variant-numeric: tabular-nums;
    }

    @media (max-width: 1100px) {
      .account-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 720px) {
      .account-page {
        margin: -20px -18px 0;
        padding: 24px 18px 32px;
      }

      .account-header {
        flex-direction: column;
        align-items: stretch;
        margin-bottom: 20px;
      }

      .account-title { font-size: 28px; }

      .sage-card { padding: 22px; }

      .field-grid,
      .identity-strip,
      .company-readonly {
        grid-template-columns: 1fr;
      }

      .sage-field--full,
      .readonly-item--full {
        grid-column: auto;
      }

      .card-head {
        flex-wrap: wrap;
      }

      .owner-badge { margin-left: 58px; }
    }
  `]
})
export class AccountComponent implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly savingProfile = signal(false);
  readonly savingCompany = signal(false);
  readonly profile = signal<AccountProfileResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly loadError = signal<string | null>(null);

  readonly profileForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    username: ['', [Validators.maxLength(30), Validators.pattern(/^[a-zA-Z0-9._-]+$/)]]
  });

  readonly companyForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    tradeName: [''],
    taxId: ['', [Validators.required, Validators.maxLength(50)]],
    contactPhone: [''],
    address: ['', [Validators.required, Validators.maxLength(255)]],
    companyEmail: ['', [Validators.email, Validators.maxLength(255)]]
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.accountService.me().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: profile => this.applyProfile(profile),
      error: err => this.loadError.set(authErrorMessage(err))
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.savingProfile()) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const raw = this.profileForm.getRawValue();
    const username = raw.username.trim();
    this.savingProfile.set(true); this.error.set(null); this.notice.set(null);
    this.accountService.updateProfile({
      fullName: raw.fullName.trim(),
      username: username ? username.toLowerCase() : null
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.savingProfile.set(false))).subscribe({
      next: profile => {
        this.applyProfile(profile);
        this.auth.patchSessionUser({ fullName: profile.user.fullName, username: profile.user.username ?? undefined });
        this.notice.set('Perfil actualizado correctamente.');
      },
      error: err => this.error.set(authErrorMessage(err))
    });
  }

  saveCompany(): void {
    if (this.companyForm.invalid || this.savingCompany()) {
      this.companyForm.markAllAsTouched();
      return;
    }
    const raw = this.companyForm.getRawValue();
    this.savingCompany.set(true); this.error.set(null); this.notice.set(null);
    this.accountService.updateCompany({
      name: raw.name.trim(),
      tradeName: raw.tradeName.trim() || null,
      taxId: raw.taxId.trim(),
      contactPhone: raw.contactPhone.trim() || null,
      address: raw.address.trim(),
      companyEmail: raw.companyEmail.trim() || null
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.savingCompany.set(false))).subscribe({
      next: company => {
        const current = this.profile();
        if (current) this.profile.set({ ...current, company });
        this.notice.set('Información de la empresa actualizada correctamente.');
      },
      error: err => this.error.set(authErrorMessage(err))
    });
  }

  roleLabel(role: string): string {
    switch (role) { case 'ADMIN': return 'Administrador'; case 'MEMBER': return 'Miembro'; case 'WORKER': return 'Trabajador'; default: return role; }
  }

  private applyProfile(profile: AccountProfileResponse): void {
    this.profile.set(profile);
    this.profileForm.patchValue({ fullName: profile.user.fullName, username: profile.user.username ?? '' });
    const c = profile.company;
    this.companyForm.patchValue({
      name: c.name ?? '', tradeName: c.tradeName ?? '', taxId: c.taxId ?? '',
      contactPhone: c.contactPhone ?? '', address: c.address ?? '', companyEmail: c.companyEmail ?? ''
    });
  }
}
