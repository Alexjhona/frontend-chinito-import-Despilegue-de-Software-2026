import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'authToken';
const GATEWAY_API_PREFIX = 'http://localhost:8080/api/';
const AUTH_PREFIX = 'http://localhost:8080/auth/';
const RELATIVE_API_PREFIX = '/api/';
const RELATIVE_AUTH_PREFIX = '/auth/';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = globalThis.window === undefined
    ? null
    : globalThis.window.localStorage.getItem(TOKEN_KEY);

  const isGatewayApiRequest =
    request.url.startsWith(GATEWAY_API_PREFIX) ||
    request.url.startsWith(AUTH_PREFIX) ||
    request.url.startsWith(RELATIVE_API_PREFIX) ||
    request.url.startsWith(RELATIVE_AUTH_PREFIX);

  if (token && isGatewayApiRequest) {
    const authenticatedRequest = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    return next(authenticatedRequest);
  }

  return next(request);
};
