import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { RealtimeService } from '../core/realtime.service';
import { ProjectChangeEvent } from './project.model';
import { ProjectService } from './project.service';
import { ProjectStagesComponent } from './project-stages.component';

describe('ProjectStagesComponent', () => {
  let fixture: ComponentFixture<ProjectStagesComponent>;
  let projectService: jasmine.SpyObj<ProjectService>;
  let realtime: jasmine.SpyObj<RealtimeService>;

  const changeEvent = (projectId: string, section: ProjectChangeEvent['section']): ProjectChangeEvent => ({
    eventId: 'event-1',
    tenantId: 'tenant',
    projectId,
    section,
    entityId: 'stage-1',
    actorUserId: null,
    occurredAt: '2026-11-27T10:00:00'
  });

  beforeEach(async () => {
    projectService = jasmine.createSpyObj<ProjectService>('ProjectService', ['listStages']);
    projectService.listStages.and.returnValue(of([]));
    realtime = jasmine.createSpyObj<RealtimeService>('RealtimeService', ['changes']);
    realtime.changes.and.returnValue(() => {});

    await TestBed.configureTestingModule({
      imports: [ProjectStagesComponent],
      providers: [
        { provide: ProjectService, useValue: projectService },
        { provide: RealtimeService, useValue: realtime }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectStagesComponent);
    fixture.componentRef.setInput('projectId', 'project-1');
    fixture.detectChanges();
  });

  it('recarga las etapas ante STAGE/PROJECT del proyecto y agrupa los avisos', fakeAsync(() => {
    projectService.listStages.calls.reset();
    const handler = realtime.changes.calls.mostRecent().args[0] as
      (event: ProjectChangeEvent) => void;

    handler(changeEvent('project-1', 'STAGE'));
    handler(changeEvent('project-1', 'PROJECT'));
    tick(150);

    expect(projectService.listStages).toHaveBeenCalledTimes(1);
  }));

  it('ignora eventos de otro proyecto', fakeAsync(() => {
    projectService.listStages.calls.reset();
    const handler = realtime.changes.calls.mostRecent().args[0] as
      (event: ProjectChangeEvent) => void;

    handler(changeEvent('project-2', 'STAGE'));
    tick(150);

    expect(projectService.listStages).not.toHaveBeenCalled();
  }));

  it('recarga al reconectar el canal SSE', fakeAsync(() => {
    projectService.listStages.calls.reset();
    const onConnected = realtime.changes.calls.mostRecent().args[2] as () => void;

    onConnected();

    expect(projectService.listStages).not.toHaveBeenCalled();
    tick(150);
    expect(projectService.listStages).toHaveBeenCalled();
  }));

  it('cierra la suscripción al destruirse', () => {
    const stop = jasmine.createSpy('stop');
    realtime.changes.and.returnValue(stop);
    fixture.componentRef.setInput('projectId', 'project-2');
    fixture.detectChanges();

    fixture.componentInstance.ngOnDestroy();

    expect(stop).toHaveBeenCalled();
  });
});
