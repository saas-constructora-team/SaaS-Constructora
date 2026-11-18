import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Real not-found page, also used until a future invitation route is implemented. */
@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<main class="page-shell"><section class="empty-state">
    <h1 class="panel-title">Página no disponible</h1>
    <p class="muted">Esta dirección no está disponible. Revisa el enlace o vuelve al inicio.</p>
    <a class="btn btn-ghost" routerLink="/login">Volver al inicio</a>
  </section></main>`
})
export class NavigationMessageComponent {}
