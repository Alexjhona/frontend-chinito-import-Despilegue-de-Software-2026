import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService, Permiso } from '../../../core/services/auth.service';
import { AuditService } from '../../../core/services/audit.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnDestroy {
  isMenuOpen = false;
  mostrarConfirmacionLogout = false;
  tituloActual = 'Inicio';
  private readonly routeSubscription: Subscription;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly auditService: AuditService,
  ) {
    this.actualizarTitulo(this.router.url);
    this.routeSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.actualizarTitulo(event.urlAfterRedirects));
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  can(permiso: Permiso): boolean {
    return this.authService.hasPermission(permiso);
  }

  get estaEnOtroRol(): boolean {
    return this.authService.isImpersonating();
  }

  volverAMiRol(): void {
    this.closeMenu();
    this.authService.returnToOwnerSession();
  }

  logout(): void {
    this.closeMenu();
    this.mostrarConfirmacionLogout = true;
  }

  cancelarLogout(): void {
    this.mostrarConfirmacionLogout = false;
  }

  confirmarLogout(): void {
    this.mostrarConfirmacionLogout = false;
    try {
      this.auditService.registrar('Cierre de sesión');
    } catch {
      // El cierre de sesión no debe depender de que el registro local esté disponible.
    }
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
  }

  private actualizarTitulo(url: string): void {
    const ruta = url.split('?')[0].replace(/^\/+/, '');
    const titulos: Record<string, string> = {
      dashboard: 'Inicio',
      cliente: 'Clientes',
      proveedor: 'Proveedores',
      categoria: 'Categorías',
      'agregar-categoria': 'Agregar categoría',
      producto: 'Productos',
      'agregar-productos': 'Agregar productos',
      venta: 'Ventas',
      trabajadores: 'Trabajadores',
      ajustes: 'Ajustes',
      edit: 'Edit',
    };

    this.tituloActual = titulos[ruta] || 'Inicio';
  }
}
