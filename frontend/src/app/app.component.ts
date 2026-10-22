import { Component } from '@angular/core';
import { AuthComponent } from './auth/auth.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AuthComponent],
  template: `<app-auth />`,
  styles: []
})
export class AppComponent {}
