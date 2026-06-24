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
    { id: 1, dniOrRuc: '20555555555', razonSocialONombre: 'Proveedor Uno', correoElectronico: 'uno@correo.com', telefono: '911111111' },
    { id: 2, dniOrRuc: '20666666666', razonSocialONombre: 'Proveedor Dos', correoElectronico: 'dos@correo.com', telefono: '922222222' },
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

  it('should filter providers by fallback name fields and ignore accents', () => {
    component.proveedores = [
      { id: 3, dniOrRuc: '20777777777', razonSocialONombre: '', nombre: 'José Repuestos', correoElectronico: 'jose@correo.com', telefono: '933333333' },
      { id: 4, dniOrRuc: '20888888888', razonSocialONombre: '', razonSocial: 'Comercial Sur', correoElectronico: 'sur@correo.com', telefono: '944444444' },
    ];

    component.busqueda = 'jose';
    expect(component.proveedoresFiltrados).toEqual([component.proveedores[0]]);

    component.busqueda = 'sur';
    expect(component.proveedoresFiltrados).toEqual([component.proveedores[1]]);
  });

  it('should show a form with required fields and optional name when creating a provider', () => {
    component.nuevoProveedor();
    fixture.detectChanges();

    const requiredInputs = fixture.nativeElement.querySelectorAll('form input[required]');
    const nameInput = fixture.nativeElement.querySelector('form input[name="razonSocialONombre"]') as HTMLInputElement;

    expect(component.mostrarFormulario).toBeTrue();
    expect(requiredInputs.length).toBe(3);
    expect(nameInput.required).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Opcional');
  });

  it('should call POST when saving a new provider', () => {
    component.formProveedor = {
      dniOrRuc: '20777777777',
      razonSocialONombre: 'Proveedor Nuevo',
      correoElectronico: 'nuevo@correo.com',
      telefono: '933333333',
    };

    component.guardar();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(component.formProveedor);
    req.flush({ id: 3, ...component.formProveedor });

    httpMock.expectOne(apiUrl).flush(proveedores);

    expect(component.mensajeExito).toBe('Proveedor agregado correctamente.');
  });

  it('should keep phone numeric and warn when removing invalid characters', () => {
    component.formProveedor.telefono = '999abc-11122';

    component.soloNumerosTelefono();

    expect(component.formProveedor.telefono).toBe('99911122');
    expect(component.telefonoAdvertencia).toBeTrue();
  });

  it('should validate Peruvian mobile phone format', () => {
    component.formProveedor.telefono = '812345678';
    expect(component.telefonoPeruInvalido).toBeTrue();

    component.formProveedor.telefono = '912345678';
    expect(component.telefonoPeruInvalido).toBeFalse();
  });

  it('should request and confirm provider deletion', () => {
    component.solicitarEliminar(proveedores[1]);

    expect(component.accionPendiente).toBe('eliminar');
    expect(component.proveedorPendiente).toEqual(proveedores[1]);

    component.cancelarConfirmacion();
    expect(component.accionPendiente).toBeNull();

    component.solicitarEliminar(proveedores[1]);
    component.confirmarAccion();

    const req = httpMock.expectOne(`${apiUrl}/2`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});

    httpMock.expectOne(apiUrl).flush(proveedores);

    expect(component.accionPendiente).toBeNull();
    expect(component.mensajeExito).toBe('Proveedor eliminado correctamente.');
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

  it('should request confirmation before editing a provider', () => {
    component.solicitarEditar(proveedores[0]);

    expect(component.accionPendiente).toBe('editar');
    expect(component.proveedorPendiente).toEqual(proveedores[0]);

    component.confirmarAccion();

    expect(component.accionPendiente).toBeNull();
    expect(component.editProveedor).toEqual(proveedores[0]);
    expect(component.mostrarFormulario).toBeTrue();
  });

  it('should guard provider deletion and cancel editing', () => {
    component.eliminarProveedor(undefined);
    component.solicitarEditar(proveedores[0]);
    component.confirmarAccion();
    component.cancelar();

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
