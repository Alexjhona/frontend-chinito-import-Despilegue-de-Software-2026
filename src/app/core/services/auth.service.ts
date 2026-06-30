import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export type RolUsuario = 'OWNER' | 'ADMIN' | 'SUB_ADMIN' | 'VENDEDOR' | 'ALMACENERO' | 'COMPRAS' | 'CAJERO';
export type Permiso =
  | 'dashboard'
  | 'clientes'
  | 'clientes-write'
  | 'proveedores'
  | 'proveedores-write'
  | 'categorias'
  | 'categorias-write'
  | 'productos'
  | 'productos-write'
  | 'ventas'
  | 'trabajadores'
  | 'ajustes'
  | 'edit';

interface LoginResponse {
  token: string;
}

interface ActivateWorkerResponse {
  id: number;
  correo?: string;
  userName?: string;
}

interface JwtPayload {
  exp?: number;
  rol?: string;
  role?: string;
  authorities?: string[];
  id?: string | number;
  userId?: string | number;
  trabajadorId?: string | number;
  workerId?: string | number;
  userName?: string;
  username?: string;
  preferred_username?: string;
  sub?: string;
  correo?: string;
  email?: string;
  [claim: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly LOGIN_URL = 'http://localhost:8080/auth/login';
  private readonly ACTIVATE_WORKER_URL = 'http://localhost:8080/auth/trabajadores/activar';
  private readonly WORKERS_URL = 'http://localhost:8080/auth/trabajadores';
  private readonly tokenKey = 'authToken';
  private readonly ownerTokenKey = 'ownerAuthToken';

  constructor(
    private readonly httpClient: HttpClient,
    private readonly router: Router
  ) {}

  login(user: string, password: string): Observable<LoginResponse> {
    return this.httpClient.post<LoginResponse>(this.LOGIN_URL, {
      userName: user,
      correo: user,
      password: password
    }).pipe(
      tap((response) => {
        if (response.token) {
          this.setToken(response.token);
        }
      })
    );
  }

  activateWorker(correo: string, password: string, userName?: string): Observable<ActivateWorkerResponse> {
    return this.httpClient.post<ActivateWorkerResponse>(this.ACTIVATE_WORKER_URL, {
      correo,
      userName,
      password
    });
  }

  impersonateWorker(id: number): Observable<LoginResponse> {
    return this.httpClient.post<LoginResponse>(`${this.WORKERS_URL}/${id}/impersonar`, {}).pipe(
      tap((response) => {
        if (response.token) {
          this.guardarSesionPrincipal();
          this.setToken(response.token);
        }
      })
    );
  }

  isImpersonating(): boolean {
    if (globalThis.window === undefined) return false;
    return Boolean(localStorage.getItem(this.ownerTokenKey));
  }

  returnToOwnerSession(): void {
    if (globalThis.window === undefined) return;

    const ownerToken = localStorage.getItem(this.ownerTokenKey);
    if (!ownerToken) return;

    localStorage.setItem(this.tokenKey, ownerToken);
    localStorage.removeItem(this.ownerTokenKey);
    this.router.navigate(['/dashboard']);
  }

  private setToken(token: string): void {
    if (globalThis.window === undefined) return;
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    if (globalThis.window !== undefined) {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();

    if (!token) {
      return false;
    }

    try {
      const payload = this.decodePayload(token);
      const exp = Number(payload?.exp || 0) * 1000;
      return Date.now() < exp;
    } catch (error) {
      return false;
    }
  }

  getPayload(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;

    return this.decodePayload(token);
  }

  getRol(): RolUsuario {
    const payload = this.getPayload();
    const rolTexto = payload?.rol
      || payload?.role
      || payload?.authorities?.[0]
      || payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
      || 'ADMIN';
    const rol = this.normalizarRol(this.valorTexto(rolTexto));
    return this.esRolValido(rol) ? rol : 'ADMIN';
  }

  hasPermission(permiso: Permiso): boolean {
    if (!this.isAuthenticated()) {
      return false;
    }

    const permisosPorRol: Record<RolUsuario, Permiso[]> = {
      OWNER: ['dashboard', 'clientes', 'clientes-write', 'proveedores', 'proveedores-write', 'categorias', 'categorias-write', 'productos', 'productos-write', 'ventas', 'trabajadores', 'ajustes', 'edit'],
      ADMIN: ['dashboard', 'clientes', 'clientes-write', 'proveedores', 'proveedores-write', 'categorias', 'categorias-write', 'productos', 'productos-write', 'ventas', 'trabajadores', 'ajustes', 'edit'],
      SUB_ADMIN: ['dashboard', 'clientes', 'clientes-write', 'proveedores', 'proveedores-write', 'categorias', 'categorias-write', 'productos', 'productos-write', 'ventas'],
      VENDEDOR: ['dashboard', 'clientes', 'clientes-write', 'productos', 'ventas'],
      ALMACENERO: ['dashboard', 'proveedores', 'categorias', 'categorias-write', 'productos', 'productos-write'],
      COMPRAS: ['dashboard', 'proveedores', 'proveedores-write', 'categorias', 'productos', 'productos-write'],
      CAJERO: ['dashboard', 'clientes', 'productos', 'ventas'],
    };

    return permisosPorRol[this.getRol()].includes(permiso);
  }

  private esRolValido(rol: string): rol is RolUsuario {
    return ['OWNER', 'ADMIN', 'SUB_ADMIN', 'VENDEDOR', 'ALMACENERO', 'COMPRAS', 'CAJERO'].includes(rol);
  }

  private normalizarRol(rol: string): string {
    const rolNormalizado = rol.trim().toUpperCase().replaceAll(/[\s-]+/g, '_');
    return rolNormalizado === 'SUBADMIN' ? 'SUB_ADMIN' : rolNormalizado;
  }

  private valorTexto(valor: unknown): string {
    if (valor === null || valor === undefined) return '';
    if (typeof valor === 'object') return JSON.stringify(valor);
    if (typeof valor === 'string') return valor;
    if (typeof valor === 'number') return valor.toString();
    if (typeof valor === 'boolean') return valor ? 'true' : 'false';
    if (typeof valor === 'bigint') return valor.toString();
    if (typeof valor === 'symbol') return valor.description ?? '';
    if (typeof valor === 'function') return valor.name;
    return '';
  }

  logout(): void {
    if (globalThis.window === undefined) return;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.ownerTokenKey);
    this.router.navigate(['/inicio']);
  }

  private guardarSesionPrincipal(): void {
    if (globalThis.window === undefined || localStorage.getItem(this.ownerTokenKey)) return;

    const tokenActual = localStorage.getItem(this.tokenKey);
    if (tokenActual) {
      localStorage.setItem(this.ownerTokenKey, tokenActual);
    }
  }

  private decodePayload(token: string): JwtPayload | null {
    const [, encodedPayload] = token.split('.');
    if (!encodedPayload) return null;

    try {
      return JSON.parse(atob(encodedPayload)) as JwtPayload;
    } catch {
      return null;
    }
  }
}
