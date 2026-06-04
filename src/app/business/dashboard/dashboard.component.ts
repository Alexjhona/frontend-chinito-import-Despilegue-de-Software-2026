import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';

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

interface Stock {
  productoId: number;
  cantidad: number;
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
export default class DashboardComponent {
  ventas: Venta[] = [];
  productos: Producto[] = [];
  clientes: Cliente[] = [];
  proveedores: Proveedor[] = [];
  stock: Stock[] = [];

  cargando = true;
  aviso = '';

  private readonly apiVentas = 'http://localhost:8080/api/ventas';
  private readonly apiProductos = 'http://localhost:8080/api/productos';
  private readonly apiClientes = 'http://localhost:8080/api/clientes';
  private readonly apiProveedores = 'http://localhost:8080/api/proveedores';
  private readonly apiStock = 'http://localhost:8080/api/stock';

  constructor(private readonly http: HttpClient) {
    this.cargarResumen();
  }

  cargarResumen(): void {
    this.cargando = true;
    this.aviso = '';

    forkJoin({
      ventas: this.http.get<Venta[]>(this.apiVentas).pipe(catchError(() => of([] as Venta[]))),
      productos: this.http.get<Producto[]>(this.apiProductos).pipe(catchError(() => of([] as Producto[]))),
      clientes: this.http.get<Cliente[]>(this.apiClientes).pipe(catchError(() => of([] as Cliente[]))),
      proveedores: this.http.get<Proveedor[]>(this.apiProveedores).pipe(catchError(() => of([] as Proveedor[]))),
      stock: this.http.get<Stock[]>(this.apiStock).pipe(catchError(() => of([] as Stock[]))),
    }).subscribe(({ ventas, productos, clientes, proveedores, stock }) => {
      this.ventas = ventas;
      this.productos = productos.map(producto => ({
        ...producto,
        stock: stock.find(item => item.productoId === producto.id)?.cantidad ?? producto.stock ?? 0,
      }));
      this.clientes = clientes;
      this.proveedores = proveedores;
      this.stock = stock;
      this.cargando = false;

      if (!ventas.length && !productos.length && !clientes.length && !proveedores.length) {
        this.aviso = 'No hay datos registrados todavia.';
      }
    });
  }

  get totalVentas(): number {
    return this.ventas.length;
  }

  get montoTotalVendido(): number {
    return this.ventas.reduce((total, venta) => total + (venta.total ?? 0), 0);
  }

  get productosStockBajo(): Producto[] {
    return this.productos.filter(producto => (producto.stock ?? 0) > 0 && (producto.stock ?? 0) <= 5);
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
