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
    const businessChildren = router.config[2].children?.map(route => route.path);

    expect(routePaths).toContain('');
    expect(routePaths).toContain('inicio');
    expect(routePaths).toContain('login');
    expect(routePaths).toContain('register');
    expect(routePaths).toContain('registro-trabajador');
    expect(routePaths).toContain('**');
    expect(businessChildren).toEqual([
      'dashboard',
      'cliente',
      'proveedor',
      'categoria',
      'agregar-categoria',
      'producto',
      'agregar-productos',
      'venta',
      'trabajadores',
      '',
    ]);
  });

  it('should load every lazy frontend component', async () => {
    const businessRoutes = routes[2].children?.filter(route => route.loadComponent) ?? [];
    const lazyRoutes = [routes[1], routes[2], ...businessRoutes, routes[3], routes[5]];

    const loadedComponents = await Promise.all(
      lazyRoutes.map(route => Promise.resolve(route.loadComponent?.()))
    );

    expect(loadedComponents.every(component => Boolean(component))).toBeTrue();
  });

  it('should keep public register disabled and preserve invited worker registration', () => {
    const publicRegister = routes.find(route => route.path === 'register');
    const workerRegister = routes.find(route => route.path === 'registro-trabajador');

    expect(publicRegister?.redirectTo).toBe('inicio');
    expect(workerRegister?.loadComponent).toBeTruthy();
  });
});
