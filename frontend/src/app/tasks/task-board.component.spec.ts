import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RealtimeService } from '../core/realtime.service';
import { Project, ProjectChangeEvent } from '../projects/project.model';
import { ProjectService } from '../projects/project.service';
import { Task, TaskBoard } from './task.model';
import { TaskBoardComponent } from './task-board.component';
import { TaskService } from './task.service';

describe('TaskBoardComponent', () => {
  let fixture: ComponentFixture<TaskBoardComponent>;
  let component: TaskBoardComponent;
  const taskService = jasmine.createSpyObj<TaskService>('TaskService',
    ['getBoard', 'create', 'moveToStage', 'listStatuses', 'listAreas']);
  const projectService = jasmine.createSpyObj<ProjectService>('ProjectService',
    ['list', 'listAssignments', 'updateStageColors']);
  const realtimeService = jasmine.createSpyObj<RealtimeService>('RealtimeService', ['changes']);

  const stageChanged = (projectId: string): ProjectChangeEvent => ({
    eventId: 'event-1',
    tenantId: 'tenant-1',
    projectId,
    section: 'STAGE',
    entityId: 'stage-1',
    actorUserId: null,
    occurredAt: '2026-11-27T10:00:00'
  });

  const task = (
    id: string,
    title: string,
    stageId: string | null,
    statusName = 'Pendiente'
  ): Task => ({
    id,
    projectId: 'project-1',
    title,
    description: null,
    status: {
      id: 'status-1', name: statusName, color: '#EF4444', order: 1,
      isDefault: true, isSystem: false
    },
    area: null,
    assignee: null,
    validator: null,
    fechaFinPrevista: null,
    areaDetails: null,
    createdBy: 'user-1',
    createdAt: '2026-11-27T10:00:00',
    stageId
  });

  const board: TaskBoard = {
    stages: [
      { id: 'stage-1', projectId: 'project-1', name: 'Cimentación', order: 1, color: 'SAGE', closed: false },
      { id: 'stage-2', projectId: 'project-2', name: 'Cimentación', order: 2, color: 'SAGE', closed: false },
      { id: 'stage-3', projectId: 'project-1', name: 'Estructura', order: 3, color: 'SAGE', closed: false }
    ],
    tasks: [
      task('task-1', 'Colocar encofrado', 'stage-1'),
      task('task-2', 'Revisar planos', 'stage-3'),
      task('task-3', 'Tarea sin etapa', null)
    ],
    truncated: false
  };

  beforeEach(async () => {
    taskService.getBoard.and.returnValue(of(board));
    taskService.create.and.returnValue(of(task('created', 'Nueva tarea', null)));
    taskService.moveToStage.and.returnValue(of(task('task-1', 'Colocar encofrado', null)));
    taskService.listStatuses.and.returnValue(of([]));
    taskService.listAreas.and.returnValue(of([]));
    projectService.listAssignments.and.returnValue(of([]));
    projectService.list.and.returnValue(of([
      { id: 'project-1', name: 'Obra Norte' },
      { id: 'project-2', name: 'Obra Sur' }
    ] as unknown as Project[]));
    projectService.updateStageColors.and.returnValue(of(undefined));
    realtimeService.changes.and.returnValue(() => undefined);

    await TestBed.configureTestingModule({
      imports: [TaskBoardComponent],
      providers: [
        { provide: TaskService, useValue: taskService },
        { provide: ProjectService, useValue: projectService },
        { provide: RealtimeService, useValue: realtimeService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('groups stages with the same name into one column', () => {
    const columns = component.columns();
    expect(columns.map(column => column.name))
      .toEqual(['Cimentación', 'Estructura', 'Sin etapa']);
    expect(columns[0].stages.length).toBe(2);
    expect(columns[0].tasks.map(item => item.id)).toEqual(['task-1']);
    expect(columns[2].tasks.map(item => item.id)).toEqual(['task-3']);
  });

  it('shows the project name on each card', () => {
    expect(component.projectName('project-2')).toBe('Obra Sur');
    expect(component.projectName('unknown')).toBe('Proyecto');
  });

  it('translates the status name into a Sage tone', () => {
    expect(component.statusTone(task('x', 'Hecho', null, 'Hecho'))).toBe('positive');
    expect(component.statusTone(task('x', 'En curso', null, 'En curso'))).toBe('progress');
    expect(component.statusTone(task('x', 'Otro', null, 'Otro'))).toBe('neutral');
  });

  it('requests only the selected project when the filter changes', () => {
    taskService.getBoard.calls.reset();
    component.onProjectChange({ target: { value: 'project-2' } } as unknown as Event);
    expect(component.selectedProjectId()).toBe('project-2');
    expect(taskService.getBoard).toHaveBeenCalledWith('project-2');
  });

  it('filters cards by search term without losing columns', () => {
    component.onSearch({ target: { value: 'planos' } } as unknown as Event);
    const columns = component.columns();
    expect(columns.length).toBe(3);
    expect(columns.flatMap(column => column.tasks).map(item => item.id)).toEqual(['task-2']);
  });

  it('creates a task in the stage of the selected column', () => {
    const column = component.columns()[0];
    component.openAdd(column);
    expect(component.newProjectId()).toBe('project-1');

    component.onNewTitle({ target: { value: 'Nueva tarea' } } as unknown as Event);
    component.submitAdd(column, { preventDefault: () => undefined } as Event);

    expect(taskService.create).toHaveBeenCalledWith('project-1', jasmine.objectContaining({
      title: 'Nueva tarea', stageId: 'stage-1'
    }));
    expect(component.addingIn()).toBeNull();
  });

  it('creates a task without stage from the empty column', () => {
    component.openAdd(component.emptyColumn);
    component.onNewTitle({ target: { value: 'Tarea suelta' } } as unknown as Event);
    component.submitAdd(component.emptyColumn, { preventDefault: () => undefined } as Event);

    expect(taskService.create).toHaveBeenCalledWith('project-1', jasmine.objectContaining({
      title: 'Tarea suelta', stageId: null
    }));
  });

  it('moves a dropped task to the stage of its own project', () => {
    const target = component.columns()[1];
    component.onDrop(
      { preventDefault: () => undefined, dataTransfer: { getData: () => 'task-1' } } as unknown as DragEvent,
      target
    );

    expect(taskService.moveToStage).toHaveBeenCalledWith('task-1', { stageId: 'stage-3' });
  });

  it('moves a dropped task to the no-stage column', () => {
    const target = component.columns()[2];
    component.onDrop(
      { preventDefault: () => undefined, dataTransfer: { getData: () => 'task-1' } } as unknown as DragEvent,
      target
    );

    expect(taskService.moveToStage).toHaveBeenCalledWith('task-1', { stageId: null });
  });

  it('offers a keyboard alternative to move a task', () => {
    component.onTaskStageChange(
      { target: { value: component.noStageKey } } as unknown as Event,
      task('task-1', 'Colocar encofrado', 'stage-1')
    );
    expect(taskService.moveToStage).toHaveBeenCalledWith('task-1', { stageId: null });
  });

  it('excludes closed stages from the add-task project list', () => {
    component.board.set({
      stages: [
        { id: 'stage-closed', projectId: 'project-2', name: 'Cimentación', order: 2, color: 'SAGE', closed: true }
      ],
      tasks: [],
      truncated: false
    });
    const column = component.columns()[0];
    expect(column.stages.length).toBe(1);
    expect(component.addProjects(column)).toEqual([]);
  });

  it('recarga el tablero cuando SSE avisa de un cambio de etapa visible', fakeAsync(() => {
    taskService.getBoard.calls.reset();
    const handler = realtimeService.changes.calls.mostRecent().args[0] as
      (event: ProjectChangeEvent) => void;

    handler(stageChanged('project-1'));

    expect(taskService.getBoard).not.toHaveBeenCalled();
    tick(150);
    expect(taskService.getBoard).toHaveBeenCalledWith(null);
  }));

  it('ignora el SSE de otro proyecto cuando hay un filtro activo', fakeAsync(() => {
    component.onProjectChange({ target: { value: 'project-1' } } as unknown as Event);
    taskService.getBoard.calls.reset();
    const handler = realtimeService.changes.calls.mostRecent().args[0] as
      (event: ProjectChangeEvent) => void;

    handler(stageChanged('project-2'));
    tick(150);

    expect(taskService.getBoard).not.toHaveBeenCalled();
  }));

  it('guarda el color de todas las etapas de la columna en una sola petición', () => {
    const column = component.columns()[0];
    projectService.updateStageColors.calls.reset();

    component.setStageColor(column, 'TOSCA');

    expect(projectService.updateStageColors).toHaveBeenCalledWith({
      stages: [
        { projectId: 'project-1', stageId: 'stage-1', color: 'TOSCA' },
        { projectId: 'project-2', stageId: 'stage-2', color: 'TOSCA' }
      ]
    });
    expect(component.colorSaving()).toBeNull();
  });

  it('recarga el estado real del servidor si falla el guardado del color', () => {
    const column = component.columns()[0];
    projectService.updateStageColors.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })));
    taskService.getBoard.calls.reset();

    component.setStageColor(column, 'TOSCA');

    expect(component.actionError()).not.toBeNull();
    expect(component.colorSaving()).toBeNull();
    expect(taskService.getBoard).toHaveBeenCalled();
  });

  it('agrupa varios avisos de etapa en una sola recarga', fakeAsync(() => {
    taskService.getBoard.calls.reset();
    const handler = realtimeService.changes.calls.mostRecent().args[0] as
      (event: ProjectChangeEvent) => void;

    handler(stageChanged('project-1'));
    handler(stageChanged('project-2'));
    tick(150);

    expect(taskService.getBoard).toHaveBeenCalledTimes(1);
  }));

  it('recarga el tablero cuando el canal SSE se reconecta', fakeAsync(() => {
    taskService.getBoard.calls.reset();
    const onConnected = realtimeService.changes.calls.mostRecent().args[2] as () => void;

    onConnected();

    expect(taskService.getBoard).not.toHaveBeenCalled();
    tick(150);
    expect(taskService.getBoard).toHaveBeenCalled();
  }));

  it('cierra la suscripción SSE al destruirse', () => {
    const stop = jasmine.createSpy('stop');
    realtimeService.changes.and.returnValue(stop);
    (component as unknown as { watchRealtime(): void }).watchRealtime();

    component.ngOnDestroy();

    expect(stop).toHaveBeenCalled();
  });
});
