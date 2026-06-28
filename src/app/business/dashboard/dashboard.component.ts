import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { Subscription, catchError, forkJoin, of } from 'rxjs';
import { DataRefreshService } from '../../core/services/data-refresh.service';

interface Venta {
  id?: number;
  clienteNombre?: string;
  clienteId: number;
  fecha?: string;
  total?: number;
}

interface Producto {
  id?: number;
  nombre: string;
  stock?: number;
}

interface Cliente {
  id: number;
}

interface Proveedor {
  id: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export default class DashboardComponent implements OnDestroy {
  ventas: Venta[] = [];
  productos: Producto[] = [];
  clientes: Cliente[] = [];
  proveedores: Proveedor[] = [];

  cargando = true;
  aviso = '';

  private readonly apiVentas = 'http://localhost:8080/api/ventas';
  private readonly apiProductos = 'http://localhost:8080/api/productos';
  private readonly apiClientes = 'http://localhost:8080/api/clientes';
  private readonly apiProveedores = 'http://localhost:8080/api/proveedores';
  private readonly apiStock = 'http://localhost:8080/api/stock';
  private readonly refreshSub: Subscription;

  constructor(
    private readonly http: HttpClient,
    private readonly dataRefresh: DataRefreshService,
  ) {
    this.cargarResumen();
    this.refreshSub = this.dataRefresh.refresh$.subscribe(() => this.cargarResumen());
  }

  ngOnDestroy(): void {
    this.refreshSub.unsubscribe();
  }

  cargarResumen(): void {
    this.cargando = true;
    this.aviso = '';

    forkJoin({
      ventas: this.http.get<Venta[]>(this.apiVentas).pipe(catchError(() => of([] as Venta[]))),
      productos: this.http.get<Producto[]>(this.apiProductos).pipe(catchError(() => of([] as Producto[]))),
      clientes: this.http.get<Cliente[]>(this.apiClientes).pipe(catchError(() => of([] as Cliente[]))),
      proveedores: this.http.get<Proveedor[]>(this.apiProveedores).pipe(catchError(() => of([] as Proveedor[]))),
    }).subscribe(({ ventas, productos, clientes, proveedores }) => {
      const stockRequests = productos.map(producto => {
        if (!producto.id) return of({ cantidad: producto.stock ?? 0 });
        return this.http.get<{ cantidad: number }>(`${this.apiStock}/${producto.id}`).pipe(
          catchError(() => of({ cantidad: producto.stock ?? 0 }))
        );
      });

      const stockResumen = stockRequests.length ? forkJoin(stockRequests) : of([] as Array<{ cantidad: number }>);

      stockResumen.subscribe(stock => {
        this.ventas = ventas;
        this.productos = productos.map((producto, index) => ({
          ...producto,
          stock: stock[index]?.cantidad ?? producto.stock ?? 0,
        }));
        this.clientes = clientes;
        this.proveedores = proveedores;
        this.cargando = false;

        if (!ventas.length && !productos.length && !clientes.length && !proveedores.length) {
          this.aviso = 'No hay datos registrados todavia.';
        }
      });
    });
  }

  get totalVentas(): number {
    return this.ventas.length;
  }

  get montoTotalVendido(): number {
    return this.ventas.reduce((total, venta) => total + (venta.total ?? 0), 0);
  }

  get productosStockBajo(): Producto[] {
    return this.productos.filter(producto => (producto.stock ?? 0) > 0 && (producto.stock ?? 0) < 3);
  }

  get productosSinStock(): Producto[] {
    return this.productos.filter(producto => (producto.stock ?? 0) === 0);
  }

  get ultimasVentas(): Venta[] {
    return [...this.ventas]
      .sort((a, b) => new Date(b.fecha ?? '').getTime() - new Date(a.fecha ?? '').getTime())
      .slice(0, 5);
  }
}
