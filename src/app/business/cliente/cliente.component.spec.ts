import { HttpClientModule, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from '../../core/services/auth.service';
import { ClienteComponent } from './cliente.component';

describe('ClienteComponent', () => {
  let component: ClienteComponent;
  let fixture: ComponentFixture<ClienteComponent>;
  let httpMock: HttpTestingController;

  const apiUrl = 'http://localhost:8080/api/clientes';
  const clientes = [
    { id: 1, dniOrRuc: '20111111111', razonSocialONombre: 'Cliente Uno', direccion: 'Lima', telefono: '999111222' },
    { id: 2, dniOrRuc: '20222222222', razonSocialONombre: 'Cliente Dos', direccion: 'Cusco', telefono: '999333444' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { hasPermission: () => true } },
      ],
    })
      .overrideComponent(ClienteComponent, {
        remove: { imports: [HttpClientModule] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ClienteComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(apiUrl).flush(clientes);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create and load clients from the microservice URL using GET', () => {
    expect(component).toBeTruthy();
    expect(component.clientes).toEqual([
      jasmine.objectContaining(clientes[0]),
      jasmine.objectContaining(clientes[1]),
    ]);
  });

  it('should render simulated clients in the table', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Cliente Uno');
    expect(compiled.textContent).toContain('20111111111');
  });

  it('should filter clients by DNI/RUC or name', () => {
    component.busqueda = 'dos';

    expect(component.clientesFiltrados).toEqual([jasmine.objectContaining(clientes[1])]);
  });

  it('should filter clients by fallback name fields and ignore accents', () => {
    component.clientes = [
      { id: 3, dniOrRuc: '20333333333', razonSocialONombre: '', nombre: 'José Álvarez', direccion: 'Lima', telefono: '912345678' },
      { id: 4, dniOrRuc: '20444444444', razonSocialONombre: '', razonSocial: 'Comercial Norte', direccion: 'Piura', telefono: '923456789' },
    ];

    component.busqueda = 'jose';
    expect(component.clientesFiltrados).toEqual([component.clientes[0]]);

    component.busqueda = 'norte';
    expect(component.clientesFiltrados).toEqual([component.clientes[1]]);
  });

  it('should show a form with required fields and optional name when creating a client', () => {
    component.nuevoCliente();
    fixture.detectChanges();

    const requiredInputs = fixture.nativeElement.querySelectorAll('form input[required]');
    const nameInput = fixture.nativeElement.querySelector('form input[name="nombres"]') as HTMLInputElement;

    expect(component.mostrarFormulario).toBeTrue();
    expect(requiredInputs.length).toBe(4);
    expect(nameInput.required).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Apellido paterno');
    expect(fixture.nativeElement.textContent).toContain('Apellido materno');
    expect(fixture.nativeElement.textContent).not.toContain('Dirección');
    expect(fixture.nativeElement.textContent).not.toContain('Teléfono');
  });

  it('should call POST when saving a new client and refresh the list', () => {
    component.formCliente = {
      dniOrRuc: '12345678',
      razonSocialONombre: '',
      direccion: '',
      telefono: '',
      nombres: 'Cliente',
      apellidoPaterno: 'Nuevo',
      apellidoMaterno: 'Prueba',
    };

    component.guardar();

    const postReq = httpMock.expectOne(apiUrl);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body.razonSocialONombre).toBe('Cliente Nuevo Prueba');
    expect(postReq.request.body.direccion).toBe('');
    expect(postReq.request.body.telefono).toBe('');
    postReq.flush({ id: 3, ...component.formCliente });

    const refreshReq = httpMock.expectOne(apiUrl);
    expect(refreshReq.request.method).toBe('GET');
    refreshReq.flush(clientes);

    expect(component.mensajeExito).toBe('Cliente agregado correctamente.');
  });

  it('should keep the client form open and expose the HTTP status when saving fails', () => {
    component.formCliente = {
      dniOrRuc: '20260627',
      razonSocialONombre: '',
      direccion: '',
      telefono: '',
      nombres: 'CODEX_E2E_20260627',
      apellidoPaterno: 'LAB',
      apellidoMaterno: 'CLIENTE',
    };

    component.guardar();
    httpMock.expectOne(apiUrl).flush(null, { status: 403, statusText: 'Forbidden' });

    expect(component.errorFormulario).toBe('No se pudo guardar el cliente (HTTP 403).');
  });

  it('should keep phone numeric and warn when removing invalid characters', () => {
    component.formCliente.telefono = '999abc-11122';

    component.soloNumerosTelefono();

    expect(component.formCliente.telefono).toBe('99911122');
    expect(component.telefonoAdvertencia).toBeTrue();
  });

  it('should validate Peruvian mobile phone format', () => {
    component.formCliente.telefono = '812345678';
    expect(component.telefonoPeruInvalido).toBeTrue();

    component.formCliente.telefono = '912345678';
    expect(component.telefonoPeruInvalido).toBeFalse();
  });

  it('should call PUT when editing a client', () => {
    component.editar(clientes[0]);
    component.formCliente.dniOrRuc = '12345678';
    component.formCliente.nombres = 'Cliente';
    component.formCliente.apellidoPaterno = 'Editado';
    component.formCliente.apellidoMaterno = 'Uno';

    component.guardar();

    const putReq = httpMock.expectOne(`${apiUrl}/1`);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body.razonSocialONombre).toBe('Cliente Editado Uno');
    expect(putReq.request.body.telefono).toBe('');
    putReq.flush({ ...clientes[0], razonSocialONombre: 'Cliente Editado Uno', telefono: '' });

    httpMock.expectOne(apiUrl).flush(clientes);
  });

  it('should guard, request and confirm client deletion', () => {
    component.eliminarCliente(undefined);
    component.solicitarEliminar(clientes[0]);

    expect(component.accionPendiente).toBe('eliminar');
    expect(component.clientePendiente).toEqual(clientes[0]);

    component.cancelarConfirmacion();
    expect(component.accionPendiente).toBeNull();

    component.solicitarEliminar(clientes[0]);
    component.confirmarAccion();

    httpMock.expectOne(`${apiUrl}/1`).flush({});
    httpMock.expectOne(apiUrl).flush(clientes);

    expect(component.accionPendiente).toBeNull();
    expect(component.mensajeExito).toBe('Cliente eliminado correctamente.');
  });

  it('should request confirmation before editing a client', () => {
    component.solicitarEditar(clientes[0]);

    expect(component.accionPendiente).toBe('editar');
    expect(component.clientePendiente).toEqual(clientes[0]);

    component.confirmarAccion();

    expect(component.accionPendiente).toBeNull();
    expect(component.editCliente).toEqual(clientes[0]);
    expect(component.mostrarFormulario).toBeTrue();
  });

  it('should return all clients for blank search and filter by DNI/RUC', () => {
    component.busqueda = ' ';
    expect(component.clientesFiltrados).toEqual([
      jasmine.objectContaining(clientes[0]),
      jasmine.objectContaining(clientes[1]),
    ]);

    component.busqueda = '20111111111';
    expect(component.clientesFiltrados).toEqual([jasmine.objectContaining(clientes[0])]);
  });
});
