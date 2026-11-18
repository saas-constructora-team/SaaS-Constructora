import { CommonModule } from '@angular/common';
import { Component, inject, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { safeReturnUrl } from '../core/navigation.utils';
import { AuthService } from './auth.service';
import { LoginComponent } from './login.component';
import { RegisterComponent } from './register.component';
import { ForgotPasswordComponent } from './forgot-password.component';
import { ResetPasswordComponent } from './reset-password.component';


/** Public authentication layout; the route selects the existing form. */
@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, LoginComponent, RegisterComponent, ForgotPasswordComponent, ResetPasswordComponent],
  template: `
    <div class="auth-layout" [class.auth-layout--register]="view === 'register'">
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
            @switch (view) {
              @case ('login') {
                <app-login (forgot)="navigate('/recuperar-password')" (register)="navigate('/registro')"></app-login>
              }
              @case ('register') {
                <app-register (back)="navigate('/login')"></app-register>
              }
              @case ('forgot') {
                <app-forgot-password (back)="navigate('/login')"></app-forgot-password>
              }
              @case ('reset') {
                <app-reset-password [token]="resetToken" (done)="onResetDone()"></app-reset-password>
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly data = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  private readonly query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  get view(): string { return this.data()['view'] as string; }
  get resetToken(): string { return this.view === 'reset' ? this.query().get('token') ?? '' : ''; }

  constructor() {
    effect(() => {
      if (this.auth.session() && (this.view === 'login' || this.view === 'register')) {
        void this.router.navigateByUrl(safeReturnUrl(this.query().get('returnUrl')), { replaceUrl: true });
      }
    });
  }

  navigate(path: string): void {
    void this.router.navigate([path], { queryParams: { returnUrl: this.query().get('returnUrl') } });
  }

  onResetDone(): void {
    void this.router.navigate(['/login'], { replaceUrl: true });
  }
}
