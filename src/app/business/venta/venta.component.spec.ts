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
      items: [{ productoId: 10, cantidad: 2, precio: 0 }],
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
    req.flush({ id: 101, clienteId: 1, items: [{ productoId: 10, cantidad: 2 }] });

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
});
