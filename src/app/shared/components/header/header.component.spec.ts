import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HeaderComponent } from './header.component';
import { AuthService } from '../../../core/services/auth.service';
import { AuditService } from '../../../core/services/audit.service';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let auditServiceSpy: jasmine.SpyObj<AuditService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'logout',
      'hasPermission',
      'isImpersonating',
      'returnToOwnerSession',
    ]);
    auditServiceSpy = jasmine.createSpyObj<AuditService>('AuditService', ['registrar']);
    authServiceSpy.hasPermission.and.returnValue(false);
    authServiceSpy.isImpersonating.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: AuditService, useValue: auditServiceSpy },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle the menu', () => {
    component.toggleMenu();

    expect(component.isMenuOpen).toBeTrue();
  });

  it('should ask before calling AuthService on logout', () => {
    component.logout();

    expect(component.isMenuOpen).toBeFalse();
    expect(component.mostrarConfirmacionLogout).toBeTrue();
    expect(authServiceSpy.logout).not.toHaveBeenCalled();

    component.confirmarLogout();

    expect(component.mostrarConfirmacionLogout).toBeFalse();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('should cancel logout confirmation', () => {
    component.logout();
    component.cancelarLogout();

    expect(component.mostrarConfirmacionLogout).toBeFalse();
    expect(authServiceSpy.logout).not.toHaveBeenCalled();
  });

  it('should logout even when the audit entry cannot be stored', () => {
    auditServiceSpy.registrar.and.throwError('storage unavailable');

    expect(() => component.confirmarLogout()).not.toThrow();
    expect(component.mostrarConfirmacionLogout).toBeFalse();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('should return to owner session', () => {
    component.volverAMiRol();

    expect(authServiceSpy.returnToOwnerSession).toHaveBeenCalled();
  });
});
