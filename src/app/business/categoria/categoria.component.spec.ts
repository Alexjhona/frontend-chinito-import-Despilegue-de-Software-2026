import { HttpClientModule, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoriaComponent } from './categoria.component';

describe('CategoriaComponent', () => {
  let component: CategoriaComponent;
  let fixture: ComponentFixture<CategoriaComponent>;
  let httpMock: HttpTestingController;

  const apiUrl = 'http://localhost:8080/api/categorias';
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
});
