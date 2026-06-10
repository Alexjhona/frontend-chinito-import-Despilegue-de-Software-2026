import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AuthenticatedGuard } from './core/guards/authenticated.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout.component'),
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./business/dashboard/dashboard.component'),
      },
      {
        path: 'cliente',
        loadComponent: () => import('./business/cliente/cliente.component').then(m => m.ClienteComponent),
      },
      {
        path: 'proveedor',
        loadComponent: () => import('./business/proveedor/proveedor.component').then(m => m.ProveedorComponent),
      },
      {
        path: 'categoria',
        loadComponent: () => import('./business/categoria/categoria.component').then(m => m.CategoriaComponent),
      },
      {
        path: 'producto',
        loadComponent: () => import('./business/producto/producto.component').then(m => m.ProductoComponent),
      },
      {
        path: 'venta',
        loadComponent: () => import('./business/venta/venta.component').then(m => m.VentaComponent),
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
    loadComponent: () => import('./business/authentication/register/register.component').then(m => m.RegisterComponent),
    canActivate: [AuthenticatedGuard]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
