import { HttpClientModule, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductoComponent } from './producto.component';

describe('ProductoComponent', () => {
  let component: ProductoComponent;
  let fixture: ComponentFixture<ProductoComponent>;
  let httpMock: HttpTestingController;

  const productosUrl = 'http://localhost:8080/api/productos';
  const categoriasUrl = 'http://localhost:8080/api/categorias';
  const stockUrl = 'http://localhost:8080/api/stock';
  const categorias = [{ id: 1, nombre: 'Zapatillas' }];
  const productos = [
    {
      id: 10,
      categoriaId: 1,
      codigoInterno: 'PROD-001',
      nombre: 'Zapatilla Urbana',
      precioVenta: 120,
      precioCompra: 80,
      moneda: 'Soles',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideComponent(ProductoComponent, {
        remove: { imports: [HttpClientModule] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProductoComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(productosUrl).flush(productos);
    httpMock.expectOne(`${stockUrl}/10`).flush({ cantidad: 15 });
    httpMock.expectOne(categoriasUrl).flush(categorias);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create and load products, categories and stock using GET', () => {
    expect(component).toBeTruthy();
    expect(component.productos[0].stock).toBe(15);
    expect(component.categorias).toEqual(categorias);
  });

  it('should render simulated product data in the table', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Zapatilla Urbana');
    expect(compiled.textContent).toContain('Zapatillas');
    expect(compiled.textContent).toContain('15');
  });

  it('should filter products by category and product text', () => {
    component.busquedaCategoria = 'zapatillas';
    component.busquedaProducto = 'urbana';

    expect(component.productosFiltrados).toEqual(component.productos);
  });

  it('should show a form with required fields when creating a product', () => {
    component.nuevoProducto();
    fixture.detectChanges();

    const requiredInputs = fixture.nativeElement.querySelectorAll('form input[required]');

    expect(component.mostrarFormulario).toBeTrue();
    expect(requiredInputs.length).toBe(6);
  });

  it('should call POST for product and stock when saving a new product', () => {
    component.formProducto = {
      categoriaId: 1,
      codigoInterno: 'PROD-002',
      nombre: 'Polo Deportivo',
      precioVenta: 50,
      precioCompra: 25,
      moneda: 'Soles',
      stock: 20,
    };

    component.guardar();

    const productReq = httpMock.expectOne(productosUrl);
    expect(productReq.request.method).toBe('POST');
    expect(productReq.request.body).toEqual(component.formProducto);
    productReq.flush({ id: 11, ...component.formProducto });

    const stockReq = httpMock.expectOne(stockUrl);
    expect(stockReq.request.method).toBe('POST');
    expect(stockReq.request.body).toEqual({ productoId: 11, cantidad: 20 });
    stockReq.flush({});

    httpMock.expectOne(productosUrl).flush(productos);
    httpMock.expectOne(`${stockUrl}/10`).flush({ cantidad: 15 });
  });

  it('should call PUT for product and stock when editing an existing product', () => {
    component.editar({ ...productos[0], stock: 15 });
    component.formProducto.stock = 8;

    component.guardar();

    const productReq = httpMock.expectOne(`${productosUrl}/10`);
    expect(productReq.request.method).toBe('PUT');
    productReq.flush({ ...productos[0], stock: 8 });

    const stockReq = httpMock.expectOne(`${stockUrl}/10`);
    expect(stockReq.request.method).toBe('PUT');
    expect(stockReq.request.body).toEqual({ cantidad: 8 });
    stockReq.flush({ productoId: 10, cantidad: 8 });

    expect(component.mensaje).toBe('Producto actualizado correctamente');

    httpMock.expectOne(productosUrl).flush(productos);
    httpMock.expectOne(`${stockUrl}/10`).flush({ cantidad: 8 });
  });

  it('should not call the backend when saving without a valid category', () => {
    spyOn(window, 'alert');
    component.formProducto.categoriaId = null;

    component.guardar();

    expect(window.alert).toHaveBeenCalledWith(jasmine.stringMatching(/categor/i));
  });
});
