import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AccountCompany, AccountProfileResponse, UpdateAccountProfileRequest, UpdateCompanyRequest } from './account.model';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/account';

  me(): Observable<AccountProfileResponse> {
    return this.http.get<AccountProfileResponse>(`${this.apiUrl}/me`);
  }

  updateProfile(request: UpdateAccountProfileRequest): Observable<AccountProfileResponse> {
    return this.http.patch<AccountProfileResponse>(`${this.apiUrl}/profile`, request);
  }

  updateCompany(request: UpdateCompanyRequest): Observable<AccountCompany> {
    return this.http.patch<AccountCompany>(`${this.apiUrl}/company`, request);
  }
}
