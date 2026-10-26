import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserSummary } from './user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/users';

  /** Lista los usuarios de la empresa del token. Solo ADMIN (el backend responde 403 al resto). */
  list(): Observable<UserSummary[]> {
    return this.http.get<UserSummary[]>(this.apiUrl);
  }
}
