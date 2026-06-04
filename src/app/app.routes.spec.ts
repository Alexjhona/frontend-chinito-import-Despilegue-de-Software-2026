import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { routes } from './app.routes';

describe('App routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });
  });

  it('should configure the main frontend routes without errors', () => {
    const router = TestBed.inject(Router);
    const routePaths = router.config.map(route => route.path);
    const businessChildren = router.config[0].children?.map(route => route.path);

    expect(routePaths).toContain('');
    expect(routePaths).toContain('login');
    expect(routePaths).toContain('register');
    expect(routePaths).toContain('**');
    expect(businessChildren).toEqual([
      'dashboard',
      'cliente',
      'proveedor',
      'categoria',
      'producto',
      'venta',
      '',
    ]);
  });

  it('should load every lazy frontend component', async () => {
    const businessRoutes = routes[0].children?.filter(route => route.loadComponent) ?? [];
    const lazyRoutes = [routes[0], ...businessRoutes, routes[1], routes[2]];

    const loadedComponents = await Promise.all(
      lazyRoutes.map(route => Promise.resolve(route.loadComponent?.()))
    );

    expect(loadedComponents.every(component => Boolean(component))).toBeTrue();
  });
});
