import { HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('should add the bearer token to gateway API requests', () => {
    localStorage.setItem('authToken', 'test-token');
    const request = new HttpRequest('GET', 'http://localhost:8080/api/productos');
    let forwardedRequest: HttpRequest<unknown> | undefined;

    authInterceptor(request, forwarded => {
      forwardedRequest = forwarded;
      return of(new HttpResponse());
    }).subscribe();

    expect(forwardedRequest?.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('should add the bearer token to relative API requests', () => {
    localStorage.setItem('authToken', 'test-token');
    const request = new HttpRequest('GET', '/api/productos');
    let forwardedRequest: HttpRequest<unknown> | undefined;

    authInterceptor(request, forwarded => {
      forwardedRequest = forwarded;
      return of(new HttpResponse());
    }).subscribe();

    expect(forwardedRequest?.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('should forward gateway requests unchanged when there is no token', () => {
    const request = new HttpRequest('GET', 'http://localhost:8080/api/productos');
    let forwardedRequest: HttpRequest<unknown> | undefined;

    authInterceptor(request, forwarded => {
      forwardedRequest = forwarded;
      return of(new HttpResponse());
    }).subscribe();

    expect(forwardedRequest).toBe(request);
  });

  it('should forward non-gateway requests unchanged when there is a token', () => {
    localStorage.setItem('authToken', 'test-token');
    const request = new HttpRequest('GET', 'https://example.com/api/productos');
    let forwardedRequest: HttpRequest<unknown> | undefined;

    authInterceptor(request, forwarded => {
      forwardedRequest = forwarded;
      return of(new HttpResponse());
    }).subscribe();

    expect(forwardedRequest).toBe(request);
    expect(forwardedRequest?.headers.has('Authorization')).toBeFalse();
  });
});
