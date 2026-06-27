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
    const businessChildren = router.config.find(route => route.children)?.children?.map(route => route.path);

    expect(routePaths).toContain('');
    expect(routePaths).toContain('inicio');
    expect(routePaths).toContain('catalogo');
    expect(routePaths).toContain('productos');
    expect(routePaths).toContain('servicios');
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
      'ajustes',
      'edit',
      '',
    ]);
  });

  it('should load every lazy frontend component', async () => {
    const layoutRoute = routes.find(route => route.children);
    const businessRoutes = layoutRoute?.children?.filter(route => route.loadComponent) ?? [];
    const lazyRoutes = [
      ...routes.filter(route => route.loadComponent && !route.children),
      layoutRoute,
      ...businessRoutes,
    ].filter((route): route is NonNullable<typeof route> => Boolean(route));

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
