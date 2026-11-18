import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { RegisterComponent } from './register.component';

 describe('RegisterComponent', () => {
  const valid = {
    companyName: 'Constructora Andes', tradeName: 'Andes', taxId: '900123456-7',
    contactPhone: '6015550100', address: 'Calle 10', companyEmail: 'contacto@example.com',
    adminFullName: 'Ana Pérez', adminEmail: 'ana@example.com',
    adminPassword: 'Andes123!', confirmPassword: 'Andes123!'
  };
  let register: jasmine.Spy;

  beforeEach(() => {
    register = jasmine.createSpy('register').and.returnValue(of({}));
    TestBed.configureTestingModule({
      imports: [RegisterComponent], providers: [{ provide: AuthService, useValue: { register } }]
    });
  });

  it('sends all company fields without sending password confirmation', () => {
    const component = TestBed.createComponent(RegisterComponent).componentInstance;
    component.form.setValue(valid);
    component.onSubmit();
    const { confirmPassword, ...expected } = valid;
    expect(register).toHaveBeenCalledOnceWith(expected);
  });

  it('sends empty optional fields as null without changing their controls', () => {
    const component = TestBed.createComponent(RegisterComponent).componentInstance;
    component.form.setValue({ ...valid, tradeName: '', contactPhone: ' ', companyEmail: '' });
    component.onSubmit();
    expect(register.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
      tradeName: null, contactPhone: null, companyEmail: null
    }));
    expect(component.form.controls.contactPhone.value).toBe(' ');
  });

  it('rejects blank required fields and invalid corporate email', () => {
    const component = TestBed.createComponent(RegisterComponent).componentInstance;
    for (const field of ['companyName', 'taxId', 'address', 'adminFullName'] as const) {
      component.form.setValue({ ...valid, [field]: ' ' });
      component.onSubmit();
      expect(component.form.controls[field].hasError('required')).toBeTrue();
    }
    component.form.setValue({ ...valid, companyEmail: 'invalid' });
    component.onSubmit();
    expect(component.form.controls.companyEmail.hasError('email')).toBeTrue();
    expect(register).not.toHaveBeenCalled();
  });

  it('enforces length limits and password composition', () => {
    const component = TestBed.createComponent(RegisterComponent).componentInstance;
    const limits = { companyName: 100, tradeName: 150, taxId: 50, contactPhone: 50,
      address: 255, adminFullName: 150 };
    for (const [field, limit] of Object.entries(limits)) {
      const control = component.form.get(field)!;
      control.setValue('a'.repeat(limit));
      expect(control.hasError('maxlength')).toBeFalse();
      control.setValue('a'.repeat(limit + 1));
      expect(control.hasError('maxlength')).toBeTrue();
    }
    for (const password of ['abcdefgh', '12345678', 'Andes123', 'Andes!!!', 'A1!']) {
      component.form.setValue({ ...valid, adminPassword: password, confirmPassword: password });
      expect(component.form.invalid).toBeTrue();
    }
    component.form.setValue(valid);
    expect(component.form.valid).toBeTrue();
  });

  it('renders mismatch after submit and clears it when corrected', () => {
    const fixture = TestBed.createComponent(RegisterComponent);
    const component = fixture.componentInstance;
    component.form.setValue({ ...valid, confirmPassword: 'Different123!' });
    component.onSubmit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Las contraseñas no coinciden');
    expect(register).not.toHaveBeenCalled();
    component.form.controls.confirmPassword.setValue(valid.adminPassword);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Las contraseñas no coinciden');
  });
});
