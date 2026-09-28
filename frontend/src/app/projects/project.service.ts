import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Project, CreateProjectRequest } from './project.model';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/projects';

  list(): Observable<Project[]> {
    return this.http.get<Project[]>(this.apiUrl);
  }

  create(req: CreateProjectRequest): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, req);
  }
}