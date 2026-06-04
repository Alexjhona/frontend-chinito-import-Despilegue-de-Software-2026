import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Categoria {
  id: number;
  nombre: string;
}

interface Producto {
  id?: number;
  categoriaId: number | null;
  codigoInterno: string;
  nombre: string;
  precioVenta: number | null;
  precioCompra: number | null;
  moneda?: string;
  stock?: number;
}

@Component({
  selector: 'app-producto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './producto.component.html',
  styleUrl: './producto.component.css',
})
export class ProductoComponent {

  productos: Producto[] = [];
  categorias: Categoria[] = [];
  mostrarFormulario = false;
  editProducto: Producto | null = null;
  mensaje = '';

  // Autocomplete
  busquedaCategoriaInput: string = '';
  categoriasFiltradas: Categoria[] = [];

  // Buscadores
  busquedaCategoria: string = '';
  busquedaProducto: string = '';

  formProducto: Producto = {
    categoriaId: null,
    codigoInterno: '',
    nombre: '',
    precioVenta: null,
    precioCompra: null,
    moneda: 'Soles',
    stock: 0
  };

  private apiUrl = 'http://localhost:8080/api/productos';
  private categoriaUrl = 'http://localhost:8080/api/categorias';
  private stockUrl = 'http://localhost:8080/api/stock';

  constructor(private http: HttpClient) {
    this.cargarProductos();
    this.cargarCategorias();
  }

  cargarCategorias() {
    this.http.get<Categoria[]>(this.categoriaUrl).subscribe(data => {
      this.categorias = data;
      this.categoriasFiltradas = data;
    });
  }

  // 🔥 AQUÍ ESTÁ LA SOLUCIÓN
  cargarProductos() {
    this.http.get<Producto[]>(this.apiUrl).subscribe(productos => {

      productos.forEach(p => {
        this.http.get<any>(`${this.stockUrl}/${p.id}`)
          .subscribe({
            next: (stockData) => {
              p.stock = stockData.cantidad;
            },
            error: () => {
              p.stock = 0;
            }
          });
      });

      this.productos = productos;
    });
  }

  guardar() {
    this.mensaje = '';

    if (!this.formProducto.categoriaId) {
      alert('Selecciona una categoría válida');
      return;
    }

    if (this.editProducto && this.editProducto.id) {

      // EDITAR
      this.http.put<Producto>(`${this.apiUrl}/${this.editProducto.id}`, this.formProducto)
        .subscribe({
          next: () => {
            this.http.put(`${this.stockUrl}/${this.editProducto?.id}`, {
              cantidad: this.formProducto.stock
            }).subscribe({
              next: () => {
                this.mensaje = 'Producto actualizado correctamente';
                this.cargarProductos();
                this.resetFormulario();
              },
              error: () => {
                this.mensaje = 'Producto actualizado, pero no se pudo guardar el stock';
              }
            });
          },
          error: () => {
            this.mensaje = 'No se pudo actualizar el producto';
          }
        });

    } else {

      // NUEVO
      this.http.post<Producto>(this.apiUrl, this.formProducto)
        .subscribe({
          next: (productoCreado) => {
            this.http.post(this.stockUrl, {
              productoId: productoCreado.id,
              cantidad: this.formProducto.stock
            }).subscribe({
              next: () => {
                this.mensaje = 'Producto registrado correctamente';
                this.cargarProductos();
                this.resetFormulario();
              },
              error: () => {
                this.mensaje = 'Producto registrado, pero no se pudo crear el stock';
              }
            });
          },
          error: () => {
            this.mensaje = 'No se pudo registrar el producto';
          }
        });

    }
  }

  eliminarProducto(id: number | undefined) {
    if (!id) return;
    if (confirm('¿Seguro que deseas eliminar este producto?')) {
      this.http.delete(`${this.apiUrl}/${id}`)
        .subscribe(() => this.cargarProductos());
    }
  }

  editar(producto: Producto) {
    this.editProducto = producto;
    this.formProducto = { ...producto };

    const cat = this.categorias.find(c => c.id === producto.categoriaId);
    this.busquedaCategoriaInput = cat ? cat.nombre : '';

    this.categoriasFiltradas = this.categorias;
    this.mostrarFormulario = true;
  }

  nuevoProducto() {
    this.editProducto = null;
    this.formProducto = {
      categoriaId: null,
      codigoInterno: '',
      nombre: '',
      precioVenta: null,
      precioCompra: null,
      moneda: 'Soles',
      stock: 0
    };
    this.busquedaCategoriaInput = '';
    this.categoriasFiltradas = this.categorias;
    this.mostrarFormulario = true;
  }

  cancelar() {
    this.resetFormulario();
  }

  resetFormulario() {
    this.mostrarFormulario = false;
    this.editProducto = null;

    this.formProducto = {
      categoriaId: null,
      codigoInterno: '',
      nombre: '',
      precioVenta: null,
      precioCompra: null,
      moneda: 'Soles',
      stock: 0
    };

    this.busquedaCategoriaInput = '';
    this.categoriasFiltradas = this.categorias;
  }

  actualizarCategoriasFiltradas() {
    const texto = this.busquedaCategoriaInput.trim().toLowerCase();

    if (!texto) {
      this.categoriasFiltradas = this.categorias;
      this.formProducto.categoriaId = null;
      return;
    }

    this.categoriasFiltradas = this.categorias.filter(c =>
      c.nombre.toLowerCase().includes(texto)
    );

    const exacta = this.categorias.find(c => c.nombre.toLowerCase() === texto);

    if (exacta) {
      this.seleccionarCategoria(exacta);
    } else {
      this.formProducto.categoriaId = null;
    }
  }

  seleccionarCategoria(cat: Categoria) {
    this.formProducto.categoriaId = cat.id;
    this.busquedaCategoriaInput = cat.nombre;
    this.categoriasFiltradas = [];
  }

  getNombreCategoria(id: number | null): string {
    const cat = this.categorias.find(c => c.id === id);
    return cat ? cat.nombre : '';
  }

  get productosFiltrados(): Producto[] {
    let productos = this.productos;

    if (this.busquedaCategoria.trim()) {
      productos = productos.filter(p =>
        this.getNombreCategoria(p.categoriaId)
          .toLowerCase()
          .includes(this.busquedaCategoria.trim().toLowerCase())
      );
    }

    if (this.busquedaProducto.trim()) {
      const texto = this.busquedaProducto.trim().toLowerCase();

      productos = productos.filter(p =>
        (p.nombre && p.nombre.toLowerCase().includes(texto)) ||
        (p.codigoInterno && p.codigoInterno.toLowerCase().includes(texto))
      );
    }

    return productos;
  }
}
