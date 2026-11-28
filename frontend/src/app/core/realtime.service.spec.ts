import { signal } from '@angular/core';
import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { ProjectChangeEvent } from '../projects/project.model';
import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  let service: RealtimeService;
  let fetchSpy: jasmine.Spy<typeof window.fetch>;

  const event = (projectId: string, section: ProjectChangeEvent['section'] = 'STAGE'): ProjectChangeEvent => ({
    eventId: 'event-1',
    tenantId: 'tenant-1',
    projectId,
    section,
    entityId: 'stage-1',
    actorUserId: null,
    occurredAt: '2026-11-27T10:00:00'
  });

  // Un lector con Promises normales: se pueden drenar desde `fakeAsync`, a
  // diferencia de los ReadableStream nativos.
  const responseWith = (blocks: string[]): Response => {
    const chunks = blocks.map(block => new TextEncoder().encode(block));
    let index = 0;
    const reader = {
      read: () => Promise.resolve(
        index < chunks.length
          ? { done: false, value: chunks[index++] }
          : { done: true, value: undefined }
      )
    };
    return {
      ok: true,
      status: 200,
      body: { getReader: () => reader }
    } as unknown as Response;
  };

  const flushStream = (): void => {
    for (let i = 0; i < 12; i += 1) {
      flushMicrotasks();
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        RealtimeService,
        {
          provide: AuthService,
          useValue: {
            session: signal({
              accessToken: 'token-123',
              tokenType: 'Bearer',
              expiresInSeconds: 3600,
              user: {
                id: 'user',
                tenantId: 'tenant-1',
                role: 'ADMIN',
                fullName: 'Admin',
                email: 'admin@example.com'
              }
            })
          }
        }
      ]
    }).compileComponents();

    service = TestBed.inject(RealtimeService);
    fetchSpy = spyOn(window, 'fetch');
  });

  it('abre un único canal con el JWT y entrega solo eventos del proyecto suscrito', fakeAsync(() => {
    const first = event('project-1');
    const second = event('project-2');
    fetchSpy.and.returnValue(Promise.resolve(responseWith([
      `data: ${JSON.stringify(first)}\n\n`,
      `data: ${JSON.stringify(second)}\n\n`
    ])));
    const onEvent = jasmine.createSpy('onEvent');

    const stop = service.changes(onEvent, 'project-1');
    flushStream();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/projects/events', jasmine.objectContaining({
      headers: jasmine.objectContaining({ Authorization: 'Bearer token-123' })
    }));
    expect(onEvent).toHaveBeenCalledOnceWith(first);
    stop();
  }));

  it('ignora bloques malformados sin cerrar el canal', fakeAsync(() => {
    const valid = event('project-1');
    fetchSpy.and.returnValue(Promise.resolve(responseWith([
      'data: {invalid json}\n\n',
      'data: connected\n\n',
      `data: ${JSON.stringify(valid)}\n\n`
    ])));
    const onEvent = jasmine.createSpy('onEvent');

    const stop = service.changes(onEvent);
    flushStream();

    expect(onEvent).toHaveBeenCalledOnceWith(valid);
    stop();
  }));

  it('avisa al conectar y al reconectar para que la UI pueda resincronizarse', fakeAsync(() => {
    fetchSpy.and.returnValues(
      Promise.resolve(responseWith([])),
      Promise.resolve(responseWith([]))
    );
    const onConnected = jasmine.createSpy('onConnected');

    const stop = service.changes(() => undefined, undefined, onConnected);
    flushStream();
    expect(onConnected).toHaveBeenCalledTimes(1);

    tick(3000);
    flushStream();
    expect(onConnected).toHaveBeenCalledTimes(2);
    stop();
  }));

  it('cancela el reintento al no quedar suscriptores', fakeAsync(() => {
    fetchSpy.and.returnValue(Promise.resolve(responseWith([])));

    const stop = service.changes(() => undefined);
    flushStream();
    stop();
    tick(5000);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  }));
});
