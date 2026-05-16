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
});
