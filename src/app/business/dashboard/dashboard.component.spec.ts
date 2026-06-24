import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import DashboardComponent from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let httpMock: HttpTestingController;

  const ventasUrl = 'http://localhost:8080/api/ventas';
  const productosUrl = 'http://localhost:8080/api/productos';
  const clientesUrl = 'http://localhost:8080/api/clientes';
  const proveedoresUrl = 'http://localhost:8080/api/proveedores';
  const stockUrl = 'http://localhost:8080/api/stock';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load business summary from existing endpoints', () => {
    httpMock.expectOne(ventasUrl).flush([
      { id: 1, clienteId: 1, clienteNombre: 'Cliente Uno', fecha: '2026-06-01T10:00:00', total: 100 },
      { id: 2, clienteId: 2, clienteNombre: 'Cliente Dos', fecha: '2026-06-02T10:00:00', total: 50 },
    ]);
    httpMock.expectOne(productosUrl).flush([
      { id: 10, nombre: 'Mouse' },
      { id: 11, nombre: 'Teclado' },
      { id: 12, nombre: 'Cable' },
    ]);
    httpMock.expectOne(clientesUrl).flush([{ id: 1 }, { id: 2 }]);
    httpMock.expectOne(proveedoresUrl).flush([{ id: 1 }]);
    httpMock.expectOne(`${stockUrl}/10`).flush({ cantidad: 0 });
    httpMock.expectOne(`${stockUrl}/11`).flush({ cantidad: 2 });
    httpMock.expectOne(`${stockUrl}/12`).flush({ cantidad: 20 });

    fixture.detectChanges();

    expect(component.cargando).toBeFalse();
    expect(component.totalVentas).toBe(2);
    expect(component.montoTotalVendido).toBe(150);
    expect(component.productosSinStock.length).toBe(1);
    expect(component.productosStockBajo.length).toBe(1);
    expect(component.ultimasVentas[0].id).toBe(2);
  });

  it('should show zero values when endpoints fail', () => {
    httpMock.expectOne(ventasUrl).flush(null, { status: 500, statusText: 'Error' });
    httpMock.expectOne(productosUrl).flush(null, { status: 500, statusText: 'Error' });
    httpMock.expectOne(clientesUrl).flush(null, { status: 500, statusText: 'Error' });
    httpMock.expectOne(proveedoresUrl).flush(null, { status: 500, statusText: 'Error' });

    fixture.detectChanges();

    expect(component.cargando).toBeFalse();
    expect(component.totalVentas).toBe(0);
    expect(component.productos.length).toBe(0);
    expect(component.aviso).toBe('No hay datos registrados todavia.');
  });

  it('should use product stock defaults and tolerate sales without optional values', () => {
    httpMock.expectOne(ventasUrl).flush([
      { id: 1, clienteId: 1 },
    ]);
    httpMock.expectOne(productosUrl).flush([
      { id: 10, nombre: 'Mouse', stock: 3 },
      { id: 11, nombre: 'Teclado' },
    ]);
    httpMock.expectOne(clientesUrl).flush([{ id: 1 }]);
    httpMock.expectOne(proveedoresUrl).flush([]);
    httpMock.expectOne(`${stockUrl}/10`).flush(null, { status: 500, statusText: 'Error' });
    httpMock.expectOne(`${stockUrl}/11`).flush(null, { status: 500, statusText: 'Error' });

    expect(component.montoTotalVendido).toBe(0);
    expect(component.productosStockBajo.map(producto => producto.id)).toEqual([]);
    expect(component.productosSinStock.map(producto => producto.id)).toEqual([11]);
    expect(component.ultimasVentas.map(venta => venta.id)).toEqual([1]);
    expect(component.aviso).toBe('');
  });
});
