import { HttpClientModule, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteComponent } from './cliente.component';

describe('ClienteComponent', () => {
  let component: ClienteComponent;
  let fixture: ComponentFixture<ClienteComponent>;
  let httpMock: HttpTestingController;

  const apiUrl = 'https://mean-election-candle-joint.trycloudflare.com/api/clientes';
  const clientes = [
    { id: 1, dniOrRuc: '20111111111', razonSocialONombre: 'Cliente Uno', direccion: 'Lima', telefono: '999111222' },
    { id: 2, dniOrRuc: '20222222222', razonSocialONombre: 'Cliente Dos', direccion: 'Cusco', telefono: '999333444' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
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
    expect(component.clientes).toEqual(clientes);
  });

  it('should render simulated clients in the table', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Cliente Uno');
    expect(compiled.textContent).toContain('20111111111');
  });

  it('should filter clients by DNI/RUC or name', () => {
    component.busqueda = 'dos';

    expect(component.clientesFiltrados).toEqual([clientes[1]]);
  });

  it('should show a form with required fields when creating a client', () => {
    component.nuevoCliente();
    fixture.detectChanges();

    const requiredInputs = fixture.nativeElement.querySelectorAll('form input[required]');

    expect(component.mostrarFormulario).toBeTrue();
    expect(requiredInputs.length).toBe(4);
  });

  it('should call POST when saving a new client and refresh the list', () => {
    component.formCliente = {
      dniOrRuc: '20333333333',
      razonSocialONombre: 'Cliente Nuevo',
      direccion: 'Arequipa',
      telefono: '988777666',
    };

    component.guardar();

    const postReq = httpMock.expectOne(apiUrl);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual(component.formCliente);
    postReq.flush({ id: 3, ...component.formCliente });

    const refreshReq = httpMock.expectOne(apiUrl);
    expect(refreshReq.request.method).toBe('GET');
    refreshReq.flush(clientes);
  });

  it('should call PUT when editing a client', () => {
    component.editar(clientes[0]);
    component.formCliente.telefono = '900000000';

    component.guardar();

    const putReq = httpMock.expectOne(`${apiUrl}/1`);
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body.telefono).toBe('900000000');
    putReq.flush({ ...clientes[0], telefono: '900000000' });

    httpMock.expectOne(apiUrl).flush(clientes);
  });

  it('should guard, cancel and confirm client deletion', () => {
    const confirmSpy = spyOn(window, 'confirm').and.returnValues(false, true);

    component.eliminarCliente(undefined);
    component.eliminarCliente(2);
    httpMock.expectNone(`${apiUrl}/2`);
    component.eliminarCliente(1);
    httpMock.expectOne(`${apiUrl}/1`).flush({});
    httpMock.expectOne(apiUrl).flush(clientes);

    component.editar(clientes[0]);
    component.cancelar();

    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(component.editCliente).toBeNull();
    expect(component.mostrarFormulario).toBeFalse();
  });

  it('should return all clients for blank search and filter by DNI/RUC', () => {
    component.busqueda = ' ';
    expect(component.clientesFiltrados).toEqual(clientes);

    component.busqueda = '20111111111';
    expect(component.clientesFiltrados).toEqual([clientes[0]]);
  });
});
