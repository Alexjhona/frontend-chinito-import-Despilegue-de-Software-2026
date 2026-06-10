import { HttpClientModule, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductoComponent } from './producto.component';

describe('ProductoComponent', () => {
  let component: ProductoComponent;
  let fixture: ComponentFixture<ProductoComponent>;
  let httpMock: HttpTestingController;

  const productosUrl = 'https://mean-election-candle-joint.trycloudflare.com/api/productos';
  const categoriasUrl = 'https://mean-election-candle-joint.trycloudflare.com/api/categorias';
  const stockUrl = 'https://mean-election-candle-joint.trycloudflare.com/api/stock';
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

  it('should use zero stock when the stock endpoint fails', () => {
    component.cargarProductos();

    httpMock.expectOne(productosUrl).flush([
      { ...productos[0], id: 12, stock: undefined },
    ]);
    httpMock.expectOne(`${stockUrl}/12`).flush(null, { status: 500, statusText: 'Error' });

    expect(component.productos[0].stock).toBe(0);
  });

  it('should show an error when product creation fails', () => {
    component.formProducto = { ...productos[0], categoriaId: 1, stock: 5 };

    component.guardar();

    httpMock.expectOne(productosUrl).flush(null, { status: 500, statusText: 'Error' });
    expect(component.mensaje).toBe('No se pudo registrar el producto');
    httpMock.expectNone(stockUrl);
  });

  it('should show a warning when stock creation fails', () => {
    component.formProducto = { ...productos[0], categoriaId: 1, stock: 5 };

    component.guardar();

    httpMock.expectOne(productosUrl).flush({ id: 12, ...component.formProducto });
    httpMock.expectOne(stockUrl).flush(null, { status: 500, statusText: 'Error' });
    expect(component.mensaje).toBe('Producto registrado, pero no se pudo crear el stock');
  });

  it('should show an error when product update fails', () => {
    component.editar({ ...productos[0], stock: 15 });

    component.guardar();

    httpMock.expectOne(`${productosUrl}/10`).flush(null, { status: 500, statusText: 'Error' });
    expect(component.mensaje).toBe('No se pudo actualizar el producto');
    httpMock.expectNone(`${stockUrl}/10`);
  });

  it('should show a warning when stock update fails', () => {
    component.editar({ ...productos[0], stock: 15 });

    component.guardar();

    httpMock.expectOne(`${productosUrl}/10`).flush({ ...productos[0] });
    httpMock.expectOne(`${stockUrl}/10`).flush(null, { status: 500, statusText: 'Error' });
    expect(component.mensaje).toBe('Producto actualizado, pero no se pudo guardar el stock');
  });

  it('should delete a product after confirmation and refresh products', () => {
    spyOn(window, 'confirm').and.returnValue(true);

    component.eliminarProducto(10);

    const deleteReq = httpMock.expectOne(`${productosUrl}/10`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush({});
    httpMock.expectOne(productosUrl).flush([]);
  });

  it('should not delete a product without an id or when confirmation is cancelled', () => {
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);

    component.eliminarProducto(undefined);
    component.eliminarProducto(10);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    httpMock.expectNone(`${productosUrl}/10`);
  });

  it('should update category autocomplete for blank, exact and partial values', () => {
    component.formProducto.categoriaId = 1;
    component.busquedaCategoriaInput = '   ';
    component.actualizarCategoriasFiltradas();
    expect(component.formProducto.categoriaId).toBeNull();
    expect(component.categoriasFiltradas).toEqual(categorias);

    component.busquedaCategoriaInput = 'zapatillas';
    component.actualizarCategoriasFiltradas();
    expect(component.formProducto.categoriaId).toBe(1);
    expect(component.busquedaCategoriaInput).toBe('Zapatillas');
    expect(component.categoriasFiltradas).toEqual([]);

    component.busquedaCategoriaInput = 'ropa';
    component.actualizarCategoriasFiltradas();
    expect(component.formProducto.categoriaId).toBeNull();
    expect(component.getNombreCategoria(999)).toBe('');
  });

  it('should reset the form when cancelling and handle products without a known category', () => {
    component.editar({ ...productos[0], categoriaId: 999 });
    expect(component.busquedaCategoriaInput).toBe('');

    component.cancelar();

    expect(component.mostrarFormulario).toBeFalse();
    expect(component.editProducto).toBeNull();
    expect(component.formProducto.categoriaId).toBeNull();
  });

  it('should filter products independently by category, name and internal code', () => {
    component.productos = [
      ...component.productos,
      {
        id: 11,
        categoriaId: 999,
        codigoInterno: 'CODE-002',
        nombre: 'Polo',
        precioVenta: 30,
        precioCompra: 15,
      },
    ];

    component.busquedaCategoria = 'zapatillas';
    component.busquedaProducto = '';
    expect(component.productosFiltrados.map(producto => producto.id)).toEqual([10]);

    component.busquedaCategoria = '';
    component.busquedaProducto = 'code-002';
    expect(component.productosFiltrados.map(producto => producto.id)).toEqual([11]);

    component.busquedaProducto = 'missing';
    expect(component.productosFiltrados).toEqual([]);
  });
});
