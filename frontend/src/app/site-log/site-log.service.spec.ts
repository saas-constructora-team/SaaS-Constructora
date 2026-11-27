import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SiteLogEntry, SiteLogRecordRequest } from './site-log.model';
import { siteLogErrorMessage, SiteLogService } from './site-log.service';

describe('SiteLogService', () => {
  let api: SiteLogService;
  let http: HttpTestingController;

  const request: SiteLogRecordRequest = {
    type: 'AVANCE', status: 'ABIERTO', when: '2026-11-27T10:30',
    where: 'Piso 3', what: 'Avance', how: 'Se registró', why: null, assigneeId: null
  };
  const entry: SiteLogEntry = {
    id: 'entry', projectId: 'project', projectName: 'Obra', type: 'AVANCE', status: 'ABIERTO',
    what: 'Avance', how: 'Se registró', when: '2026-11-27T10:30:00', where: 'Piso 3', why: null,
    author: 'Ana', assigneeId: null, assigneeName: null,
    createdAt: '2026-11-27T10:31:00', updatedAt: '2026-11-27T10:31:00', photos: 0
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(SiteLogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the entries of the selected project', () => {
    api.list('project').subscribe(result => expect(result).toEqual([entry]));
    const req = http.expectOne('/api/projects/project/site-log');
    expect(req.request.method).toBe('GET');
    req.flush([entry]);
  });

  it('creates and updates sending the exact contract', () => {
    api.create('project', request).subscribe(result => expect(result).toEqual(entry));
    const created = http.expectOne('/api/projects/project/site-log');
    expect(created.request.method).toBe('POST');
    expect(created.request.body).toEqual(request);
    created.flush(entry);

    api.update('project', 'entry', request).subscribe(result => expect(result).toEqual(entry));
    const updated = http.expectOne('/api/projects/project/site-log/entry');
    expect(updated.request.method).toBe('PUT');
    expect(updated.request.body).toEqual(request);
    updated.flush(entry);
  });

  it('touches and deletes an entry', () => {
    api.touch('project', 'entry').subscribe(result => expect(result).toEqual(entry));
    const touched = http.expectOne('/api/projects/project/site-log/entry/touch');
    expect(touched.request.method).toBe('PATCH');
    touched.flush(entry);

    api.remove('project', 'entry').subscribe(result => expect(result).toBeUndefined());
    const removed = http.expectOne('/api/projects/project/site-log/entry');
    expect(removed.request.method).toBe('DELETE');
    removed.flush(null);
  });

  it('translates HTTP failures without exposing backend internals', () => {
    expect(siteLogErrorMessage(new HttpErrorResponse({ status: 400,
      error: { message: 'Los datos no son válidos' } }))).toBe('Los datos no son válidos');
    expect(siteLogErrorMessage(new HttpErrorResponse({ status: 403 })))
      .toContain('No tienes permiso');
    expect(siteLogErrorMessage(new HttpErrorResponse({ status: 404 })))
      .toContain('No se encontró');
    expect(siteLogErrorMessage(new HttpErrorResponse({ status: 0 })))
      .toContain('No se pudo conectar');
  });
});
