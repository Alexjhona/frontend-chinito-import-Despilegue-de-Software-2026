import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'authToken';
const GATEWAY_API_URL = 'http://localhost:8080/api/';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = globalThis.window === undefined
    ? null
    : globalThis.window.localStorage.getItem(TOKEN_KEY);

  const isGatewayApiRequest = request.url.startsWith(GATEWAY_API_URL);

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
