import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AuthenticatedGuard } from './core/guards/authenticated.guard';
import { PermissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'inicio',
    pathMatch: 'full'
  },
  {
    path: 'inicio',
    loadComponent: () => import('./business/inicio/inicio.component').then(m => m.InicioComponent)
  },
  {
    path: 'catalogo',
    loadComponent: () => import('./business/inicio/inicio.component').then(m => m.InicioComponent)
  },
  {
    path: 'productos',
    loadComponent: () => import('./business/inicio/inicio.component').then(m => m.InicioComponent)
  },
  {
    path: 'servicios',
    loadComponent: () => import('./business/inicio/inicio.component').then(m => m.InicioComponent)
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout.component'),
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./business/dashboard/dashboard.component'),
        canActivate: [PermissionGuard],
        data: { permission: 'dashboard' },
      },
      {
        path: 'cliente',
        loadComponent: () => import('./business/cliente/cliente.component').then(m => m.ClienteComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'clientes' },
      },
      {
        path: 'proveedor',
        loadComponent: () => import('./business/proveedor/proveedor.component').then(m => m.ProveedorComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'proveedores' },
      },
      {
        path: 'categoria',
        loadComponent: () => import('./business/categoria/categoria.component').then(m => m.CategoriaComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'categorias' },
      },
      {
        path: 'agregar-categoria',
        loadComponent: () => import('./business/agregar-categoria/agregar-categoria.component').then(m => m.AgregarCategoriaComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'categorias-write' },
      },
      {
        path: 'producto',
        loadComponent: () => import('./business/producto/producto.component').then(m => m.ProductoComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'productos' },
      },
      {
        path: 'agregar-productos',
        loadComponent: () => import('./business/agregar-productos/agregar-productos.component').then(m => m.AgregarProductosComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'productos-write' },
      },
      {
        path: 'venta',
        loadComponent: () => import('./business/venta/venta.component').then(m => m.VentaComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'ventas' },
      },
      {
        path: 'trabajadores',
        loadComponent: () => import('./business/trabajador/trabajador.component').then(m => m.TrabajadorComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'trabajadores' },
      },
      {
        path: 'ajustes',
        loadComponent: () => import('./business/ajustes/ajustes.component').then(m => m.AjustesComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'ajustes' },
      },
      {
        path: 'edit',
        loadComponent: () => import('./business/edit/edit.component').then(m => m.EditComponent),
        canActivate: [PermissionGuard],
        data: { permission: 'edit' },
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'login',
    loadComponent: () => import('./business/authentication/login/login.component').then(m => m.LoginComponent),
    canActivate: [AuthenticatedGuard]
  },
  {
    path: 'register',
    redirectTo: 'inicio'
  },
  {
    path: 'registro-trabajador',
    loadComponent: () => import('./business/authentication/register/register.component').then(m => m.RegisterComponent),
    canActivate: [AuthenticatedGuard]
  },
  {
    path: '**',
    redirectTo: 'inicio'
  }
];
