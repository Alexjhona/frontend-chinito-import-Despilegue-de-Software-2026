import { HttpClientModule, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProveedorComponent } from './proveedor.component';

describe('ProveedorComponent', () => {
  let component: ProveedorComponent;
  let fixture: ComponentFixture<ProveedorComponent>;
  let httpMock: HttpTestingController;

  const apiUrl = 'http://localhost:8080/api/proveedores';
  const proveedores = [
    { id: 1, dniOrRuc: '20555555555', razonSocialONombre: 'Proveedor Uno', direccion: 'Lima', telefono: '911111111' },
    { id: 2, dniOrRuc: '20666666666', razonSocialONombre: 'Proveedor Dos', direccion: 'Piura', telefono: '922222222' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProveedorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideComponent(ProveedorComponent, {
        remove: { imports: [HttpClientModule] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProveedorComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(apiUrl).flush(proveedores);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create and load providers from the microservice URL using GET', () => {
    expect(component).toBeTruthy();
    expect(component.proveedores).toEqual(proveedores);
  });

  it('should filter providers by DNI/RUC or name', () => {
    component.busqueda = 'dos';

    expect(component.proveedoresFiltrados).toEqual([proveedores[1]]);
  });

  it('should show a form with required fields when creating a provider', () => {
    component.nuevoProveedor();
    fixture.detectChanges();

    const requiredInputs = fixture.nativeElement.querySelectorAll('form input[required]');

    expect(component.mostrarFormulario).toBeTrue();
    expect(requiredInputs.length).toBe(4);
  });

  it('should call POST when saving a new provider', () => {
    component.formProveedor = {
      dniOrRuc: '20777777777',
      razonSocialONombre: 'Proveedor Nuevo',
      direccion: 'Tacna',
      telefono: '933333333',
    };

    component.guardar();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(component.formProveedor);
    req.flush({ id: 3, ...component.formProveedor });

    httpMock.expectOne(apiUrl).flush(proveedores);
  });

  it('should call DELETE after confirming provider deletion', () => {
    spyOn(window, 'confirm').and.returnValue(true);

    component.eliminarProveedor(2);

    const req = httpMock.expectOne(`${apiUrl}/2`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    httpMock.expectOne(apiUrl).flush(proveedores);
  });
});
