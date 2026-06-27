import { HttpClientModule, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { CategoriaComponent } from './categoria.component';

describe('CategoriaComponent', () => {
  let component: CategoriaComponent;
  let fixture: ComponentFixture<CategoriaComponent>;
  let httpMock: HttpTestingController;

  const apiUrl = 'http://localhost:8080/api/categorias';
  const categorias = [
    { id: 1, nombre: 'Zapatillas', imagen: 'data:image/png;base64,zapatillas' },
    { id: 2, nombre: 'Ropa', imagen: '' },
    { id: 3, nombre: 'Tecnología', imagen: '' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriaComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: { hasPermission: () => true } },
      ],
    })
      .overrideComponent(CategoriaComponent, {
        remove: { imports: [HttpClientModule] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CategoriaComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(apiUrl).flush(categorias);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create and load categories from the microservice URL using GET', () => {
    expect(component).toBeTruthy();
    expect(component.categorias).toEqual(categorias);
  });

  it('should render simulated categories in the table', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Zapatillas');
    expect(compiled.textContent).toContain('Ropa');
    expect(compiled.querySelector('img[alt="Zapatillas"]')).not.toBeNull();
  });

  it('should filter categories by name', () => {
    component.busqueda = 'ropa';

    expect(component.categoriasFiltradas).toEqual([categorias[1]]);
  });

  it('should filter categories without accents', () => {
    component.busqueda = 'tecnologia';

    expect(component.categoriasFiltradas).toEqual([categorias[2]]);
  });

  it('should show a form with a required name field', () => {
    component.nuevaCategoria();
    fixture.detectChanges();

    const requiredInputs = fixture.nativeElement.querySelectorAll('form input[required]');

    expect(component.mostrarFormulario).toBeTrue();
    expect(requiredInputs.length).toBe(1);
  });

  it('should call PUT when editing a category', () => {
    component.editar(categorias[0]);
    component.formCategoria.nombre = 'Calzado';

    component.guardar();

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ id: 1, nombre: 'Calzado', imagen: 'data:image/png;base64,zapatillas' });
    req.flush({ id: 1, nombre: 'Calzado', imagen: 'data:image/png;base64,zapatillas' });

    httpMock.expectOne(apiUrl).flush(categorias);
    expect(component.mensajeExito).toBe('Categoría actualizada correctamente.');
  });

  it('should call POST when saving a new category and reset the form', () => {
    component.nuevaCategoria();
    component.formCategoria.nombre = 'Accesorios';

    component.guardar();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Accesorios', imagen: '' });
    req.flush({ id: 3, nombre: 'Accesorios', imagen: '' });
    httpMock.expectOne(apiUrl).flush(categorias);

    expect(component.mostrarFormulario).toBeFalse();
    expect(component.formCategoria).toEqual({ nombre: '', imagen: '' });
    expect(component.mensajeExito).toBe('Categoría agregada correctamente.');
  });

  it('should guard category deletion, delete after confirmation and cancel editing', () => {
    component.eliminarCategoria(undefined);
    httpMock.expectNone(`${apiUrl}/undefined`);

    component.solicitarEliminar(categorias[0]);
    component.confirmarAccion();
    httpMock.expectOne(`${apiUrl}/1`).flush({});
    httpMock.expectOne(apiUrl).flush(categorias);
    expect(component.mensajeExito).toBe('Categoría eliminada correctamente.');

    component.editar(categorias[0]);
    component.cancelar();

    expect(component.mostrarFormulario).toBeFalse();
    expect(component.editCategoria).toBeNull();
  });

  it('should ask before editing a category', () => {
    component.solicitarEditar(categorias[1]);

    expect(component.accionPendiente).toBe('editar');
    expect(component.mensajeConfirmacion).toContain('Ropa');

    component.confirmarAccion();

    expect(component.accionPendiente).toBeNull();
    expect(component.editCategoria).toEqual(categorias[1]);
    expect(component.mostrarFormulario).toBeTrue();
  });

  it('should show an error when trying to save without a required name', () => {
    component.nuevaCategoria();
    component.formCategoria.nombre = ' ';

    component.guardar();

    expect(component.errorFormulario).toBe('Revisa los campos obligatorios antes de guardar.');
    httpMock.expectNone(apiUrl);
  });

  it('should generate a category image using the written name as the prompt subject', () => {
    component.nuevaCategoria();
    component.formCategoria.nombre = 'Audífonos Inalámbricos';

    component.buscarImagenCategoriaWeb();

    const decodedUrl = decodeURIComponent(component.formCategoria.imagen || '');
    expect(decodedUrl).toContain('Audífonos Inalámbricos');
    expect(decodedUrl).toContain('model=flux');
    expect(decodedUrl).toContain('Main subject: Audífonos Inalámbricos');
    expect(component.mensajeImagenWeb).toContain('Generando');
    expect(component.cargandoImagenWeb).toBeTrue();
  });

  it('should return all categories for blank search and filter by id', () => {
    component.busqueda = ' ';
    expect(component.categoriasFiltradas).toEqual(categorias);

    component.busqueda = '1';
    expect(component.categoriasFiltradas).toEqual([categorias[0]]);
  });
});
