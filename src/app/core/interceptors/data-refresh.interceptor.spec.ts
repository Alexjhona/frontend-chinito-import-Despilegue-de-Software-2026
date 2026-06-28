import { HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuditService } from '../services/audit.service';
import { DataRefreshService } from '../services/data-refresh.service';
import { dataRefreshInterceptor } from './data-refresh.interceptor';

describe('dataRefreshInterceptor', () => {
  let refreshService: jasmine.SpyObj<DataRefreshService>;
  let auditService: jasmine.SpyObj<AuditService>;

  beforeEach(() => {
    refreshService = jasmine.createSpyObj('DataRefreshService', ['notify']);
    auditService = jasmine.createSpyObj('AuditService', ['registrar']);
    TestBed.configureTestingModule({
      providers: [
        { provide: DataRefreshService, useValue: refreshService },
        { provide: AuditService, useValue: auditService },
      ],
    });
  });

  function intercept(method: string, url: string): void {
    const request = new HttpRequest(method, url, null);
    TestBed.runInInjectionContext(() => {
      dataRefreshInterceptor(request, () => of(new HttpResponse({ status: 200 }))).subscribe();
    });
  }

  it('should notify and audit tracked mutation methods case-insensitively', () => {
    intercept('post', 'http://localhost:8080/api/productos');
    intercept('PUT', '/api/clientes/1');
    intercept('PATCH', '/api/proveedores/2');
    intercept('DELETE', '/api/ventas/3');

    expect(refreshService.notify).toHaveBeenCalledTimes(4);
    expect(auditService.registrar).toHaveBeenCalledWith('Producto creado');
    expect(auditService.registrar).toHaveBeenCalledWith('Cliente editado');
    expect(auditService.registrar).toHaveBeenCalledWith('Proveedor editado');
    expect(auditService.registrar).toHaveBeenCalledWith('Venta eliminada');
  });

  it('should audit worker mutations and unknown tracked resources', () => {
    intercept('POST', 'http://localhost:8080/auth/trabajadores');
    intercept('POST', '/api/compras');

    expect(auditService.registrar).toHaveBeenCalledWith('Trabajador creado');
    expect(auditService.registrar).toHaveBeenCalledWith('Cambio POST');
  });

  it('should ignore reads and untracked URLs', () => {
    intercept('GET', '/api/productos');
    intercept('POST', 'https://example.com/api/productos');

    expect(refreshService.notify).not.toHaveBeenCalled();
    expect(auditService.registrar).not.toHaveBeenCalled();
  });
});
