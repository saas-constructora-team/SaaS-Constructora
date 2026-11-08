import { Component, Input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from './auth/auth.service';
import { AppComponent } from './app.component';

@Component({ selector: 'app-auth', standalone: true, template: '' })
class AuthStubComponent {}

@Component({ selector: 'app-project-list', standalone: true, template: 'Proyectos' })
class ProjectListStubComponent {
  @Input() role = '';
}

@Component({ selector: 'app-user-management', standalone: true, template: 'Usuarios' })
class UserManagementStubComponent {
  @Input() role = '';
}

describe('AppComponent navigation', () => {
  let fixture: ComponentFixture<AppComponent>;
  let logoutSpy: jasmine.Spy;

  beforeEach(async () => {
    logoutSpy = jasmine.createSpy('logout');
    const auth = {
      session: signal({
        user: { id: 'user', tenantId: 'tenant', email: 'admin@example.com', fullName: 'Admin', role: 'ADMIN' },
        accessToken: 'test-token',
        tokenType: 'Bearer',
        expiresInSeconds: 3600
      }),
      logout: logoutSpy
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: AuthService, useValue: auth }]
    })
      .overrideComponent(AppComponent, {
        set: {
          imports: [AuthStubComponent, ProjectListStubComponent, UserManagementStubComponent]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
  });

  it('switches between users and projects and marks the selected tab active', () => {
    expect(fixture.nativeElement.querySelector('.app-sidebar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.welcome-title').textContent).toContain('Hola, Admin');
    expect(fixture.nativeElement.querySelector('.welcome-title').getAttribute('title')).toBe('Administrador');
    expect(fixture.nativeElement.querySelector('.user-avatar').getAttribute('title')).toBe('Administrador');

    const buttons = fixture.nativeElement.querySelectorAll('.nav-tab') as NodeListOf<HTMLButtonElement>;
    const projectsButton = fixture.nativeElement.querySelector('[aria-label="Proyectos"]') as HTMLButtonElement;
    const usersButton = fixture.nativeElement.querySelector('[aria-label="Usuarios"]') as HTMLButtonElement;
    expect(usersButton.classList).toContain('active');
    expect(fixture.nativeElement.textContent).toContain('Usuarios');

    projectsButton.click();
    fixture.detectChanges();

    expect(projectsButton.classList).toContain('active');
    expect(usersButton.classList).not.toContain('active');
    expect(fixture.nativeElement.textContent).toContain('Proyectos');

    usersButton.click();
    fixture.detectChanges();

    expect(usersButton.classList).toContain('active');
    expect(fixture.nativeElement.textContent).toContain('Usuarios');
    expect(buttons.length).toBe(2);
  });

  it('logs out from the sidebar icon button', () => {
    const logoutButton = fixture.nativeElement.querySelector('.sidebar-logout') as HTMLButtonElement;
    expect(logoutButton.getAttribute('aria-label')).toBe('Cerrar sesión');
    logoutButton.click();
    expect(logoutSpy).toHaveBeenCalled();
  });
});
