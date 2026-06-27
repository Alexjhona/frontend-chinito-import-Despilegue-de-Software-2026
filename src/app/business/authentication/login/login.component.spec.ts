import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { AuditService } from '../../../core/services/audit.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let auditServiceSpy: jasmine.SpyObj<AuditService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    auditServiceSpy = jasmine.createSpyObj<AuditService>('AuditService', ['registrar']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: AuditService, useValue: auditServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show an error when user or password is missing', () => {
    component.user = '';
    component.password = '';

    component.login();

    expect(component.errorMessage).toBe('Completa usuario o correo y contrasena');
    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });

  it('should call AuthService and navigate to dashboard after successful login', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    authServiceSpy.login.and.returnValue(of({ token: 'fake-token' }));
    component.user = 'admin';
    component.password = 'secret';

    component.login();
    tick(1400);

    expect(authServiceSpy.login).toHaveBeenCalledWith('admin', 'secret');
    expect(auditServiceSpy.registrar).toHaveBeenCalledWith('Inicio de sesión');
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  }));

  it('should show an error when login fails', fakeAsync(() => {
    spyOn(console, 'error');
    authServiceSpy.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400 })));
    component.user = 'admin';
    component.password = 'bad-password';

    component.login();
    tick(1400);

    expect(component.errorMessage).toBe('Usuario, correo o contrasena incorrectos.');
  }));

  it('should distinguish backend connection errors from unexpected errors', fakeAsync(() => {
    spyOn(console, 'error');
    component.user = 'admin';
    component.password = 'secret';

    authServiceSpy.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    component.login();
    tick(1400);
    expect(component.errorMessage).toContain('No hay conexion con el backend');

    authServiceSpy.login.and.returnValue(throwError(() => new Error('Unexpected')));
    component.login();
    tick(1400);
    expect(component.errorMessage).toBe('No se pudo iniciar sesion. Intenta nuevamente.');
    expect(component.isLoading).toBeFalse();
  }));
});
