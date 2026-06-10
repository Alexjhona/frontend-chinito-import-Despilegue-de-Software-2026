import { HttpClientModule, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProveedorComponent } from './proveedor.component';

describe('ProveedorComponent', () => {
  let component: ProveedorComponent;
  let fixture: ComponentFixture<ProveedorComponent>;
  let httpMock: HttpTestingController;

  const apiUrl = 'https://mean-election-candle-joint.trycloudflare.com/api/proveedores';
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

  it('should call PUT when editing a provider and reset the form', () => {
    component.editar(proveedores[0]);
    component.formProveedor.telefono = '900000000';

    component.guardar();

    const req = httpMock.expectOne(`${apiUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.telefono).toBe('900000000');
    req.flush({ ...component.formProveedor });
    httpMock.expectOne(apiUrl).flush(proveedores);

    expect(component.editProveedor).toBeNull();
    expect(component.mostrarFormulario).toBeFalse();
  });

  it('should guard or cancel provider deletion and cancel editing', () => {
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);

    component.eliminarProveedor(undefined);
    component.eliminarProveedor(1);
    component.editar(proveedores[0]);
    component.cancelar();

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(component.editProveedor).toBeNull();
    expect(component.mostrarFormulario).toBeFalse();
    httpMock.expectNone(`${apiUrl}/1`);
  });

  it('should return all providers for blank search and filter by DNI/RUC', () => {
    component.busqueda = ' ';
    expect(component.proveedoresFiltrados).toEqual(proveedores);

    component.busqueda = '20555555555';
    expect(component.proveedoresFiltrados).toEqual([proveedores[0]]);
  });
});
