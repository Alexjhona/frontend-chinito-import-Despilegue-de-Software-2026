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
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem(this.ownerTokenKey));
  }

  returnToOwnerSession(): void {
    if (typeof window === 'undefined') return;

    const ownerToken = localStorage.getItem(this.ownerTokenKey);
    if (!ownerToken) return;

    localStorage.setItem(this.tokenKey, ownerToken);
    localStorage.removeItem(this.ownerTokenKey);
    this.router.navigate(['/dashboard']);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
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
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      return Date.now() < exp;
    } catch (error) {
      return false;
    }
  }

  getPayload(): any | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (error) {
      return null;
    }
  }

  getRol(): RolUsuario {
    const payload = this.getPayload();
    const rolTexto = payload?.rol
      || payload?.role
      || payload?.authorities?.[0]
      || payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
      || 'ADMIN';
    const rol = this.normalizarRol(String(rolTexto));
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
    const rolNormalizado = rol.trim().toUpperCase().replace(/[\s-]+/g, '_');
    return rolNormalizado === 'SUBADMIN' ? 'SUB_ADMIN' : rolNormalizado;
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.ownerTokenKey);
    this.router.navigate(['/inicio']);
  }

  private guardarSesionPrincipal(): void {
    if (typeof window === 'undefined' || localStorage.getItem(this.ownerTokenKey)) return;

    const tokenActual = localStorage.getItem(this.tokenKey);
    if (tokenActual) {
      localStorage.setItem(this.ownerTokenKey, tokenActual);
    }
  }
}
