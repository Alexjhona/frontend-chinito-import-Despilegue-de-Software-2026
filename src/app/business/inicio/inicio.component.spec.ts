import { HttpClient } from '@angular/common/http';
import { fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, NavigationEnd, Router } from '@angular/router';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { PublicContentService } from '../../core/services/public-content.service';
import { InicioComponent } from './inicio.component';

describe('InicioComponent', () => {
  let http: jasmine.SpyObj<HttpClient>;
  let router: jasmine.SpyObj<Router> & { events: Subject<NavigationEnd>; url: string };
  let publicContent: PublicContentService;
  let component: InicioComponent;

  const categorias = [
    { id: 1, nombre: 'Audio' },
    { id: 2, nombre: 'Protección' },
  ];
  const productos = [
    { id: 10, categoriaId: 1, codigoInterno: 'AUD-1', nombre: 'Audífono Pro', precioVenta: 120, moneda: 'Soles' },
    { id: 11, categoriaId: 2, codigoInterno: 'CASE-1', nombre: 'Case Azul', precioVenta: null, moneda: 'Dólares' },
    { categoriaId: 1, nombre: 'Sin identificador', precioVenta: 10 },
  ];

  function crear(errorCategorias = false, errorProductos = false): InicioComponent {
    http = jasmine.createSpyObj<HttpClient>('HttpClient', ['get']);
    (http.get as jasmine.Spy).and.callFake((url: string) => {
      if (url.endsWith('/categorias')) return errorCategorias ? throwError(() => new Error('categorias')) : of(categorias);
      if (url.endsWith('/productos')) return errorProductos ? throwError(() => new Error('productos')) : of(productos);
      if (url.includes('/stock/10')) return of({ cantidad: 4 });
      if (url.includes('/stock/11')) return throwError(() => new Error('stock'));
      return EMPTY;
    });
    const events = new Subject<NavigationEnd>();
    router = Object.assign(jasmine.createSpyObj<Router>('Router', ['navigate']), { events, url: '/inicio' });
    const route = { queryParamMap: of(convertToParamMap({})) } as ActivatedRoute;
    publicContent = new PublicContentService();
    const refresh = { refresh$: EMPTY } as unknown as DataRefreshService;
    return new InicioComponent(http, router, route, publicContent, refresh);
  }

  beforeEach(() => {
    localStorage.clear();
    component = crear();
  });

  afterEach(() => component.ngOnDestroy());

  it('should load categories, products and stock with safe fallbacks', () => {
    expect(component.categorias).toEqual(categorias);
    expect(component.productos[0].stock).toBe(4);
    expect(component.productos[1].stock).toBe(0);
    expect(component.productos[2].stock).toBe(0);
    expect(component.cargandoCatalogo).toBeFalse();
  });

  it('should expose loading errors independently', () => {
    component.ngOnDestroy();
    component = crear(true, true);

    expect(component.categorias).toEqual([]);
    expect(component.productos).toEqual([]);
    expect(component.errorCategorias).toContain('categorias');
    expect(component.errorProductos).toContain('productos');
    expect(component.cargandoCatalogo).toBeFalse();
  });

  it('should filter visible data by text, category and hidden configuration', () => {
    publicContent.guardar({
      ...publicContent.config,
      productosOcultos: [11],
      categoriasOcultas: [2],
    });
    component.busqueda = 'audio';

    expect(component.productosFiltrados.map(producto => producto.id)).toEqual([10, undefined]);
    expect(component.categoriasFiltradas).toEqual([categorias[0]]);
    expect(component.productosPorCategoria(1)).toBe(2);

    component.seleccionarCategoria(2);
    expect(component.productosFiltrados).toEqual([]);
    expect(component.categoriaActiva(2)).toBeTrue();
  });

  it('should format prices, stock, names, initials and placeholder images', () => {
    expect(component.nombreCategoria(1)).toBe('Audio');
    expect(component.nombreCategoria(999)).toBe('Sin categoria');
    expect(component.precioProducto(component.productos[0])).toBe('S/ 120.00');
    expect(component.precioProducto(component.productos[1])).toBe('Consultar');
    expect(component.estadoStock(component.productos[0])).toBe('Disponible');
    expect(component.estadoStock(component.productos[1])).toBe('No disponible');
    expect(component.claseStock(component.productos[0])).toContain('emerald');
    expect(component.claseStock(component.productos[1])).toContain('rose');
    expect(component.iniciales('chinito importaciones')).toBe('CI');
    expect(component.imagenProducto(component.productos[0])).toContain('data:image/svg+xml');
    expect(component.imagenCategoria(categorias[0])).toContain('data:image/svg+xml');
  });

  it('should navigate through public views and update view flags', () => {
    const event = jasmine.createSpyObj<Event>('Event', ['preventDefault']);
    component.verCatalogo(event);
    component.verTodosProductos(event);
    component.verCategoriaDesdeHeader(1);

    expect(event.preventDefault).toHaveBeenCalledTimes(2);
    expect(router.navigate).toHaveBeenCalledWith(['/catalogo']);
    expect(router.navigate).toHaveBeenCalledWith(['/productos'], { queryParams: { categoria: 1 } });

    router.events.next(new NavigationEnd(1, '/catalogo', '/servicios'));
    expect(component.esVistaServicios).toBeTrue();
    expect(component.esVistaInicio).toBeFalse();
  });

  it('should open and close a service and refresh from the logo', fakeAsync(() => {
    component.alternarServicio('pagos');
    expect(component.servicioActivoConfig?.id).toBe('pagos');
    component.cerrarServicio();
    expect(component.servicioActivoConfig).toBeNull();

    const event = jasmine.createSpyObj<Event>('Event', ['preventDefault']);
    component.busqueda = 'texto';
    component.actualizarDesdeLogo(event);
    expect(component.logoActualizando).toBeTrue();
    expect(component.busqueda).toBe('');
    expect(router.navigate).toHaveBeenCalledWith(['/inicio']);
    tick(700);
    expect(component.logoActualizando).toBeFalse();
    component.ngOnDestroy();
  }));
});
