import { HttpClientModule, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoriaComponent } from './categoria.component';

describe('CategoriaComponent', () => {
  let component: CategoriaComponent;
  let fixture: ComponentFixture<CategoriaComponent>;
  let httpMock: HttpTestingController;

  const apiUrl = 'https://mean-election-candle-joint.trycloudflare.com/api/categorias';
  const categorias = [
    { id: 1, nombre: 'Zapatillas' },
    { id: 2, nombre: 'Ropa' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
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
  });

  it('should filter categories by name', () => {
    component.busqueda = 'ropa';

    expect(component.categoriasFiltradas).toEqual([categorias[1]]);
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
    expect(req.request.body).toEqual({ id: 1, nombre: 'Calzado' });
    req.flush({ id: 1, nombre: 'Calzado' });

    httpMock.expectOne(apiUrl).flush(categorias);
  });

  it('should call POST when saving a new category and reset the form', () => {
    component.nuevaCategoria();
    component.formCategoria.nombre = 'Accesorios';

    component.guardar();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Accesorios' });
    req.flush({ id: 3, nombre: 'Accesorios' });
    httpMock.expectOne(apiUrl).flush(categorias);

    expect(component.mostrarFormulario).toBeFalse();
    expect(component.formCategoria).toEqual({ nombre: '' });
  });

  it('should guard category deletion, delete after confirmation and cancel editing', () => {
    const confirmSpy = spyOn(window, 'confirm').and.returnValues(false, true);

    component.eliminarCategoria(undefined);
    component.eliminarCategoria(2);
    httpMock.expectNone(`${apiUrl}/2`);
    component.eliminarCategoria(1);
    httpMock.expectOne(`${apiUrl}/1`).flush({});
    httpMock.expectOne(apiUrl).flush(categorias);

    component.editar(categorias[0]);
    component.cancelar();

    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(component.mostrarFormulario).toBeFalse();
    expect(component.editCategoria).toBeNull();
  });

  it('should return all categories for blank search and filter by id', () => {
    component.busqueda = ' ';
    expect(component.categoriasFiltradas).toEqual(categorias);

    component.busqueda = '1';
    expect(component.categoriasFiltradas).toEqual([categorias[0]]);
  });
});
