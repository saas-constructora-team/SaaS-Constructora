import { Component, inject } from '@angular/core';
import { AuthComponent } from './auth/auth.component';
import { ProjectListComponent } from './projects/project-list.component';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AuthComponent, ProjectListComponent],
  template: `
    @if (auth.session(); as session) {
      <app-project-list [role]="session.user.role" />
    } @else {
      <app-auth />
    }
  `,
  styles: []
})
export class AppComponent {
  readonly auth = inject(AuthService);
}
