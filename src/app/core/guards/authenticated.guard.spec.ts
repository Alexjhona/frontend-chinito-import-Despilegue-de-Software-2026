import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router, provideRouter } from '@angular/router';

import { AuthenticatedGuard } from './authenticated.guard';
import { AuthService } from '../services/auth.service';

describe('AuthenticatedGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => AuthenticatedGuard(...guardParameters));
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated']);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('should allow access to login/register when the user is not authenticated', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);

    expect(executeGuard({} as never, {} as never)).toBeTrue();
  });

  it('should redirect to dashboard when the user is already authenticated', () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    authServiceSpy.isAuthenticated.and.returnValue(true);

    expect(executeGuard({} as never, {} as never)).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });
});
