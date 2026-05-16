import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/services/auth.service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['register']);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate required fields before registering', () => {
    component.register();

    expect(component.errorMessage).toBe('Completa todos los campos');
    expect(authServiceSpy.register).not.toHaveBeenCalled();
  });

  it('should validate matching passwords', () => {
    component.user = 'nuevo';
    component.password = 'secret';
    component.confirmPassword = 'different';

    component.register();

    expect(component.errorMessage).toBe('Las contraseñas no coinciden');
    expect(authServiceSpy.register).not.toHaveBeenCalled();
  });

  it('should call AuthService and navigate to login after successful register', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    authServiceSpy.register.and.returnValue(of({ id: 1, userName: 'nuevo' }));
    component.user = 'nuevo';
    component.password = 'secret';
    component.confirmPassword = 'secret';

    component.register();
    tick(1200);

    expect(component.successMessage).toBe('Usuario registrado correctamente');
    expect(authServiceSpy.register).toHaveBeenCalledWith('nuevo', 'secret');
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  }));

  it('should show an error when register fails', () => {
    spyOn(console, 'error');
    authServiceSpy.register.and.returnValue(throwError(() => new Error('Duplicated user')));
    component.user = 'nuevo';
    component.password = 'secret';
    component.confirmPassword = 'secret';

    component.register();

    expect(component.errorMessage).toBe('No se pudo registrar el usuario. Quizá ya existe.');
  });
});
