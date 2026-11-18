import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionNavigationService } from './core/session-navigation.service';

@Component({
  selector: 'app-root', standalone: true, imports: [RouterOutlet], template: '<router-outlet />'
})
export class AppComponent {
  private readonly sessionNavigation = inject(SessionNavigationService);
}
