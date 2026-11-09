import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ProjectStageProgressService } from './project-stage-progress.service';
import { Project, ProjectAssignment, ProjectStage } from './project.model';
import { ProjectService } from './project.service';
import { ProjectListComponent } from './project-list.component';
import { UserService } from '../users/user.service';

describe('ProjectListComponent', () => {
  let fixture: ComponentFixture<ProjectListComponent>;
  let projectService: jasmine.SpyObj<ProjectService>;
  let stageProgress: jasmine.SpyObj<ProjectStageProgressService>;
  let userService: jasmine.SpyObj<UserService>;

  const activeFirst: Project = {
    id: 'active-first',
    tenantId: 'tenant',
    name: 'Proyecto Uno',
    clientName: null,
    location: null,
    contactEmail: null,
    contactPhone: null,
    projectType: null,
    propertyUse: null,
    estimatedArea: null,
    occupantCount: null,
    requiredSpaces: null,
    styleReferences: null,
    budgetRange: null,
    estimatedStartDate: null,
    estimatedDeliveryDate: null,
    lotOwnership: null,
    hasDeeds: false,
    hasTopographicSurvey: false,
    hasPreviousPlans: false,
    hasSitePhotos: false,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z'
  };

  const activeFinal: Project = { ...activeFirst, id: 'active-final', name: 'Proyecto Dos' };
  const completed: Project = { ...activeFirst, id: 'completed', status: 'COMPLETED' };

  const stages: ProjectStage[] = [
    { id: 'stage-1', projectId: 'active-first', name: 'Diseño', order: 1, createdAt: '' },
    { id: 'stage-2', projectId: 'active-first', name: 'Construcción', order: 2, createdAt: '' },
    { id: 'stage-3', projectId: 'active-first', name: 'Estructura', order: 3, createdAt: '' },
    { id: 'stage-4', projectId: 'active-first', name: 'Acabados', order: 4, createdAt: '' },
    { id: 'stage-5', projectId: 'active-first', name: 'Inspección', order: 5, createdAt: '' },
    { id: 'stage-6', projectId: 'active-first', name: 'Cierre, Liquidación y Entrega', order: 6, createdAt: '' }
  ];

  const assignment: ProjectAssignment = {
    id: 'assignment-1',
    projectId: activeFirst.id,
    userId: 'user-2',
    userFullName: 'Ana Gómez',
    userEmail: 'ana@example.com',
    userRole: 'MEMBER',
    assignedAt: '2026-01-02T00:00:00Z'
  };

  beforeEach(async () => {
    projectService = jasmine.createSpyObj<ProjectService>(
      'ProjectService',
      ['list', 'listStages', 'listAssignments']
    );
    stageProgress = jasmine.createSpyObj<ProjectStageProgressService>(
      'ProjectStageProgressService',
      ['stageId', 'select', 'clear']
    );
    userService = jasmine.createSpyObj<UserService>('UserService', ['list']);
    projectService.list.and.returnValue(of([activeFirst, activeFinal, completed]));
    projectService.listStages.and.callFake(projectId =>
      of(stages.map(stage => ({ ...stage, projectId })))
    );
    projectService.listAssignments.and.callFake(projectId =>
      of(projectId === activeFirst.id ? [assignment] : [])
    );
    userService.list.and.returnValue(of([]));
    stageProgress.stageId.and.callFake(projectId =>
      projectId === activeFirst.id ? 'stage-2' : projectId === activeFinal.id ? 'stage-6' : null
    );

    const auth = {
      session: signal({
        user: { id: 'user', tenantId: 'tenant', email: 'admin@example.com', fullName: 'Admin', role: 'ADMIN' },
        accessToken: 'test-token',
        tokenType: 'Bearer',
        expiresInSeconds: 3600
      }),
      logout: jasmine.createSpy('logout')
    };

    await TestBed.configureTestingModule({
      imports: [ProjectListComponent],
      providers: [
        { provide: ProjectService, useValue: projectService },
        { provide: ProjectStageProgressService, useValue: stageProgress },
        { provide: UserService, useValue: userService },
        { provide: AuthService, useValue: auth }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectListComponent);
    fixture.componentInstance.role = 'ADMIN';
  });

  it('shows KPI values based on active projects and selected stages', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.kpi-card').length).toBe(3);
    expect(fixture.nativeElement.querySelector('.kpi-grid').textContent).toContain('Proyectos Activos');
    expect(fixture.nativeElement.querySelectorAll('.kpi-value')[0].textContent.trim()).toBe('1');
    expect(fixture.nativeElement.querySelectorAll('.kpi-value')[1].textContent.trim()).toBe('1');
    expect(fixture.nativeElement.querySelectorAll('.kpi-value')[2].textContent.trim()).toBe('33%');
  });

  it('shows completed when the selected stage is number six', () => {
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows[1].querySelector('.status-completed').textContent.trim()).toBe('Completado');
    expect(fixture.componentInstance.projectStatus(activeFinal)).toBe('COMPLETED');
    expect(activeFinal.status).toBe('ACTIVE');
  });

  it('shows assigned users in the project row for administrators', () => {
    fixture.detectChanges();

    const headerCells = fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLTableCellElement>;
    const headers = Array.from(headerCells, header => header.textContent?.trim() ?? '');
    expect(headers).toContain('Asignado a');
    expect(fixture.nativeElement.querySelector('tbody tr').textContent).toContain('Ana Gómez');
    expect(projectService.listAssignments).toHaveBeenCalledWith(activeFirst.id);
  });

  it('keeps Edit visible and lists the other actions vertically in an accessible menu', () => {
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const openAssignments = spyOn(component, 'openAssignments').and.callThrough();
    const row = fixture.nativeElement.querySelector('tbody tr') as HTMLTableRowElement;
    const trigger = row.querySelector('.more-actions-trigger') as HTMLButtonElement;
    const menu = row.querySelector('.action-menu') as HTMLElement;

    expect(menu.matches(':popover-open')).toBeFalse();
    const editActions = row.querySelectorAll('.quick-action');
    expect(editActions.length).toBe(1);
    expect((editActions[0] as HTMLButtonElement).textContent?.trim()).toBe('Editar');

    trigger.click();
    fixture.detectChanges();

    expect(menu.matches(':popover-open')).toBeTrue();
    expect(getComputedStyle(menu).display).toBe('flex');
    expect(getComputedStyle(menu).flexDirection).toBe('column');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    const menuItems = Array.from(menu.querySelectorAll('[role="menuitem"]')) as HTMLButtonElement[];
    expect(menuItems.map(item => item.textContent?.trim())).toEqual(['Etapas', 'Asignar', 'Eliminar']);
    const deleteAction = menu.querySelector('[role="menuitem"].action-menu-danger') as HTMLButtonElement;
    expect(deleteAction.textContent?.trim()).toBe('Eliminar');

    menuItems[1].click();
    fixture.detectChanges();

    expect(openAssignments).toHaveBeenCalledWith(activeFirst);
    expect(component.assigning()).toEqual(activeFirst);
    expect(menu.matches(':popover-open')).toBeFalse();
  });

  it('renders the current stage as a styled dropdown and stores a selection', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('select.stage-select')).toBeNull();
    expect(fixture.nativeElement.querySelector('.stage-trigger').textContent).toContain('2. Construcción');

    const stageMenu = fixture.nativeElement.querySelector('.stage-options') as HTMLElement;
    expect(stageMenu.matches(':popover-open')).toBeFalse();
    expect(getComputedStyle(stageMenu).display).toBe('none');

    const trigger = fixture.nativeElement.querySelector('.stage-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    expect(stageMenu.matches(':popover-open')).toBeTrue();
    expect(getComputedStyle(stageMenu).position).toBe('fixed');
    expect(getComputedStyle(stageMenu).overflowY).toBe('visible');

    trigger.click();
    fixture.detectChanges();
    expect(stageMenu.matches(':popover-open')).toBeFalse();
    expect(getComputedStyle(stageMenu).display).toBe('none');

    trigger.click();
    fixture.detectChanges();
    expect(stageMenu.matches(':popover-open')).toBeTrue();

    fixture.nativeElement.querySelector('.page-title').click();
    fixture.detectChanges();
    expect(stageMenu.matches(':popover-open')).toBeFalse();

    trigger.click();
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll('.stage-option');
    options[0].click();
    fixture.detectChanges();

    expect(stageProgress.select).toHaveBeenCalledWith(activeFirst.id, 'stage-1');
    expect(fixture.componentInstance.notice()).toContain('Diseño');
  });
});
