import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AjustesComponent } from './ajustes.component';

describe('AjustesComponent', () => {
  let component: AjustesComponent;
  let fixture: ComponentFixture<AjustesComponent>;
  let httpMock: HttpTestingController;

  const apiClientes = 'http://localhost:8080/api/clientes';
  const apiVentas = 'http://localhost:8080/api/ventas';
  const apiProductos = 'http://localhost:8080/api/productos';
  const apiCategorias = 'http://localhost:8080/api/categorias';
  const apiProveedores = 'http://localhost:8080/api/proveedores';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AjustesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AjustesComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    const productosIniciales = httpMock.match(apiProductos);
    expect(productosIniciales.length).toBe(2);
    productosIniciales[0].flush([{ id: 1, nombre: 'Mouse' }]);
    httpMock.expectOne(apiClientes).flush([{ id: 1, nombres: 'Ana' }]);
    httpMock.expectOne(apiVentas).flush([{ id: 1, total: 25 }]);
    productosIniciales[1].flush([{ id: 1, nombre: 'Mouse', stock: 2 }]);
    httpMock.expectOne(apiCategorias).flush([{ id: 1, nombre: 'Tecnología' }]);
    httpMock.expectOne(apiProveedores).flush([{ id: 1, razonSocialONombre: 'Proveedor Uno' }]);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create a general backup with data from every module', () => {
    component.crearRespaldo();

    httpMock.expectOne(apiClientes).flush([{ id: 1, nombres: 'Ana' }]);
    httpMock.expectOne(apiVentas).flush([{ id: 2, total: 25 }]);
    httpMock.expectOne(apiProductos).flush([{ id: 3, nombre: 'Teclado' }]);
    httpMock.expectOne(apiCategorias).flush([{ id: 4, nombre: 'Tecnología' }]);
    httpMock.expectOne(apiProveedores).flush([{ id: 5, razonSocialONombre: 'Proveedor Uno' }]);

    const backup = JSON.parse(component.respaldoGenerado);
    expect(backup.data.clientes.length).toBe(1);
    expect(backup.data.ventas.length).toBe(1);
    expect(backup.data.productos.length).toBe(1);
    expect(backup.data.categorias.length).toBe(1);
    expect(backup.data.proveedores.length).toBe(1);
    expect(component.mensaje).toContain('Respaldo generado');
  });

  it('should export one module as an Excel-compatible file', () => {
    const downloadSpy = spyOn<any>(component, 'descargarArchivo');

    component.exportarModuloExcel('clientes');

    const req = httpMock.expectOne(apiClientes);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, nombres: 'Ana', apellidoPaterno: 'Rojas' }]);

    expect(downloadSpy).toHaveBeenCalled();
    const [content, filename, mime] = downloadSpy.calls.mostRecent().args;
    expect(content).toContain('<table>');
    expect(content).toContain('Ana');
    expect(filename).toContain('clientes_chinito');
    expect(filename).toContain('.xls');
    expect(mime).toContain('application/vnd.ms-excel');
  });

  it('should restore one module by posting each imported item to the backend', async () => {
    const restorePromise = component.restaurarModuloDesdeItems('clientes', [
      { id: 10, dniOrRuc: '12345678', nombres: 'Luis' },
      { id: 11, dniOrRuc: '87654321', nombres: 'Rosa' },
    ]);

    const requests = httpMock.match(apiClientes);
    expect(requests.length).toBe(2);

    const first = requests[0];
    expect(first.request.method).toBe('POST');
    expect(first.request.body.id).toBeUndefined();
    expect(first.request.body.nombres).toBe('Luis');
    first.flush({ id: 20 });

    const second = requests[1];
    expect(second.request.method).toBe('POST');
    expect(second.request.body.id).toBeUndefined();
    expect(second.request.body.nombres).toBe('Rosa');
    second.flush({ id: 21 });

    await restorePromise;
    expect(component.restaurando).toBeFalse();
  });

  it('should load general statistics from backend data', () => {
    expect(component.estadisticas.clientes).toBe(1);
    expect(component.estadisticas.proveedores).toBe(1);
    expect(component.estadisticas.categorias).toBe(1);
    expect(component.estadisticas.productos).toBe(1);
    expect(component.estadisticas.ventas).toBe(1);
    expect(component.estadisticas.montoVendido).toBe(25);
    expect(component.estadisticas.productosStockBajo).toBe(1);
    expect(component.estadisticas.productosSinStock).toBe(0);
    expect(component.espacioUtilizado).toContain('/ 2 GB');
  });
});
