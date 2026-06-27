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

interface ResourceActions {
  path: string;
  created: string;
  updated: string;
  deleted: string;
}

const RESOURCE_ACTIONS: ResourceActions[] = [
  { path: '/productos', created: 'Producto creado', updated: 'Producto editado', deleted: 'Producto eliminado' },
  { path: '/ventas', created: 'Venta realizada', updated: 'Venta editada', deleted: 'Venta eliminada' },
  { path: '/clientes', created: 'Cliente registrado', updated: 'Cliente editado', deleted: 'Cliente eliminado' },
  { path: '/trabajadores', created: 'Trabajador creado', updated: 'Trabajador editado', deleted: 'Trabajador eliminado' },
  { path: '/categorias', created: 'Categoría creada', updated: 'Categoría editada', deleted: 'Categoría eliminada' },
  { path: '/proveedores', created: 'Proveedor creado', updated: 'Proveedor editado', deleted: 'Proveedor eliminado' },
];

export const dataRefreshInterceptor: HttpInterceptorFn = (request, next) => {
  const refreshService = inject(DataRefreshService);
  const auditService = inject(AuditService);
  const shouldNotify = debeNotificar(request.method, request.url);

  return next(request).pipe(
    tap(event => {
      if (shouldNotify && event instanceof HttpResponse) {
        refreshService.notify(request.url);
        auditService.registrar(describirAccion(request.method, request.url));
      }
    })
  );
};

function debeNotificar(method: string, url: string): boolean {
  return MUTATION_METHODS.includes(method.toUpperCase()) &&
    TRACKED_PREFIXES.some(prefix => url.startsWith(prefix));
}

function describirAccion(method: string, url: string): string {
  const accion = method.toUpperCase();
  const recurso = RESOURCE_ACTIONS.find(item => url.toLowerCase().includes(item.path));

  return recurso ? obtenerDescripcion(recurso, accion) : `Cambio ${accion}`;
}

function obtenerDescripcion(recurso: ResourceActions, accion: string): string {
  if (accion === 'POST') return recurso.created;
  if (accion === 'DELETE') return recurso.deleted;
  return recurso.updated;
}
