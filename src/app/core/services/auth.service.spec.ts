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

    const req = httpMock.expectOne('https://album-tested-cgi-dragon.trycloudflare.com/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userName: 'admin', password: 'secret' });

    req.flush({ token });
  });

  it('should not store an empty token returned by login', () => {
    service.login('admin', 'secret').subscribe();

    httpMock.expectOne('https://album-tested-cgi-dragon.trycloudflare.com/auth/login').flush({ token: '' });

    expect(service.getToken()).toBeNull();
  });

  it('should call register endpoint with POST and return the created user', () => {
    service.register('nuevo', 'secret').subscribe(response => {
      expect(response).toEqual({ id: 7, userName: 'nuevo' });
    });

    const req = httpMock.expectOne('https://album-tested-cgi-dragon.trycloudflare.com/auth/create');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ userName: 'nuevo', password: 'secret' });

    req.flush({ id: 7, userName: 'nuevo' });
  });

  it('should remove the token and navigate to login on logout', () => {
    localStorage.setItem('authToken', 'token');
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    service.logout();

    expect(localStorage.getItem('authToken')).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
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
