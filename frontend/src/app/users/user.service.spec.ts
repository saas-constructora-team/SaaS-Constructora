import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { UserSummary } from './user.model';

describe('UserService permission endpoints', () => {
  let api: UserService;
  let http: HttpTestingController;
  const user: UserSummary = { id: 'user', fullName: 'User', email: 'user@example.com',
    role: 'MEMBER', active: true, canCreatePersonnel: false };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('gets the users with their effective capability', () => {
    api.list().subscribe(result => expect(result).toEqual([user]));
    const request = http.expectOne('/api/users');
    expect(request.request.method).toBe('GET');
    request.flush([user]);
  });

  const cases = [
    ['enablePermissions', 'permissions/enable'], ['disablePermissions', 'permissions/disable'],
    ['enablePersonnelCreation', 'personnel-creation/enable'],
    ['disablePersonnelCreation', 'personnel-creation/disable']
  ] as const;
  for (const [method, path] of cases) {
    it(`POSTs ${path} without an invented request body`, () => {
      api[method]('user').subscribe(result => expect(result).toEqual(user));
      const request = http.expectOne(`/api/users/user/${path}`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toBeNull();
      request.flush(user);
    });
  }
});
