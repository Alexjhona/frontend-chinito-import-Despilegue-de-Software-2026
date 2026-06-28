import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['hasPermission']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: authService },
      { provide: Router, useValue: router },
    ] });
  });

  function ejecutar(permission?: string): boolean {
    const route = { data: permission ? { permission } : {} } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() =>
      PermissionGuard(route, {} as RouterStateSnapshot)
    ) as boolean;
  }

  it('should allow routes without a required permission', () => {
    expect(ejecutar()).toBeTrue();
    expect(authService.hasPermission).not.toHaveBeenCalled();
  });

  it('should allow authorized users', () => {
    authService.hasPermission.and.returnValue(true);
    expect(ejecutar('ventas')).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should redirect unauthorized users', () => {
    authService.hasPermission.and.returnValue(false);
    expect(ejecutar('ajustes')).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
