import { HttpClientModule, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';

import { VentaComponent } from './venta.component';

describe('VentaComponent', () => {
  let component: VentaComponent;
  let fixture: ComponentFixture<VentaComponent>;
  let httpMock: HttpTestingController;

  const ventasUrl = 'http://localhost:8080/api/ventas';
  const clientesUrl = 'http://localhost:8080/api/clientes';
  const productosUrl = 'http://localhost:8080/api/productos';
  const categoriasUrl = 'http://localhost:8080/api/categorias';
  const stockUrl = 'http://localhost:8080/api/stock';
  const dniUrl = 'http://localhost:8080/auth/dni';
  const clientes = [
    { id: 1, razonSocialONombre: 'Cliente Venta', dniOrRuc: '20111111111', direccion: 'Lima', telefono: '999111222' },
  ];
  const categorias = [
    { id: 1, nombre: 'Zapatillas', imagen: 'data:image/png;base64,categoria-uno' },
  ];
  const productos = [
    {
      id: 10,
      categoriaId: 1,
      nombre: 'Zapatilla Urbana',
      codigoInterno: 'PROD-001',
      precioVenta: 120,
      imagen: 'data:image/png;base64,producto-uno',
    },
  ];
  const ventas = [
    {
      id: 100,
      clienteId: 1,
      clienteNombre: 'Cliente Venta',
      fecha: '2026-05-16T00:00:00',
      total: 240,
      items: [{ productoId: 10, cantidad: 2, precio: 120 }],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VentaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideComponent(VentaComponent, {
        remove: { imports: [HttpClientModule] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(VentaComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(categoriasUrl).flush(categorias);
    httpMock.expectOne(productosUrl).flush(productos);
    httpMock.expectOne(`${stockUrl}/10`).flush({ cantidad: 10 });
    httpMock.expectOne(ventasUrl).flush(ventas);
    httpMock.expectOne(clientesUrl).flush(clientes);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create and load products, sales and clients using GET', () => {
    expect(component).toBeTruthy();
    expect(component.productos).toEqual(productos);
    expect(component.productos[0].stock).toBe(10);
    expect(component.categorias).toEqual(categorias);
    expect(component.clientes[0]).toEqual(jasmine.objectContaining(clientes[0]));
    expect(component.ventas[0].items[0].productoNombre).toBe('Zapatilla Urbana');
    expect(component.ventas[0].items[0].precio).toBe(120);
  });

  it('should render product and category images in sale details', () => {
    component.toggleDetalles(100);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('img[alt="Zapatilla Urbana"]')).not.toBeNull();
    expect(compiled.querySelector('img[alt="Zapatillas"]')).not.toBeNull();
  });

  it('should filter clients using simulated customer data', () => {
    component.busquedaCliente = 'cliente';

    component.filtrarClientes();

    expect(component.clientesFiltrados[0]).toEqual(jasmine.objectContaining(clientes[0]));
  });

  it('should add a sale item, select a product and calculate total', () => {
    component.seleccionarProducto(0, productos[0]);
    component.nuevaVenta.items[0].cantidad = 2;

    expect(component.nuevaVenta.items[0].productoId).toBe(10);
    expect(component.getImagenProducto(component.nuevaVenta.items[0])).toBe('data:image/png;base64,producto-uno');
    expect(component.getNombreCategoriaItem(component.nuevaVenta.items[0])).toBe('Zapatillas');
    expect(component.totalVenta).toBe(240);
  });

  it('should merge repeated products instead of keeping duplicate sale rows', () => {
    component.seleccionarProducto(0, productos[0]);
    component.nuevaVenta.items[0].cantidad = 2;
    component.agregarItem();
    component.nuevaVenta.items[0].cantidad = 3;

    component.seleccionarProducto(0, productos[0]);

    expect(component.nuevaVenta.items.length).toBe(1);
    expect(component.nuevaVenta.items[0].productoId).toBe(10);
    expect(component.nuevaVenta.items[0].cantidad).toBe(5);
    expect(component.totalVenta).toBe(600);
  });

  it('should validate customer and items before registering a sale', () => {
    component.registrarVenta();

    expect(component.errorFormulario).toBe('Selecciona un cliente válido de la lista.');
  });

  it('should call POST when registering a valid sale and refresh sales', () => {
    spyOn(component, 'generarBoletaDesdeVenta').and.stub();

    component.seleccionarCliente(clientes[0]);
    component.seleccionarProducto(0, productos[0]);
    component.nuevaVenta.items[0].cantidad = 2;

    component.registrarVenta();

    const req = httpMock.expectOne(ventasUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      clienteId: 1,
      items: [{ productoId: 10, cantidad: 2 }],
    });
    req.flush({
      id: 101,
      clienteId: 1,
      clienteNombre: 'Cliente Venta',
      fecha: '2026-05-16T00:00:00',
      total: 240,
      items: [{ productoId: 10, cantidad: 2, precio: 120, productoNombre: 'Zapatilla Urbana' }],
    });

    expect(component.generarBoletaDesdeVenta).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 101,
      total: 240,
    }));
    expect(component.mensaje).toBe('Venta registrada correctamente');

    httpMock.expectOne(ventasUrl).flush(ventas);
  });

  it('should call POST when creating a client inside the sale flow', () => {
    component.nuevoCliente = {
      dniOrRuc: '99999999',
      razonSocialONombre: '',
      direccion: '',
      telefono: '',
      nombres: 'Cliente',
      apellidoPaterno: 'Nuevo',
      apellidoMaterno: 'Venta',
    };

    component.crearCliente();

    const req = httpMock.expectOne(clientesUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(jasmine.objectContaining({
      dniOrRuc: '99999999',
      razonSocialONombre: 'Cliente Nuevo Venta',
      direccion: '',
      telefono: '',
      nombres: 'Cliente',
      apellidoPaterno: 'Nuevo',
      apellidoMaterno: 'Venta',
    }));
    req.flush({ id: 2, ...component.nuevoCliente });

    httpMock.expectOne(clientesUrl).flush(clientes);
  });

  it('should show unregistered DNI and create the client with the plus action', () => {
    component.busquedaCliente = '87654321';

    component.filtrarClientes();

    const dniReq = httpMock.expectOne(`${dniUrl}/87654321`);
    expect(component.mostrarClienteNoRegistrado).toBeTrue();
    dniReq.flush({
      dni: '87654321',
      nombres: 'Ana Maria',
      apellidoPaterno: 'Lopez',
      apellidoMaterno: 'Ramos',
      nombreCompleto: 'LOPEZ RAMOS ANA MARIA',
    });

    component.agregarClienteNoRegistrado();

    const postReq = httpMock.expectOne(clientesUrl);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual(jasmine.objectContaining({
      dniOrRuc: '87654321',
      razonSocialONombre: 'Ana Maria Lopez Ramos',
    }));
    postReq.flush({ id: 3, ...postReq.request.body });

    expect(component.clienteSeleccionado?.id).toBe(3);
    expect(component.nuevaVenta.clienteId).toBe(3);
    httpMock.expectOne(clientesUrl).flush(clientes);
  });

  it('should call DELETE when deleting a sale and refresh the list', () => {
    component.solicitarEliminar(ventas[0]);
    expect(component.accionPendiente).toBe('eliminar');
    expect(component.mensajeConfirmacion).toContain('#100');

    component.confirmarAccion();

    const req = httpMock.expectOne(`${ventasUrl}/100`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    expect(component.mensaje).toBe('Venta eliminada correctamente');
    httpMock.expectOne(ventasUrl).flush([]);
  });

  it('should not call DELETE when deletion is cancelled', () => {
    component.solicitarEliminar(ventas[0]);
    component.cancelarConfirmacion();

    expect(component.accionPendiente).toBeNull();
    httpMock.expectNone(`${ventasUrl}/100`);
  });

  it('should validate required data before creating a client', () => {
    component.crearCliente();

    expect(component.errorNuevoCliente).toBe('Completa DNI, nombre, apellido paterno y apellido materno.');
    httpMock.expectNone(clientesUrl);
  });

  it('should keep loading sales when product loading fails', () => {
    component.cargarProductos();

    httpMock.expectOne(productosUrl).flush(null, { status: 500, statusText: 'Error' });
    httpMock.expectOne(ventasUrl).flush([]);

    expect(component.productos).toEqual([]);
    expect(component.ventas).toEqual([]);
  });

  it('should warn and block sales when stock is missing or insufficient', () => {
    component.nuevaVenta = {
      clienteId: 1,
      items: [{ productoId: 10, cantidad: 11, precio: 120, productoSeleccionado: { ...productos[0], stock: 10 } }],
    };

    component.registrarVenta();

    expect(component.errorFormulario).toContain('Cantidad mayor al stock disponible');
    httpMock.expectNone(ventasUrl);

    component.nuevaVenta.items[0].cantidad = 1;
    component.nuevaVenta.items[0].productoSeleccionado = { ...productos[0], stock: 0 };

    component.registrarVenta();

    expect(component.errorFormulario).toContain('no tiene stock');
    httpMock.expectNone(ventasUrl);
  });

  it('should filter products, normalize quantities and remove items', () => {
    component.agregarItem();
    component.filtrarProductos(0);
    expect(component.nuevaVenta.items[0].productosFiltrados).toEqual([]);

    component.nuevaVenta.items[0].busquedaProducto = 'prod-001';
    component.filtrarProductos(0);
    expect(component.nuevaVenta.items[0].productosFiltrados).toEqual([jasmine.objectContaining(productos[0])]);

    component.nuevaVenta.items[0].cantidad = 0;
    component.seleccionarProducto(0, productos[0]);
    expect(component.nuevaVenta.items[0].cantidad).toBe(1);

    component.nuevaVenta.items[0].cantidad = 0;
    component.onCantidadChange(0);
    expect(component.nuevaVenta.items[0].cantidad).toBe(0);

    component.eliminarItem(0);
    component.eliminarItem(0);
    expect(component.nuevaVenta.items).toEqual([]);
  });

  it('should use fallback values when a loaded sale references an unknown product', () => {
    component.cargarVentas();

    httpMock.expectOne(ventasUrl).flush([
      {
        id: 101,
        clienteId: 1,
        items: [{ productoId: 999, cantidad: 1 }],
      },
    ]);

    expect(component.ventas[0].items[0].productoNombre).toBe('Producto');
    expect(component.ventas[0].items[0].precio).toBe(0);
  });

  it('should enrich known products while preserving an already defined price', () => {
    component.productos = productos;
    component.cargarVentas();

    httpMock.expectOne(ventasUrl).flush([{
      id: 102,
      clienteId: 1,
      items: [
        { productoId: 10, cantidad: 1, precio: 99 },
        { productoId: 10, cantidad: 1, precio: undefined },
      ],
    }]);

    expect(component.ventas[0].items[0].productoNombre).toBe('Zapatilla Urbana');
    expect(component.ventas[0].items[0].precio).toBe(99);
    expect(component.ventas[0].items[1].precio).toBe(120);
  });

  it('should preserve a fallback name and handle sales with no items', () => {
    component.cargarVentas();

    httpMock.expectOne(ventasUrl).flush([
      { id: 103, clienteId: 1, items: [{ productoId: 999, cantidad: 1, precio: null, productoNombre: 'Descontinuado' }] },
      { id: 104, clienteId: 1, items: [] },
    ]);

    expect(component.ventas[0].items[0].productoNombre).toBe('Descontinuado');
    expect(component.ventas[0].items[0].precio).toBe(0);
    expect(component.ventas[1].items).toEqual([]);
  });

  it('should handle an empty response and clear stale sales after a loading error', () => {
    component.cargarVentas();
    httpMock.expectOne(ventasUrl).flush([]);
    expect(component.ventas).toEqual([]);

    component.ventas = ventas;
    component.cargarVentas();
    httpMock.expectOne(ventasUrl).flush(null, { status: 500, statusText: 'Error' });
    expect(component.ventas).toEqual([]);
  });

  it('should open sale details in a modal, close it with animation and show an error when deletion fails', fakeAsync(() => {
    component.toggleDetalles(100);
    expect(component.mostrarDetalles[100]).toBeTrue();
    expect(component.mostrarDetalleVenta).toBeTrue();
    expect(component.ventaDetalleSeleccionada?.id).toBe(100);

    component.cerrarDetalleVenta();
    expect(component.cerrandoDetalleVenta).toBeTrue();
    tick(260);
    expect(component.mostrarDetalleVenta).toBeFalse();
    expect(component.mostrarDetalles).toEqual({});

    component.eliminarVenta(undefined);
    component.solicitarEliminar(ventas[0]);
    component.confirmarAccion();
    httpMock.expectOne(`${ventasUrl}/100`).flush(null, { status: 500, statusText: 'Error' });

    expect(component.mensaje).toBe('No se pudo eliminar la venta');
  }));

  it('should reject a sale with an invalid product or quantity', () => {
    component.nuevaVenta = {
      clienteId: 1,
      items: [{ productoId: null, cantidad: 0, precio: 0 }],
    };

    component.registrarVenta();

    expect(component.errorFormulario).toBe('Producto 1: Selecciona un producto válido de la lista.');
    httpMock.expectNone(ventasUrl);
  });

  it('should show an error when sale registration fails', () => {
    component.nuevaVenta = {
      clienteId: 1,
      items: [{ productoId: 10, cantidad: 1, precio: 120 }],
    };

    component.registrarVenta();

    httpMock.expectOne(ventasUrl).flush(null, { status: 500, statusText: 'Error' });
    expect(component.mensaje).toBe('No se pudo registrar la venta');
  });

  it('should prepare unknown products with fallback values after registration', () => {
    const boletaSpy = spyOn(component, 'generarBoletaDesdeVenta').and.stub();
    component.nuevaVenta = {
      clienteId: 1,
      items: [{
        productoId: 999,
        cantidad: 1,
        precio: 1,
        productoSeleccionado: {
          id: 999,
          nombre: 'Producto',
          codigoInterno: 'SIN-CODIGO',
          precioVenta: 1,
          stock: 10,
        },
      }],
    };

    component.registrarVenta();

    httpMock.expectOne(ventasUrl).flush({
      id: 102,
      clienteId: 1,
      items: [{ productoId: 999, cantidad: 1 }],
    });
    httpMock.expectOne(ventasUrl).flush([]);

    expect(boletaSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      items: [jasmine.objectContaining({ productoNombre: 'Producto', precio: 0 })],
    }));
  });

  it('should generate and save a sales receipt PDF without errors', () => {
    spyOn<any>(component, 'descargarPdf').and.stub();

    expect(() => component.generarBoletaDesdeVenta({
        id: 100,
        clienteId: 1,
        fecha: '2026-05-16T00:00:00',
        items: [
          {
            productoId: 10,
            productoNombre: 'Zapatilla Urbana',
            cantidad: 2,
            precio: 120,
          },
        ],
      })
    ).not.toThrow();
  });

  it('should expose filtered sales and sum totals with missing totals as zero', () => {
    component.ventas = [
      ...ventas,
      { id: 101, clienteId: 1, items: [] },
    ];

    expect(component.ventasFiltradas).toEqual(component.ventas);
    expect(component.totalVentasFiltradas).toBe(240);
  });
});
