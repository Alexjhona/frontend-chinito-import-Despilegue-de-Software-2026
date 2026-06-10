import { HttpInterceptorFn } from '@angular/common/http';

const TOKEN_KEY = 'authToken';
const GATEWAY_API_URLS = [
  '/api/',
  'https://mean-election-candle-joint.trycloudflare.com/api/',
];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = globalThis.window === undefined
    ? null
    : globalThis.window.localStorage.getItem(TOKEN_KEY);

  const isGatewayApiRequest = GATEWAY_API_URLS.some(apiUrl => request.url.startsWith(apiUrl));

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
