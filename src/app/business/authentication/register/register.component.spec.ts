import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
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
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['activateWorker']);

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

  it('should block registration without an invitation link', () => {
    component.register();

    expect(component.errorMessage).toBe('El registro solo está disponible desde una invitación enviada al correo.');
    expect(authServiceSpy.activateWorker).not.toHaveBeenCalled();
  });

  it('should validate required fields before registering', () => {
    component.esInvitacionTrabajador = true;
    component.register();

    expect(component.errorMessage).toBe('Completa todos los campos');
    expect(authServiceSpy.activateWorker).not.toHaveBeenCalled();
  });

  it('should validate matching passwords', () => {
    component.esInvitacionTrabajador = true;
    component.user = 'nuevo';
    component.email = 'nuevo@mail.com';
    component.password = 'secret';
    component.confirmPassword = 'different';

    component.register();

    expect(component.errorMessage).toBe('Las contraseñas no coinciden');
    expect(authServiceSpy.activateWorker).not.toHaveBeenCalled();
  });

  it('should activate worker password when opened from an invitation link', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    authServiceSpy.activateWorker.and.returnValue(of({ id: 2, correo: 'trabajador@correo.com' }));
    component.esInvitacionTrabajador = true;
    component.user = 'trabajador1';
    component.email = 'trabajador@correo.com';
    component.password = 'secret';
    component.confirmPassword = 'secret';

    component.register();
    tick(2000);

    expect(authServiceSpy.activateWorker).toHaveBeenCalledWith('trabajador@correo.com', 'secret', 'trabajador1');
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  }));

  it('should show an error when invitation register fails', () => {
    spyOn(console, 'error');
    authServiceSpy.activateWorker.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    component.esInvitacionTrabajador = true;
    component.user = 'nuevo';
    component.email = 'nuevo@mail.com';
    component.password = 'secret';
    component.confirmPassword = 'secret';

    component.register();

    expect(component.errorMessage).toBe('No se pudo registrar la contraseña. Puede que el correo ya este activo o que los datos no sean validos.');
  });

  it('should distinguish backend connection errors from unexpected errors', () => {
    spyOn(console, 'error');
    component.esInvitacionTrabajador = true;
    component.user = 'nuevo';
    component.email = 'nuevo@mail.com';
    component.password = 'secret';
    component.confirmPassword = 'secret';

    authServiceSpy.activateWorker.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    component.register();
    expect(component.errorMessage).toContain('No hay conexion con el backend');

    authServiceSpy.activateWorker.and.returnValue(throwError(() => new Error('Unexpected')));
    component.register();
    expect(component.errorMessage).toBe('No se pudo registrar la contraseña. Revisa la consola o intenta nuevamente.');
    expect(component.isLoading).toBeFalse();
  });
});
