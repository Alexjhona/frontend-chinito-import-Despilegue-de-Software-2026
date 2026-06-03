import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'authToken';
const GATEWAY_API_URL = 'http://localhost:8080/api/';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem(TOKEN_KEY)
    : null;

  const isGatewayApiRequest = request.url.startsWith(GATEWAY_API_URL);

  if (!token || !isGatewayApiRequest) {
    return next(request);
  }

  const authenticatedRequest = request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authenticatedRequest);
};
