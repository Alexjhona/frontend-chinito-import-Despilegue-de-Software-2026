import { HttpClientModule, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VentaComponent } from './venta.component';

describe('VentaComponent', () => {
  let component: VentaComponent;
  let fixture: ComponentFixture<VentaComponent>;
  let httpMock: HttpTestingController;

  const ventasUrl = 'http://localhost:8080/api/ventas';
  const clientesUrl = 'http://localhost:8080/api/clientes';
  const productosUrl = 'http://localhost:8080/api/productos';
  const clientes = [
    { id: 1, razonSocialONombre: 'Cliente Venta', dniOrRuc: '20111111111', direccion: 'Lima', telefono: '999111222' },
  ];
  const productos = [
    { id: 10, nombre: 'Zapatilla Urbana', codigoInterno: 'PROD-001', precioVenta: 120 },
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

    httpMock.expectOne(productosUrl).flush(productos);
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
    expect(component.clientes).toEqual(clientes);
    expect(component.ventas[0].items[0].productoNombre).toBe('Zapatilla Urbana');
    expect(component.ventas[0].items[0].precio).toBe(120);
  });

  it('should filter clients using simulated customer data', () => {
    component.busquedaCliente = 'cliente';

    component.filtrarClientes();

    expect(component.clientesFiltrados).toEqual(clientes);
  });

  it('should add a sale item, select a product and calculate total', () => {
    component.agregarItem();
    component.seleccionarProducto(0, productos[0]);
    component.nuevaVenta.items[0].cantidad = 2;

    expect(component.nuevaVenta.items[0].productoId).toBe(10);
    expect(component.totalVenta).toBe(240);
  });

  it('should validate customer and items before registering a sale', () => {
    component.registrarVenta();

    expect(component.mensaje).toBe('Completa los datos');
  });

  it('should call POST when registering a valid sale and refresh sales', () => {
    spyOn(component, 'generarBoletaDesdeVenta').and.stub();

    component.seleccionarCliente(clientes[0]);
    component.agregarItem();
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
      dniOrRuc: '20999999999',
      razonSocialONombre: 'Cliente Nuevo',
      direccion: 'Ica',
      telefono: '944444444',
    };

    component.crearCliente();

    const req = httpMock.expectOne(clientesUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(component.nuevoCliente);
    req.flush({ id: 2, ...component.nuevoCliente });

    httpMock.expectOne(clientesUrl).flush(clientes);
  });

  it('should call DELETE when deleting a sale and refresh the list', () => {
    spyOn(window, 'confirm').and.returnValue(true);

    component.eliminarVenta(100);

    const req = httpMock.expectOne(`${ventasUrl}/100`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    expect(component.mensaje).toBe('Venta eliminada correctamente');
    httpMock.expectOne(ventasUrl).flush([]);
  });

  it('should not call DELETE when deletion is cancelled', () => {
    spyOn(window, 'confirm').and.returnValue(false);

    component.eliminarVenta(100);

    expect(window.confirm).toHaveBeenCalled();
    httpMock.expectNone(`${ventasUrl}/100`);
  });

  it('should validate required data before creating a client', () => {
    const alertSpy = spyOn(window, 'alert');

    component.crearCliente();

    expect(alertSpy).toHaveBeenCalledWith('Completa DNI/RUC y nombre');
    httpMock.expectNone(clientesUrl);
  });

  it('should keep loading sales when product loading fails', () => {
    component.cargarProductos();

    httpMock.expectOne(productosUrl).flush(null, { status: 500, statusText: 'Error' });
    httpMock.expectOne(ventasUrl).flush([]);

    expect(component.productos).toEqual([]);
    expect(component.ventas).toEqual([]);
  });

  it('should filter products, normalize quantities and remove items', () => {
    component.agregarItem();
    component.filtrarProductos(0);
    expect(component.nuevaVenta.items[0].productosFiltrados).toEqual([]);

    component.nuevaVenta.items[0].busquedaProducto = 'prod-001';
    component.filtrarProductos(0);
    expect(component.nuevaVenta.items[0].productosFiltrados).toEqual(productos);

    component.nuevaVenta.items[0].cantidad = 0;
    component.seleccionarProducto(0, productos[0]);
    expect(component.nuevaVenta.items[0].cantidad).toBe(1);

    component.nuevaVenta.items[0].cantidad = 0;
    component.onCantidadChange(0);
    expect(component.nuevaVenta.items[0].cantidad).toBe(1);

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

  it('should toggle details and show an error when deletion fails', () => {
    component.toggleDetalles(100);
    expect(component.mostrarDetalles[100]).toBeTrue();
    component.toggleDetalles(100);
    expect(component.mostrarDetalles[100]).toBeFalse();

    component.eliminarVenta(undefined);
    spyOn(window, 'confirm').and.returnValue(true);
    component.eliminarVenta(100);
    httpMock.expectOne(`${ventasUrl}/100`).flush(null, { status: 500, statusText: 'Error' });

    expect(component.mensaje).toBe('No se pudo eliminar la venta');
  });

  it('should reject a sale with an invalid product or quantity', () => {
    component.nuevaVenta = {
      clienteId: 1,
      items: [{ productoId: null, cantidad: 0, precio: 0 }],
    };

    component.registrarVenta();

    expect(component.mensaje).toBe('Selecciona producto y cantidad');
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
      items: [{ productoId: 999, cantidad: 1, precio: 0 }],
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

    expect(component.ventasFiltradas).toBe(component.ventas);
    expect(component.totalVentasFiltradas).toBe(240);
  });
});
