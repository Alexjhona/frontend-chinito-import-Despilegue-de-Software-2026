import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { DataRefreshService } from '../services/data-refresh.service';
import { AuditService } from '../services/audit.service';

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const TRACKED_PREFIXES = [
  'http://localhost:8080/api/',
  'http://localhost:8080/auth/trabajadores',
  '/api/',
  '/auth/trabajadores',
];

export const dataRefreshInterceptor: HttpInterceptorFn = (request, next) => {
  const refreshService = inject(DataRefreshService);
  const auditService = inject(AuditService);
  const shouldNotify = MUTATION_METHODS.includes(request.method.toUpperCase()) &&
    TRACKED_PREFIXES.some(prefix => request.url.startsWith(prefix));

  return next(request).pipe(
    tap(event => {
      if (shouldNotify && event instanceof HttpResponse) {
        refreshService.notify(request.url);
        auditService.registrar(describirAccion(request.method, request.url));
      }
    })
  );
};

function describirAccion(method: string, url: string): string {
  const accion = method.toUpperCase();
  const recurso = url.toLowerCase();

  if (recurso.includes('/productos')) return accion === 'POST' ? 'Producto creado' : accion === 'PUT' || accion === 'PATCH' ? 'Producto editado' : 'Producto eliminado';
  if (recurso.includes('/ventas')) return accion === 'POST' ? 'Venta realizada' : accion === 'DELETE' ? 'Venta eliminada' : 'Venta editada';
  if (recurso.includes('/clientes')) return accion === 'POST' ? 'Cliente registrado' : accion === 'DELETE' ? 'Cliente eliminado' : 'Cliente editado';
  if (recurso.includes('/trabajadores')) return accion === 'POST' ? 'Trabajador creado' : accion === 'DELETE' ? 'Trabajador eliminado' : 'Trabajador editado';
  if (recurso.includes('/categorias')) return accion === 'POST' ? 'Categoría creada' : accion === 'DELETE' ? 'Categoría eliminada' : 'Categoría editada';
  if (recurso.includes('/proveedores')) return accion === 'POST' ? 'Proveedor creado' : accion === 'DELETE' ? 'Proveedor eliminado' : 'Proveedor editado';

  return `Cambio ${accion}`;
}
