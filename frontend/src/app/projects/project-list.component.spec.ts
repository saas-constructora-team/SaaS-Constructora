import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ProjectStageProgressService } from './project-stage-progress.service';
import { Project, ProjectStage } from './project.model';
import { ProjectService } from './project.service';
import { ProjectListComponent } from './project-list.component';

describe('ProjectListComponent', () => {
  let fixture: ComponentFixture<ProjectListComponent>;
  let projectService: jasmine.SpyObj<ProjectService>;
  let stageProgress: jasmine.SpyObj<ProjectStageProgressService>;

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
    { id: 'stage-3', projectId: 'active-first', name: 'Entrega', order: 3, createdAt: '' }
  ];

  beforeEach(async () => {
    projectService = jasmine.createSpyObj<ProjectService>('ProjectService', ['list', 'listStages']);
    stageProgress = jasmine.createSpyObj<ProjectStageProgressService>(
      'ProjectStageProgressService',
      ['stageId', 'select', 'clear']
    );
    projectService.list.and.returnValue(of([activeFirst, activeFinal, completed]));
    projectService.listStages.and.callFake(projectId =>
      of(stages.map(stage => ({ ...stage, projectId })))
    );
    stageProgress.stageId.and.callFake(projectId =>
      projectId === activeFirst.id ? 'stage-2' : projectId === activeFinal.id ? 'stage-3' : null
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
    expect(fixture.nativeElement.querySelectorAll('.kpi-value')[0].textContent.trim()).toBe('2');
    expect(fixture.nativeElement.querySelectorAll('.kpi-value')[1].textContent.trim()).toBe('1');
    expect(fixture.nativeElement.querySelectorAll('.kpi-value')[2].textContent.trim()).toBe('83%');
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
