import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Task, TaskBoard } from './task.model';
import { taskErrorMessage, TaskService } from './task.service';

describe('TaskService', () => {
  let api: TaskService;
  let http: HttpTestingController;

  const board: TaskBoard = { stages: [], tasks: [], truncated: false };
  const task: Task = {
    id: 'task-1', projectId: 'project-1', title: 'Nueva tarea', description: null,
    status: {
      id: 'status-1', name: 'Pendiente', color: '#EF4444', order: 1,
      isDefault: true, isSystem: false
    },
    area: null, assignee: null, validator: null, fechaFinPrevista: null,
    areaDetails: null, createdBy: 'user-1', createdAt: '2026-11-27T10:00:00', stageId: null
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(TaskService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the global board in one request', () => {
    api.getBoard().subscribe(result => expect(result).toEqual(board));
    const req = http.expectOne('/api/tasks/board');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush(board);
  });

  it('sends the optional project filter', () => {
    api.getBoard('project-1').subscribe(result => expect(result).toEqual(board));
    const req = http.expectOne(request =>
      request.url === '/api/tasks/board' && request.params.get('projectId') === 'project-1');
    expect(req.request.method).toBe('GET');
    req.flush(board);
  });

  it('creates a task in the selected project and stage', () => {
    api.create('project-1', {
      title: 'Nueva tarea', description: null, statusId: null, areaId: null,
      assigneeUserId: null, validatorUserId: null, fechaFinPrevista: null,
      areaDetails: null, stageId: 'stage-1'
    }).subscribe(result => expect(result).toEqual(task));

    const req = http.expectOne('/api/projects/project-1/tasks');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.stageId).toBe('stage-1');
    req.flush(task);
  });

  it('moves a task to another stage', () => {
    api.moveToStage('task-1', { stageId: 'stage-2' })
      .subscribe(result => expect(result.stageId).toBe('stage-2'));

    const req = http.expectOne('/api/tasks/task-1/stage');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ stageId: 'stage-2' });
    req.flush({ ...task, stageId: 'stage-2' });
  });

  it('sends a null stage to leave a task without stage', () => {
    api.moveToStage('task-1', { stageId: null }).subscribe();
    const req = http.expectOne('/api/tasks/task-1/stage');
    expect(req.request.body).toEqual({ stageId: null });
    req.flush(task);
  });

  it('translates HTTP failures without exposing backend internals', () => {
    expect(taskErrorMessage(new HttpErrorResponse({ status: 404,
      error: { message: 'Proyecto no encontrado' } }))).toBe('Proyecto no encontrado');
    expect(taskErrorMessage(new HttpErrorResponse({ status: 403 })))
      .toContain('No tienes permiso');
    expect(taskErrorMessage(new HttpErrorResponse({ status: 409 })))
      .toContain('conflicto');
    expect(taskErrorMessage(new HttpErrorResponse({ status: 0 })))
      .toContain('No se pudo conectar');
  });
});
