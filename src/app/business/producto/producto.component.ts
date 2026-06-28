import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { DataRefreshService } from '../../core/services/data-refresh.service';

interface Categoria {
  id: number;
  nombre: string;
  imagen?: string;
}

interface Producto {
  id?: number;
  categoriaId: number | null;
  codigoInterno: string;
  nombre: string;
  imagen?: string;
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
})
export class ProductoComponent implements OnDestroy {
  productos: Producto[] = [];
  categorias: Categoria[] = [];

  mostrarFormulario = false;

  editProducto: Producto | null = null;
  mensaje = '';
  errorFormulario = '';
  mensajeImagenWeb = '';
  cargandoImagenWeb = false;
  private imagenGeneradaIntentos = 0;

  accionPendiente: 'editar' | 'eliminar' | null = null;
  productoPendiente: Producto | null = null;

  busquedaCategoriaInput = '';
  categoriasFiltradas: Categoria[] = [];

  busquedaCategoria = '';
  busquedaProducto = '';

  formProducto: Producto = this.crearProductoVacio();

  private readonly apiUrl = 'http://localhost:8080/api/productos';
  private readonly categoriaUrl = 'http://localhost:8080/api/categorias';
  private readonly stockUrl = 'http://localhost:8080/api/stock';
  private readonly refreshSub: Subscription;

  readonly stockCriticoMinimo = 3;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly dataRefresh: DataRefreshService,
  ) {
    this.cargarProductos();
    this.cargarCategorias();
    this.refreshSub = this.dataRefresh.refresh$.subscribe(() => {
      this.cargarProductos();
      this.cargarCategorias();
    });
  }

  ngOnDestroy() {
    this.refreshSub.unsubscribe();
  }

  get puedeEscribir(): boolean {
    return this.authService.hasPermission('productos-write');
  }

  get esPaginaAgregarProductos(): boolean {
    return this.router.url.includes('/agregar-productos');
  }

  cargarCategorias() {
    this.http.get<Categoria[]>(this.categoriaUrl).subscribe(data => {
      this.categorias = data;
      this.categoriasFiltradas = data;
      this.sincronizarCategoriaEditada();
    });
  }

  cargarProductos() {
    this.http.get<Producto[]>(this.apiUrl).subscribe(productos => {
      productos.forEach(p => {
        this.http.get<any>(`${this.stockUrl}/${p.id}`).subscribe({
          next: stockData => {
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

  guardar(form?: NgForm) {
    if (!this.puedeEscribir) return;

    this.mensaje = '';
    this.errorFormulario = '';

    this.formProducto.codigoInterno = (this.formProducto.codigoInterno || '').trim();
    this.formProducto.nombre = (this.formProducto.nombre || '').trim();
    this.formProducto.moneda = (this.formProducto.moneda || 'Soles').trim() || 'Soles';
    this.formProducto.stock = Math.max(0, Number(this.formProducto.stock || 0));

    if (this.formProducto.stock <= 0) {
      this.errorFormulario = 'No se puede agregar un producto con stock 0. Ingresa una cantidad mayor que 0.';
      return;
    }

    if (
      form?.invalid ||
      !this.formProducto.categoriaId ||
      !this.formProducto.codigoInterno ||
      !this.formProducto.nombre ||
      !this.formProducto.precioVenta ||
      !this.formProducto.precioCompra ||
      this.formProducto.precioVenta <= 0 ||
      this.formProducto.precioCompra <= 0
    ) {
      this.errorFormulario = 'Revisa los campos obligatorios antes de guardar.';
      return;
    }

    if (this.editProducto?.id) {
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
      this.http.post<Producto>(this.apiUrl, this.formProducto)
        .subscribe({
          next: productoCreado => {
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
    if (!this.puedeEscribir) return;
    if (!id) return;

    this.http.delete(`${this.apiUrl}/${id}`)
      .subscribe(() => {
        this.cargarProductos();
        this.mensaje = 'Producto eliminado correctamente';
      });
  }

  editar(producto: Producto) {
    if (!this.puedeEscribir) return;

    this.mensaje = '';
    this.errorFormulario = '';
    this.mensajeImagenWeb = '';
    this.editProducto = producto;
    this.formProducto = {
      ...this.crearProductoVacio(),
      ...producto,
      categoriaId: producto.categoriaId ?? null,
      codigoInterno: producto.codigoInterno || '',
      nombre: producto.nombre || '',
      imagen: producto.imagen || '',
      moneda: producto.moneda || 'Soles',
      stock: Number(producto.stock || 0),
    };

    this.sincronizarCategoriaEditada();

    this.categoriasFiltradas = this.categorias;
    this.mostrarFormulario = true;
  }

  nuevoProducto() {
    if (!this.puedeEscribir) return;

    this.mensaje = '';
    this.errorFormulario = '';
    this.mensajeImagenWeb = '';
    this.editProducto = null;
    this.formProducto = this.crearProductoVacio();
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
    this.errorFormulario = '';
    this.mensajeImagenWeb = '';
    this.cargandoImagenWeb = false;
    this.formProducto = this.crearProductoVacio();
    this.busquedaCategoriaInput = '';
    this.categoriasFiltradas = this.categorias;
  }

  actualizarCategoriasFiltradas() {
    const texto = this.normalizarTexto(this.busquedaCategoriaInput);

    if (!texto) {
      this.categoriasFiltradas = this.categorias;
      this.formProducto.categoriaId = null;
      return;
    }

    this.categoriasFiltradas = this.categorias.filter(c =>
      this.normalizarTexto(c.nombre).includes(texto)
    );

    const exacta = this.categorias.find(c => this.normalizarTexto(c.nombre) === texto);

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

  getImagenCategoria(id: number | null): string {
    const cat = this.categorias.find(c => c.id === id);
    return cat?.imagen || '';
  }

  getInicialesCategoria(nombre: string): string {
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(parte => parte[0]?.toUpperCase())
      .join('') || 'CI';
  }

  getInicialesProducto(nombre: string): string {
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(parte => parte[0]?.toUpperCase())
      .join('') || 'PR';
  }

  seleccionarImagen(event: Event) {
    this.errorFormulario = '';
    this.mensajeImagenWeb = '';
    this.cargandoImagenWeb = false;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errorFormulario = 'Selecciona una imagen válida.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.formProducto.imagen = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  quitarImagen() {
    this.formProducto.imagen = '';
    this.mensajeImagenWeb = '';
    this.cargandoImagenWeb = false;
  }

  buscarImagenProductoWeb() {
    this.errorFormulario = '';
    this.mensajeImagenWeb = '';

    const nombre = (this.formProducto.nombre || '').trim();

    if (!nombre) {
      this.errorFormulario = 'Escribe primero el nombre del producto para generar una imagen.';
      return;
    }

    const categoria = this.getNombreCategoria(this.formProducto.categoriaId);
    this.imagenGeneradaIntentos += 1;
    this.cargandoImagenWeb = true;
    this.formProducto.imagen = this.crearUrlImagenWeb(nombre, 'producto', categoria, this.imagenGeneradaIntentos);
    this.mensajeImagenWeb = `Generando imagen para "${nombre}"...`;
  }

  imagenWebLista() {
    if (!this.cargandoImagenWeb) return;
    this.cargandoImagenWeb = false;
    this.mensajeImagenWeb = 'Imagen generada por nombre. Si no te convence, presiona Regenerar.';
  }

  imagenWebError() {
    if (!this.cargandoImagenWeb) return;
    this.cargandoImagenWeb = false;
    this.formProducto.imagen = '';
    this.errorFormulario = 'No se pudo generar la imagen ahora. Intenta otra vez o sube una desde la PC.';
    this.mensajeImagenWeb = '';
  }

  get productosFiltrados(): Producto[] {
    let productos = this.productos;

    if (this.busquedaCategoria.trim()) {
      const textoCategoria = this.normalizarTexto(this.busquedaCategoria);
      productos = productos.filter(p =>
        this.normalizarTexto(this.getNombreCategoria(p.categoriaId)).includes(textoCategoria)
      );
    }

    if (this.busquedaProducto.trim()) {
      const texto = this.normalizarTexto(this.busquedaProducto);

      productos = productos.filter(p =>
        this.normalizarTexto(p.nombre).includes(texto) ||
        this.normalizarTexto(p.codigoInterno).includes(texto)
      );
    }

    return productos;
  }

  get totalProductos(): number {
    return this.productos.length;
  }

  get productosConStock(): number {
    return this.productos.filter(producto => (producto.stock || 0) > 0).length;
  }

  get productosConAdvertenciaStock(): Producto[] {
    return this.productos.filter(producto => this.tieneAdvertenciaStock(producto));
  }

  estadoStock(producto: Producto): 'agotado' | 'bajo' | 'ok' {
    const stock = this.stockDisponible(producto);
    if (stock <= 0) return 'agotado';
    if (stock < this.stockCriticoMinimo) return 'bajo';
    return 'ok';
  }

  textoStock(producto: Producto): string {
    const estado = this.estadoStock(producto);
    if (estado === 'agotado') return 'Sin stock';
    if (estado === 'bajo') return 'Stock bajo';
    return 'Disponible';
  }

  stockDisponible(producto: Producto): number {
    return Math.max(0, Number(producto.stock || 0));
  }

  tieneAdvertenciaStock(producto: Producto): boolean {
    return this.estadoStock(producto) !== 'ok';
  }

  advertenciaStock(producto: Producto): string {
    const stock = this.stockDisponible(producto);
    if (stock <= 0) return 'Sin stock disponible.';
    if (stock < this.stockCriticoMinimo) return `Stock bajo: quedan ${stock} unidades.`;
    return '';
  }

  solicitarEditar(producto: Producto) {
    if (!this.puedeEscribir) return;
    this.accionPendiente = 'editar';
    this.productoPendiente = producto;
  }

  solicitarEliminar(producto: Producto) {
    if (!this.puedeEscribir) return;
    this.accionPendiente = 'eliminar';
    this.productoPendiente = producto;
  }

  get tituloConfirmacion(): string {
    return this.accionPendiente === 'editar' ? 'Editar producto' : 'Eliminar producto';
  }

  get mensajeConfirmacion(): string {
    const nombre = this.productoPendiente?.nombre || 'este producto';

    if (this.accionPendiente === 'editar') {
      return `¿Seguro que quieres editar ${nombre}?`;
    }

    return `¿Seguro que quieres eliminar ${nombre}? Esta acción no se puede deshacer.`;
  }

  confirmarAccion() {
    if (!this.accionPendiente || !this.productoPendiente) return;

    const producto = this.productoPendiente;
    const accion = this.accionPendiente;

    this.cancelarConfirmacion();

    if (accion === 'editar') {
      this.editar(producto);
      return;
    }

    this.eliminarProducto(producto.id);
  }

  cancelarConfirmacion() {
    this.accionPendiente = null;
    this.productoPendiente = null;
  }

  private crearProductoVacio(): Producto {
    return {
      categoriaId: null,
      codigoInterno: '',
      nombre: '',
      imagen: '',
      precioVenta: null,
      precioCompra: null,
      moneda: 'Soles',
      stock: 0
    };
  }

  private normalizarTexto(valor: string | undefined): string {
    return (valor || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private crearUrlImagenWeb(nombre: string, contexto: string, categoria = '', intento = 1): string {
    const termino = nombre.trim() || contexto;
    const contextoCategoria = categoria.trim()
      ? `Category context: ${categoria.trim()}. Use it only to understand the product, not as the main subject`
      : 'No category context was provided';
    const prompt = [
      `Create an AI generated ecommerce product photo for this exact product name: ${termino}`,
      `Main subject: ${termino}`,
      `Translate "${termino}" to English internally if needed, but render the real physical product represented by that name`,
      `Do not render a generic box or abstract icon; render the visible product that matches ${termino}`,
      contextoCategoria,
      'single main product centered',
      'clean white background',
      'realistic studio product photography',
      'sharp high detail',
      'no text, no watermark, no logo'
    ].join(', ');
    const seed = this.hashTexto(`${contexto}-${this.normalizarTexto(termino)}-${intento}`);

    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=900&height=700&seed=${seed}&nologo=true&enhance=true&safe=true&cacheBust=${Date.now()}`;
  }

  private hashTexto(valor: string): number {
    let hash = 0;

    for (const caracter of valor) {
      hash = Math.imul(hash, 31) + caracter.charCodeAt(0);
      if (hash > 0x7fffffff) hash -= 0x100000000;
    }

    return Math.abs(hash % 9000) + 1000;
  }

  private sincronizarCategoriaEditada() {
    if (!this.editProducto) return;

    const cat = this.categorias.find(c => c.id === this.formProducto.categoriaId);
    this.busquedaCategoriaInput = cat ? cat.nombre : '';
  }
}
