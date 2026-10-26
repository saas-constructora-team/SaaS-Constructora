import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserManagementComponent } from './user-management.component';
import { UserService } from './user.service';
import { AuthService } from '../auth/auth.service';
import { of } from 'rxjs';
import { UserSummary } from './user.model';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  const mockUsers: UserSummary[] = [
    {
      id: '1',
      email: 'admin@example.com',
      fullName: 'Admin User',
      role: 'ADMIN',
      active: true
    },
    {
      id: '2',
      email: 'member@example.com',
      fullName: 'Member User',
      role: 'MEMBER',
      active: true
    }
  ];

  beforeEach(async () => {
    mockUserService = jasmine.createSpyObj('UserService', ['list']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['logout', 'session']);

    mockUserService.list.and.returnValue(of(mockUsers));
    mockAuthService.session.and.returnValue({
      user: { id: '1', email: 'admin@example.com', fullName: 'Admin User', role: 'ADMIN' },
      accessToken: 'fake-token',
      tokenType: 'Bearer',
      expiresInSeconds: 3600
    });

    await TestBed.configureTestingModule({
      imports: [UserManagementComponent],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load users on init', () => {
    fixture.detectChanges();
    expect(mockUserService.list).toHaveBeenCalled();
    expect(component.users()).toEqual(mockUsers);
    expect(component.loading()).toBeFalse();
  });

  it('should handle 403 error', () => {
    const error403 = { status: 403, statusText: 'Forbidden' };
    mockUserService.list.and.returnValue(of(error403));
    
    fixture.detectChanges();
    expect(component.error()).toContain('No tienes permisos');
  });

  it('should handle 401 error', () => {
    const error401 = { status: 401, statusText: 'Unauthorized' };
    mockUserService.list.and.returnValue(of(error401));
    
    fixture.detectChanges();
    expect(component.error()).toContain('Debes iniciar sesión');
  });

  it('should call logout when button is clicked', () => {
    const logoutButton = fixture.nativeElement.querySelector('.btn-logout');
    logoutButton?.click();
    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  it('should display users in table', () => {
    fixture.detectChanges();
    const table = fixture.nativeElement.querySelector('.data-table');
    expect(table).toBeTruthy();
    
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    
    const firstRow = rows[0];
    expect(firstRow.textContent).toContain('Admin User');
    expect(firstRow.textContent).toContain('admin@example.com');
    expect(firstRow.textContent).toContain('ADMIN');
  });

  it('should display role badges with correct styling', () => {
    fixture.detectChanges();
    
    const adminBadge = fixture.nativeElement.querySelector('.role-badge.admin');
    const memberBadge = fixture.nativeElement.querySelector('.role-badge.member');
    
    expect(adminBadge).toBeTruthy();
    expect(memberBadge).toBeTruthy();
  });

  it('should display permission tags based on role', () => {
    fixture.detectChanges();
    
    const adminPermission = fixture.nativeElement.querySelectorAll('.permission-tag');
    expect(adminPermission.length).toBeGreaterThan(0);
  });
});