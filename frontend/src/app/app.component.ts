import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProjectService } from './projects/project.service';
import { Project, CreateProjectRequest } from './projects/project.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div style="max-width: 800px; margin: 2rem auto; padding: 1rem;">
      <h1>Proyectos</h1>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" style="margin-bottom: 2rem; display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label for="name">Nombre *</label>
          <input id="name" type="text" formControlName="name" style="width: 100%; padding: 0.5rem;">
          @if (form.get('name')?.invalid && form.get('name')?.touched) {
            <span style="color: red; font-size: 0.875rem;">El nombre es obligatorio</span>
          }
        </div>

        <div>
          <label for="clientName">Cliente</label>
          <input id="clientName" type="text" formControlName="clientName" style="width: 100%; padding: 0.5rem;">
        </div>

        <div>
          <label for="location">Ubicación</label>
          <input id="location" type="text" formControlName="location" style="width: 100%; padding: 0.5rem;">
        </div>

        <button type="submit" [disabled]="form.invalid" style="padding: 0.75rem; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Crear proyecto
        </button>
      </form>

      <h2>Lista de proyectos</h2>
      @if (projects.length === 0) {
        <p>No hay proyectos registrados.</p>
      } @else {
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 0.5rem; text-align: left; border: 1px solid #ddd;">Nombre</th>
              <th style="padding: 0.5rem; text-align: left; border: 1px solid #ddd;">Cliente</th>
              <th style="padding: 0.5rem; text-align: left; border: 1px solid #ddd;">Ubicación</th>
              <th style="padding: 0.5rem; text-align: left; border: 1px solid #ddd;">Estado</th>
              <th style="padding: 0.5rem; text-align: left; border: 1px solid #ddd;">Creado</th>
            </tr>
          </thead>
          <tbody>
            @for (p of projects; track p.id) {
              <tr>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">{{ p.name }}</td>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">{{ p.clientName }}</td>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">{{ p.location }}</td>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">{{ p.status }}</td>
                <td style="padding: 0.5rem; border: 1px solid #ddd;">{{ p.createdAt }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);

  form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    clientName: ['', [Validators.maxLength(200)]],
    location: ['', [Validators.maxLength(300)]]
  });

  projects: Project[] = [];

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.projectService.list().subscribe({
      next: (projects) => this.projects = projects,
      error: (err) => console.error('Error cargando proyectos', err)
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      const req: CreateProjectRequest = {
        name: this.form.value.name!,
        clientName: this.form.value.clientName!,
        location: this.form.value.location!
      };
      this.projectService.create(req).subscribe({
        next: () => {
          this.form.reset();
          this.loadProjects();
        },
        error: (err) => console.error('Error creando proyecto', err)
      });
    } else {
      this.form.markAllAsTouched();
    }
  }
}