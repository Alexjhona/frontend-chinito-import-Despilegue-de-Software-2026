import { HttpClientModule, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProductoComponent } from './producto.component';

describe('ProductoComponent', () => {
  let component: ProductoComponent;
  let fixture: ComponentFixture<ProductoComponent>;
  let httpMock: HttpTestingController;

  const productosUrl = 'http://localhost:8080/api/productos';
  const categoriasUrl = 'http://localhost:8080/api/categorias';
  const stockUrl = 'http://localhost:8080/api/stock';
  const categorias = [
    { id: 1, nombre: 'Zapatillas', imagen: 'data:image/png;base64,categoria-uno' },
    { id: 2, nombre: 'Tecnología', imagen: 'data:image/png;base64,categoria-dos' },
  ];
  const productos = [
    {
      id: 10,
      categoriaId: 1,
      codigoInterno: 'PROD-001',
      nombre: 'Zapatilla Urbana',
      imagen: 'data:image/png;base64,producto-uno',
      precioVenta: 120,
      precioCompra: 80,
      moneda: 'Soles',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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
    expect(compiled.querySelector('img[alt="Zapatilla Urbana"]')).not.toBeNull();
    expect(compiled.querySelector('img[alt="Zapatillas"]')).not.toBeNull();
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
      imagen: 'data:image/png;base64,producto-dos',
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
    component.formProducto.categoriaId = null;

    component.guardar();

    expect(component.errorFormulario).toBe('Revisa los campos obligatorios antes de guardar.');
    httpMock.expectNone(productosUrl);
  });

  it('should not call the backend when saving without a product name', () => {
    component.formProducto = {
      categoriaId: 1,
      codigoInterno: 'PROD-003',
      nombre: '   ',
      imagen: '',
      precioVenta: 60,
      precioCompra: 30,
      moneda: 'Soles',
      stock: 10,
    };

    component.guardar();

    expect(component.errorFormulario).toBe('Revisa los campos obligatorios antes de guardar.');
    httpMock.expectNone(productosUrl);
  });

  it('should not call the backend when saving with zero stock', () => {
    component.formProducto = {
      categoriaId: 1,
      codigoInterno: 'PROD-004',
      nombre: 'Cable USB-C',
      imagen: '',
      precioVenta: 60,
      precioCompra: 30,
      moneda: 'Soles',
      stock: 0,
    };

    component.guardar();

    expect(component.errorFormulario).toBe('No se puede agregar un producto con stock 0. Ingresa una cantidad mayor que 0.');
    httpMock.expectNone(productosUrl);
  });

  it('should use zero stock when the stock endpoint fails', () => {
    component.cargarProductos();

    httpMock.expectOne(productosUrl).flush([
      { ...productos[0], id: 12, stock: undefined },
    ]);
    httpMock.expectOne(`${stockUrl}/12`).flush(null, { status: 500, statusText: 'Error' });

    expect(component.productos[0].stock).toBe(0);
  });

  it('should warn only when stock is empty or lower than three units', () => {
    expect(component.estadoStock({ ...productos[0], stock: 0 })).toBe('agotado');
    expect(component.estadoStock({ ...productos[0], stock: 2 })).toBe('bajo');
    expect(component.estadoStock({ ...productos[0], stock: 3 })).toBe('ok');
    expect(component.advertenciaStock({ ...productos[0], stock: 2 })).toContain('quedan 2');
  });

  it('should generate a product image using the product name as the main prompt subject', () => {
    component.formProducto.nombre = 'Airpods';
    component.formProducto.categoriaId = 2;

    component.buscarImagenProductoWeb();

    const decodedUrl = decodeURIComponent(component.formProducto.imagen || '');
    expect(decodedUrl).toContain('Airpods');
    expect(decodedUrl).toContain('Main subject: Airpods');
    expect(decodedUrl).toContain('model=flux');
    expect(component.mensajeImagenWeb).toContain('Generando');
    expect(component.cargandoImagenWeb).toBeTrue();
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
    component.solicitarEliminar(component.productos[0]);
    expect(component.accionPendiente).toBe('eliminar');
    expect(component.mensajeConfirmacion).toContain('Zapatilla Urbana');

    component.confirmarAccion();

    const deleteReq = httpMock.expectOne(`${productosUrl}/10`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush({});
    httpMock.expectOne(productosUrl).flush([]);
    expect(component.mensaje).toBe('Producto eliminado correctamente');
  });

  it('should not delete a product without an id or when confirmation is cancelled', () => {
    component.eliminarProducto(undefined);
    component.solicitarEliminar(component.productos[0]);
    component.cancelarConfirmacion();

    expect(component.accionPendiente).toBeNull();
    httpMock.expectNone(`${productosUrl}/10`);
  });

  it('should ask before editing a product', () => {
    component.solicitarEditar(component.productos[0]);

    expect(component.accionPendiente).toBe('editar');
    expect(component.tituloConfirmacion).toBe('Editar producto');

    component.confirmarAccion();

    expect(component.accionPendiente).toBeNull();
    expect(component.editProducto).toEqual(component.productos[0]);
    expect(component.mostrarFormulario).toBeTrue();
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

    component.busquedaCategoriaInput = 'tecnologia';
    component.actualizarCategoriasFiltradas();
    expect(component.formProducto.categoriaId).toBe(2);
    expect(component.busquedaCategoriaInput).toBe('Tecnología');

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
        categoriaId: 2,
        codigoInterno: 'CODE-002',
        nombre: 'Polo',
        precioVenta: 30,
        precioCompra: 15,
      },
    ];

    component.busquedaCategoria = 'zapatillas';
    component.busquedaProducto = '';
    expect(component.productosFiltrados.map(producto => producto.id)).toEqual([10]);

    component.busquedaCategoria = 'tecnologia';
    expect(component.productosFiltrados.map(producto => producto.id)).toEqual([11]);

    component.busquedaCategoria = '';
    component.busquedaProducto = 'code-002';
    expect(component.productosFiltrados.map(producto => producto.id)).toEqual([11]);

    component.busquedaProducto = 'missing';
    expect(component.productosFiltrados).toEqual([]);
  });
});
