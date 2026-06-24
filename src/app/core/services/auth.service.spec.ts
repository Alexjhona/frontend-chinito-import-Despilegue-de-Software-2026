import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call login endpoint with POST and store the returned token', () => {
    const token = 'header.eyJleHAiOjk5OTk5OTk5OTl9.signature';

    service.login('admin', 'secret').subscribe(response => {
      expect(response.token).toBe(token);
      expect(service.getToken()).toBe(token);
    });

    const req = httpMock.expectOne('http://localhost:8080/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userName: 'admin', correo: 'admin', password: 'secret' });

    req.flush({ token });
  });

  it('should not store an empty token returned by login', () => {
    service.login('admin', 'secret').subscribe();

    httpMock.expectOne('http://localhost:8080/auth/login').flush({ token: '' });

    expect(service.getToken()).toBeNull();
  });

  it('should call worker activation endpoint with email, user and password', () => {
    service.activateWorker('trabajador@correo.com', 'secret', 'trabajador1').subscribe(response => {
      expect(response).toEqual({ id: 8, correo: 'trabajador@correo.com' });
    });

    const req = httpMock.expectOne('http://localhost:8080/auth/trabajadores/activar');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ correo: 'trabajador@correo.com', userName: 'trabajador1', password: 'secret' });

    req.flush({ id: 8, correo: 'trabajador@correo.com' });
  });

  it('should impersonate a worker and store the returned token', () => {
    const ownerToken = 'header.eyJleHAiOjk5OTk5OTk5OTl9.owner';
    const token = 'header.eyJleHAiOjk5OTk5OTk5OTl9.signature';
    localStorage.setItem('authToken', ownerToken);

    service.impersonateWorker(12).subscribe(response => {
      expect(response.token).toBe(token);
      expect(service.getToken()).toBe(token);
      expect(localStorage.getItem('ownerAuthToken')).toBe(ownerToken);
    });

    const req = httpMock.expectOne('http://localhost:8080/auth/trabajadores/12/impersonar');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});

    req.flush({ token });
  });

  it('should return to the owner session after impersonating', () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    localStorage.setItem('authToken', 'worker-token');
    localStorage.setItem('ownerAuthToken', 'owner-token');

    service.returnToOwnerSession();

    expect(localStorage.getItem('authToken')).toBe('owner-token');
    expect(localStorage.getItem('ownerAuthToken')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should remove the token and navigate to inicio on logout', () => {
    localStorage.setItem('authToken', 'token');
    localStorage.setItem('ownerAuthToken', 'owner-token');
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    service.logout();

    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('ownerAuthToken')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/inicio']);
  });

  it('should report authentication only for a valid non-expired token', () => {
    expect(service.isAuthenticated()).toBeFalse();

    const futurePayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 }));
    localStorage.setItem('authToken', `header.${futurePayload}.signature`);
    expect(service.isAuthenticated()).toBeTrue();

    const expiredPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }));
    localStorage.setItem('authToken', `header.${expiredPayload}.signature`);
    expect(service.isAuthenticated()).toBeFalse();

    localStorage.setItem('authToken', 'malformed-token');
    expect(service.isAuthenticated()).toBeFalse();
  });
});
