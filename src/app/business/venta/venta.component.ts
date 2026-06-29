import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { jsPDF } from 'jspdf';
import { Subscription } from 'rxjs';
import { DataRefreshService } from '../../core/services/data-refresh.service';

interface Cliente {
  id: number;
  razonSocialONombre: string;
  dniOrRuc: string;
  direccion?: string;
  telefono?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
}

interface DniConsulta {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
}

interface Categoria {
  id: number;
  nombre: string;
  imagen?: string | null;
}

interface Producto {
  id: number;
  categoriaId?: number | null;
  nombre: string;
  codigoInterno: string;
  precioVenta: number;
  imagen?: string | null;
  stock?: number;
}

interface ItemVenta {
  productoId: number | null;
  cantidad: number;
  precio: number;
  productoNombre?: string;
  busquedaProducto?: string;
  productosFiltrados?: Producto[];
  productoSeleccionado?: Producto;
}

interface Venta {
  id?: number;
  clienteId: number | null;
  clienteNombre?: string;
  fecha?: string;
  total?: number;
  items: ItemVenta[];
}

@Component({
  selector: 'app-venta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './venta.component.html',
})
export class VentaComponent implements OnDestroy {

  ventas: Venta[] = [];
  clientes: Cliente[] = [];
  productos: Producto[] = [];
  categorias: Categoria[] = [];

  nuevaVenta: Venta = this.crearVentaVacia();

  mensaje: string = '';
  errorFormulario = '';
  errorNuevoCliente = '';
  mostrarFormulario = false;
  cerrandoFormulario = false;
  accionPendiente: 'eliminar' | null = null;
  ventaPendiente: Venta | null = null;
  mostrarDetalleVenta = false;
  cerrandoDetalleVenta = false;
  ventaDetalleSeleccionada: Venta | null = null;

  busquedaCliente: string = '';
  clientesFiltrados: Cliente[] = [];
  clienteSeleccionado: Cliente | null = null;
  consultandoDniCliente = false;
  mensajeDniCliente = '';
  private consultaDniClienteId = 0;

  mostrarNuevoCliente = false;
  nuevoCliente: Partial<Cliente> = this.crearClienteVacio();

  busqueda: string = '';
  filtroFecha: string = '';
  paginaVentas = 1;
  readonly elementosPorPagina = 10;
  mostrarDetalles: { [key: number]: boolean } = {};

  private readonly apiVentas = 'http://localhost:8080/api/ventas';
  private readonly apiClientes = 'http://localhost:8080/api/clientes';
  private readonly apiProductos = 'http://localhost:8080/api/productos';
  private readonly apiCategorias = 'http://localhost:8080/api/categorias';
  private readonly apiStock = 'http://localhost:8080/api/stock';
  private readonly consultaDniUrl = 'http://localhost:8080/auth/dni';
  readonly stockCriticoMinimo = 3;
  private readonly refreshSub: Subscription;
  private readonly duracionSalidaFormulario = 260;
  private cierreFormularioTimer: ReturnType<typeof setTimeout> | null = null;
  private cierreDetalleVentaTimer: ReturnType<typeof setTimeout> | null = null;

  get fechaVentaAutomatica(): string {
    return new Date().toLocaleString('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  // 🔥 SOLO CAMBIO: orden correcto
  constructor(
    private readonly http: HttpClient,
    private readonly dataRefresh: DataRefreshService,
  ) {
    this.cargarCategorias();
    this.cargarProductos(); // primero productos
    this.cargarClientes();
    this.refreshSub = this.dataRefresh.refresh$.subscribe(() => {
      this.cargarCategorias();
      this.cargarProductos();
      this.cargarClientes();
      this.cargarVentas();
    });
  }

  ngOnDestroy() {
    if (this.cierreFormularioTimer) {
      clearTimeout(this.cierreFormularioTimer);
    }
    if (this.cierreDetalleVentaTimer) {
      clearTimeout(this.cierreDetalleVentaTimer);
    }
    this.refreshSub.unsubscribe();
  }

  cargarCategorias() {
    this.http.get<Categoria[]>(this.apiCategorias).subscribe({
      next: data => {
        this.categorias = data;
      },
      error: () => {
        this.categorias = [];
      }
    });
  }

  // ================= CLIENTES =================
  cargarClientes() {
    this.http.get<Cliente[]>(this.apiClientes).subscribe(data => {
      this.clientes = data.map(cliente => this.normalizarCliente(cliente));
    });
  }

  filtrarClientes() {
    const texto = this.normalizarTexto(this.busquedaCliente);
    const dni = this.dniBuscado;

    if (this.clienteSeleccionado && texto !== this.normalizarTexto(this.getNombreCliente(this.clienteSeleccionado))) {
      this.clienteSeleccionado = null;
      this.nuevaVenta.clienteId = null;
    }

    this.clientesFiltrados = !texto
      ? []
      : this.clientes.filter(c =>
        this.normalizarTexto(this.getNombreCliente(c)).includes(texto) ||
        c.dniOrRuc?.includes(texto)
      );

    if (dni.length === 8 && !this.clienteRegistradoPorDni(dni)) {
      this.prepararClienteNoRegistrado(dni);
      this.consultarDniParaClienteRapido(dni);
    } else {
      this.mensajeDniCliente = '';
      this.consultandoDniCliente = false;
      this.consultaDniClienteId++;
    }
  }

  seleccionarCliente(cli: Cliente) {
    this.clienteSeleccionado = cli;
    this.nuevaVenta.clienteId = cli.id;
    this.busquedaCliente = this.getNombreCliente(cli);
    this.clientesFiltrados = [];
    this.mostrarNuevoCliente = false;
    this.mensajeDniCliente = '';
  }

  crearCliente() {
    this.errorNuevoCliente = '';
    this.prepararClienteRapidoParaGuardar();

    if (
      !this.nuevoCliente.dniOrRuc ||
      this.nuevoCliente.dniOrRuc.length !== 8 ||
      !this.nuevoCliente.nombres ||
      !this.nuevoCliente.apellidoPaterno ||
      !this.nuevoCliente.apellidoMaterno
    ) {
      this.errorNuevoCliente = 'Completa DNI, nombre, apellido paterno y apellido materno.';
      return;
    }

    const clienteExistente = this.clienteRegistradoPorDni(this.nuevoCliente.dniOrRuc);
    if (clienteExistente) {
      this.seleccionarCliente(clienteExistente);
      this.errorNuevoCliente = '';
      return;
    }

    this.http.post<Cliente>(this.apiClientes, this.nuevoCliente).subscribe(nuevo => {
      const clienteNormalizado = this.normalizarCliente(nuevo);
      this.clientes = [
        clienteNormalizado,
        ...this.clientes.filter(cliente => cliente.dniOrRuc !== clienteNormalizado.dniOrRuc),
      ];
      this.clienteSeleccionado = clienteNormalizado;
      this.nuevaVenta.clienteId = nuevo.id;
      this.busquedaCliente = this.getNombreCliente(clienteNormalizado);
      this.clientesFiltrados = [];
      this.mostrarNuevoCliente = false;
      this.nuevoCliente = this.crearClienteVacio();
      this.mensaje = 'Cliente agregado correctamente';
      this.cargarClientes();
    }, () => {
      this.errorNuevoCliente = 'No se pudo registrar el cliente. Revisa el DNI o intenta nuevamente.';
    });
  }

  get dniBuscado(): string {
    return (this.busquedaCliente || '').replaceAll(/\D/g, '').slice(0, 8);
  }

  get mostrarClienteNoRegistrado(): boolean {
    const dni = this.dniBuscado;
    return Boolean(
      dni.length === 8 &&
      !this.clienteSeleccionado &&
      !this.clienteRegistradoPorDni(dni)
    );
  }

  abrirRegistroClienteDesdeBusqueda() {
    const dni = this.dniBuscado;
    if (dni.length !== 8) return;

    this.prepararClienteNoRegistrado(dni);
    this.mostrarNuevoCliente = true;
    this.consultarDniParaClienteRapido(dni);
  }

  agregarClienteNoRegistrado() {
    this.abrirRegistroClienteDesdeBusqueda();

    if (
      this.nuevoCliente.nombres &&
      this.nuevoCliente.apellidoPaterno &&
      this.nuevoCliente.apellidoMaterno
    ) {
      this.crearCliente();
    } else {
      this.errorNuevoCliente = 'Completa los datos del cliente y presiona Guardar Cliente.';
    }
  }

  // ================= PRODUCTOS =================
  cargarProductos() {
    this.http.get<Producto[]>(this.apiProductos).subscribe({
      next: data => {
        this.productos = data;
        this.productos.forEach(producto => this.cargarStockProducto(producto));

      // 🔥 IMPORTANTE: cargar ventas después
        this.cargarVentas();
      },
      error: () => {
        this.productos = [];
        this.cargarVentas();
      }
    });
  }

  private cargarStockProducto(producto: Producto): void {
    this.http.get<{ cantidad: number }>(`${this.apiStock}/${producto.id}`).subscribe({
      next: stockData => producto.stock = stockData.cantidad,
      error: () => producto.stock = 0,
    });
  }

  filtrarProductos(i: number) {
    const item = this.nuevaVenta.items[i];
    if (!item) return;

    const texto = this.normalizarTexto(item.busquedaProducto);
    const productoActual = item.productoSeleccionado || this.productos.find(p => p.id === item.productoId);

    if (productoActual && texto !== this.normalizarTexto(productoActual.nombre)) {
      item.productoId = null;
      item.productoNombre = '';
      item.precio = 0;
      item.productoSeleccionado = undefined;
    }

    item.productosFiltrados = texto ? this.buscarProductos(texto) : [];
  }

  mostrarProductos(i: number) {
    const item = this.nuevaVenta.items[i];
    if (!item) return;
    item.productosFiltrados = this.buscarProductos(this.normalizarTexto(item.busquedaProducto));
  }

  seleccionarProducto(i: number, prod: Producto) {
    const itemActual = this.nuevaVenta.items[i];
    if (!itemActual) return;

    const itemExistenteIndex = this.nuevaVenta.items.findIndex((item, index) =>
      index !== i && item.productoId === prod.id
    );

    if (itemExistenteIndex >= 0) {
      const itemExistente = this.nuevaVenta.items[itemExistenteIndex];
      itemExistente.cantidad = Number(itemExistente.cantidad || 0) + Math.max(1, Number(itemActual.cantidad || 1));
      itemExistente.productoId = prod.id;
      itemExistente.productoNombre = prod.nombre;
      itemExistente.precio = prod.precioVenta;
      itemExistente.productoSeleccionado = prod;
      itemExistente.busquedaProducto = prod.nombre;
      itemExistente.productosFiltrados = [];
      this.nuevaVenta.items.splice(i, 1);
      return;
    }

    itemActual.productoId = prod.id;
    itemActual.productoNombre = prod.nombre;
    itemActual.precio = prod.precioVenta;
    itemActual.productoSeleccionado = prod;
    itemActual.busquedaProducto = prod.nombre;
    itemActual.productosFiltrados = [];

    if (itemActual.cantidad < 1) {
      itemActual.cantidad = 1;
    }
  }

  private buscarProductos(texto: string): Producto[] {
    const terminos = texto.split(' ').filter(Boolean);
    const productos = !terminos.length
      ? this.productos
      : this.productos.filter(p => {
        const categoria = this.getCategoriaProducto(p)?.nombre || '';
        const textoProducto = this.normalizarTexto([
          p.nombre,
          p.codigoInterno,
          categoria,
        ].join(' '));

        return terminos.every(termino => textoProducto.includes(termino));
      });

    return productos.slice(0, 20);
  }

  getProductoDeItem(item: ItemVenta): Producto | undefined {
    return item.productoSeleccionado || this.productos.find(p => p.id === item.productoId);
  }

  getCategoriaDeProducto(producto: Producto | undefined): Categoria | undefined {
    if (!producto?.categoriaId) return undefined;
    return this.categorias.find(c => c.id === producto.categoriaId);
  }

  getImagenProducto(item: ItemVenta): string {
    return this.getProductoDeItem(item)?.imagen || '';
  }

  getImagenCategoriaItem(item: ItemVenta): string {
    return this.getCategoriaDeProducto(this.getProductoDeItem(item))?.imagen || '';
  }

  getNombreCategoriaItem(item: ItemVenta): string {
    return this.getCategoriaDeProducto(this.getProductoDeItem(item))?.nombre || 'Sin categoria';
  }

  getCategoriaProducto(prod: Producto): Categoria | undefined {
    return this.getCategoriaDeProducto(prod);
  }

  getInicialesProducto(nombre: string | undefined): string {
    return (nombre || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(parte => parte[0]?.toUpperCase())
      .join('') || 'PR';
  }

  getInicialesCategoria(nombre: string | undefined): string {
    return (nombre || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(parte => parte[0]?.toUpperCase())
      .join('') || 'CI';
  }

  onCantidadChange(i: number) {
    const item = this.nuevaVenta.items[i];
    if (!item) return;
    item.cantidad = Number(item.cantidad);
  }

  stockDisponible(producto: Producto | undefined): number {
    return Math.max(0, Number(producto?.stock || 0));
  }

  estadoStock(producto: Producto | undefined): 'agotado' | 'bajo' | 'ok' {
    const stock = this.stockDisponible(producto);
    if (stock <= 0) return 'agotado';
    if (stock < this.stockCriticoMinimo) return 'bajo';
    return 'ok';
  }

  textoStock(producto: Producto | undefined): string {
    const estado = this.estadoStock(producto);
    if (estado === 'agotado') return 'Sin stock';
    if (estado === 'bajo') return 'Stock bajo';
    return 'Disponible';
  }

  tieneAdvertenciaStock(producto: Producto | undefined): boolean {
    return this.estadoStock(producto) !== 'ok';
  }

  advertenciaStock(producto: Producto | undefined): string {
    const stock = this.stockDisponible(producto);
    if (stock <= 0) return 'Sin stock disponible.';
    if (stock < this.stockCriticoMinimo) return `Stock bajo: quedan ${stock} unidades.`;
    return '';
  }

  itemExcedeStock(item: ItemVenta): boolean {
    const producto = this.getProductoDeItem(item);
    if (!producto) return false;
    return item.cantidad > this.stockDisponible(producto);
  }

  productoItemInvalido(item: ItemVenta): boolean {
    return !item.productoId;
  }

  cantidadItemInvalida(item: ItemVenta): boolean {
    const cantidad = Number(item.cantidad);
    return !Number.isFinite(cantidad) || cantidad < 1;
  }

  precioItemInvalido(item: ItemVenta): boolean {
    return Boolean(item.productoId) && Number(item.precio || 0) <= 0;
  }

  errorProductoItem(item: ItemVenta): string {
    if (this.productoItemInvalido(item)) return 'Selecciona un producto válido de la lista.';
    if (this.precioItemInvalido(item)) return 'El producto seleccionado no tiene precio de venta válido.';
    return '';
  }

  errorCantidadItem(item: ItemVenta): string {
    if (this.cantidadItemInvalida(item)) return 'La cantidad debe ser mayor que 0.';

    const producto = this.getProductoDeItem(item);
    if (producto && this.stockDisponible(producto) <= 0) return 'No puedes vender este producto porque no tiene stock.';
    if (this.itemExcedeStock(item)) return `Cantidad mayor al stock disponible (${this.stockDisponible(producto)}).`;
    return '';
  }

  private primerErrorVenta(): string {
    if (!this.nuevaVenta.clienteId) return 'Selecciona un cliente válido de la lista.';
    if (this.nuevaVenta.items.length === 0) return 'Agrega al menos un producto a la venta.';

    const indiceProductoInvalido = this.nuevaVenta.items.findIndex(item => this.errorProductoItem(item));
    if (indiceProductoInvalido >= 0) {
      return `Producto ${indiceProductoInvalido + 1}: ${this.errorProductoItem(this.nuevaVenta.items[indiceProductoInvalido])}`;
    }

    const indiceCantidadInvalida = this.nuevaVenta.items.findIndex(item => this.errorCantidadItem(item));
    if (indiceCantidadInvalida >= 0) {
      return `Cantidad ${indiceCantidadInvalida + 1}: ${this.errorCantidadItem(this.nuevaVenta.items[indiceCantidadInvalida])}`;
    }

    return '';
  }

  agregarItem() {
    this.errorFormulario = '';
    this.nuevaVenta.items.unshift(this.crearItemVacio());
  }

  eliminarItem(i: number) {
    this.nuevaVenta.items.splice(i, 1);
  }

  // ================= VENTAS =================
  cargarVentas(): void {
    this.http.get<Venta[]>(this.apiVentas).subscribe({
      next: data => {
        this.ventas = data.map(venta => this.enriquecerVenta(venta));
      },
      error: () => {
        this.ventas = [];
      },
    });
  }

  private prepararVentaParaVista(venta: Venta): Venta {
    venta.fecha = venta.fecha || new Date().toISOString();

    return this.enriquecerVenta(venta);
  }

  private enriquecerVenta(venta: Venta): Venta {
    venta.items.forEach(item => this.enriquecerItem(item));
    return venta;
  }

  private enriquecerItem(item: ItemVenta): void {
    const producto = this.buscarProductoDeItem(item);
    if (producto) {
      item.productoNombre = producto.nombre;
      item.precio = item.precio ?? producto.precioVenta;
      return;
    }

    item.productoNombre = item.productoNombre || 'Producto';
    item.precio = item.precio ?? 0;
  }

  private buscarProductoDeItem(item: ItemVenta): Producto | undefined {
    return this.productos.find(producto => producto.id === item.productoId);
  }

  toggleDetalles(id: number) {
    const venta = this.ventas.find(item => item.id === id);
    if (!venta) return;

    if (this.cierreDetalleVentaTimer) {
      clearTimeout(this.cierreDetalleVentaTimer);
      this.cierreDetalleVentaTimer = null;
    }

    this.ventaDetalleSeleccionada = venta;
    this.cerrandoDetalleVenta = false;
    this.mostrarDetalleVenta = true;
    this.mostrarDetalles = { [id]: true };
  }

  cerrarDetalleVenta() {
    if (!this.mostrarDetalleVenta || this.cerrandoDetalleVenta) return;

    this.cerrandoDetalleVenta = true;

    if (this.cierreDetalleVentaTimer) {
      clearTimeout(this.cierreDetalleVentaTimer);
    }

    this.cierreDetalleVentaTimer = setTimeout(() => {
      this.mostrarDetalleVenta = false;
      this.cerrandoDetalleVenta = false;
      this.ventaDetalleSeleccionada = null;
      this.mostrarDetalles = {};
      this.cierreDetalleVentaTimer = null;
    }, this.duracionSalidaFormulario);
  }

  eliminarVenta(id: number | undefined) {
    if (!id) return;
    this.http.delete(`${this.apiVentas}/${id}`).subscribe({
      next: () => {
        delete this.mostrarDetalles[id];
        if (this.ventaDetalleSeleccionada?.id === id) {
          this.mostrarDetalleVenta = false;
          this.cerrandoDetalleVenta = false;
          this.ventaDetalleSeleccionada = null;
        }
        this.mensaje = 'Venta eliminada correctamente';
        this.cargarVentas();
      },
      error: () => {
        this.mensaje = 'No se pudo eliminar la venta';
      }
    });
  }

  get totalVenta(): number {
    return this.nuevaVenta.items.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  }

  abrirFormulario() {
    if (this.cierreFormularioTimer) {
      clearTimeout(this.cierreFormularioTimer);
      this.cierreFormularioTimer = null;
    }

    this.mensaje = '';
    this.errorFormulario = '';
    this.errorNuevoCliente = '';
    this.nuevaVenta = this.crearVentaVacia();
    this.busquedaCliente = '';
    this.clienteSeleccionado = null;
    this.clientesFiltrados = [];
    this.mostrarNuevoCliente = false;
    this.nuevoCliente = this.crearClienteVacio();
    this.cerrandoFormulario = false;
    this.mostrarFormulario = true;
  }

  cancelarFormulario() {
    this.cerrarFormularioConAnimacion();
  }

  private cerrarFormularioConAnimacion() {
    if (!this.mostrarFormulario || this.cerrandoFormulario) return;

    this.cerrandoFormulario = true;

    if (this.cierreFormularioTimer) {
      clearTimeout(this.cierreFormularioTimer);
    }

    this.cierreFormularioTimer = setTimeout(() => {
      this.mostrarFormulario = false;
      this.cerrandoFormulario = false;
      this.cierreFormularioTimer = null;
      this.limpiarFormularioVenta();
    }, this.duracionSalidaFormulario);
  }

  private limpiarFormularioVenta() {
    this.errorFormulario = '';
    this.errorNuevoCliente = '';
    this.nuevaVenta = this.crearVentaVacia();
    this.busquedaCliente = '';
    this.clienteSeleccionado = null;
    this.clientesFiltrados = [];
    this.mostrarNuevoCliente = false;
    this.nuevoCliente = this.crearClienteVacio();
  }

  registrarVenta(form?: NgForm) {
    this.mensaje = '';
    this.errorFormulario = '';

    const errorVenta = this.primerErrorVenta();
    if (errorVenta) {
      this.errorFormulario = errorVenta;
      return;
    }

    if (form?.invalid) {
      this.errorFormulario = 'Revisa los campos obligatorios antes de registrar la venta.';
      return;
    }

    const venta = {
      clienteId: this.nuevaVenta.clienteId,
      items: this.nuevaVenta.items.map(i => ({
        productoId: i.productoId,
        cantidad: i.cantidad,
      })),
    };

    this.http.post<Venta>(this.apiVentas, venta).subscribe({
      next: ventaCreada => {
        const ventaParaBoleta = this.prepararVentaParaVista(ventaCreada);
        this.generarBoletaDesdeVenta(ventaParaBoleta);
        this.cargarVentas();
        this.cerrarFormularioConAnimacion();
        this.mensaje = 'Venta registrada correctamente';
      },
      error: () => {
        this.mensaje = 'No se pudo registrar la venta';
      }
    });
  }

  // ================= PDF =================
  async generarBoletaDesdeVenta(venta: Venta) {
    const doc = new jsPDF();
    const marginX = 14;
    const pageWidth = 210;
    const pageHeight = 297;
    const footerY = pageHeight - 14;
    const contentWidth = pageWidth - (marginX * 2);

    const cliente = this.clientes.find(c => c.id === venta.clienteId)
      || (this.clienteSeleccionado?.id === venta.clienteId ? this.clienteSeleccionado : null);
    const fechaVenta = this.obtenerFechaVenta(venta);
    const fecha = fechaVenta.toLocaleDateString('es-PE');
    const hora = fechaVenta.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    const numeroVenta = venta.id ? `INV-${String(venta.id).padStart(5, '0')}` : 'VENTA';
    const nombreCliente = cliente ? this.getNombreCliente(cliente) : venta.clienteNombre || 'Cliente sin nombre';
    const totalVenta = venta.items.reduce((acc, item) => acc + ((item.precio || 0) * Number(item.cantidad || 0)), 0);

    doc.setProperties({
      title: `Boleta ${numeroVenta}`,
      subject: 'Comprobante de venta',
      author: 'Chinito Importaciones',
    });

    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    const pintarFondo = () => {
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
    };
    const agregarNuevaPagina = () => {
      doc.addPage();
      pintarFondo();
      y = 20;
      pintarEncabezadoTabla();
    };

    pintarFondo();
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginX, 12, contentWidth, 38, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, 12, contentWidth, 38, 3, 3, 'S');

    const logo = await this.obtenerLogoPdf();
    if (logo) {
      doc.addImage(logo, 'PNG', marginX + 5, 17, 22, 22);
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('CHINITO IMPORTACIONES', marginX + 33, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Comprobante claro de venta', marginX + 33, 32);
    doc.text('Gracias por su preferencia', marginX + 33, 38);

    doc.setFillColor(14, 165, 233);
    doc.roundedRect(pageWidth - marginX - 52, 18, 44, 21, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('BOLETA', pageWidth - marginX - 30, 27, { align: 'center' });
    doc.setFontSize(9);
    doc.text(numeroVenta, pageWidth - marginX - 30, 35, { align: 'center' });

    let y = 62;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Datos del cliente', marginX, y);
    doc.text('Datos de la venta', pageWidth / 2 + 4, y);

    y += 5;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginX, y, (contentWidth / 2) - 4, 27, 3, 3, 'F');
    doc.roundedRect(pageWidth / 2 + 4, y, (contentWidth / 2) - 4, 27, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, y, (contentWidth / 2) - 4, 27, 3, 3, 'S');
    doc.roundedRect(pageWidth / 2 + 4, y, (contentWidth / 2) - 4, 27, 3, 3, 'S');

    this.textoDatoPdf(doc, 'Nombre', nombreCliente, marginX + 5, y + 9, 62, 24);
    this.textoDatoPdf(doc, 'Documento', cliente?.dniOrRuc || '-', marginX + 5, y + 21, 62, 24);
    this.textoDatoPdf(doc, 'Fecha', fecha, pageWidth / 2 + 9, y + 9, 54, 22);
    this.textoDatoPdf(doc, 'Hora', hora, pageWidth / 2 + 9, y + 21, 54, 22);

    y += 42;
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Productos comprados', marginX, y);

    y += 7;
    const cols = [
      { title: 'Producto', x: marginX, width: 92 },
      { title: 'Cant.', x: marginX + 92, width: 22 },
      { title: 'Precio', x: marginX + 114, width: 32 },
      { title: 'Subtotal', x: marginX + 146, width: 36 },
    ];

    const pintarEncabezadoTabla = () => {
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(marginX, y, contentWidth, 9, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      cols.forEach(col => doc.text(col.title, col.x + (col.title === 'Producto' ? 4 : col.width / 2), y + 6.3, { align: col.title === 'Producto' ? 'left' : 'center' }));
      y += 9;
    };

    pintarEncabezadoTabla();

    venta.items.forEach((item, index) => {
      const precio = item.precio || 0;
      const cantidad = Number(item.cantidad || 0);
      const subtotal = precio * cantidad;
      const producto = item.productoNombre || 'Producto';
      const productoLineas = doc.splitTextToSize(`${index + 1}. ${producto}`, 86);
      const rowHeight = Math.max(12, 6 + (productoLineas.length * 4.8));

      if (y + rowHeight + 34 > footerY) {
        agregarNuevaPagina();
      }

      doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252);
      doc.rect(marginX, y, contentWidth, rowHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, y + rowHeight, pageWidth - marginX, y + rowHeight);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(productoLineas, marginX + 4, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.text(String(cantidad), marginX + 103, y + 7, { align: 'center' });
      doc.text(`S/ ${precio.toFixed(2)}`, marginX + 130, y + 7, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.text(`S/ ${subtotal.toFixed(2)}`, pageWidth - marginX - 4, y + 7, { align: 'right' });

      y += rowHeight;
    });

    y += 10;
    if (y + 36 > footerY) {
      doc.addPage();
      pintarFondo();
      y = 22;
    }

    doc.setFillColor(236, 253, 245);
    doc.roundedRect(pageWidth - marginX - 74, y, 74, 23, 3, 3, 'F');
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(pageWidth - marginX - 74, y, 74, 23, 3, 3, 'S');
    doc.setTextColor(6, 95, 70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL A PAGAR', pageWidth - marginX - 70, y + 8);
    doc.setFontSize(16);
    doc.text(`S/ ${totalVenta.toFixed(2)}`, pageWidth - marginX - 4, y + 18, { align: 'right' });

    this.agregarPieBoleta(doc);

    this.descargarPdf(doc, `boleta_${venta.id || 'venta'}_${fechaVenta.toISOString().slice(0, 10)}.pdf`);
    this.mensaje = this.mensaje || 'PDF generado correctamente';
  }

  private textoDatoPdf(doc: jsPDF, etiqueta: string, valor: string, x: number, y: number, ancho: number, separacion = 22): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`${etiqueta}:`, x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(doc.splitTextToSize(valor || '-', ancho), x + separacion, y);
  }

  private agregarPieBoleta(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();

    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 280, 196, 280);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Gracias por su compra. Revise sus productos antes de retirarse.', 105, 286, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Pagina ${page} de ${pageCount}`, 196, 292, { align: 'right' });
    }
  }

  private async obtenerLogoPdf(): Promise<string | null> {
    try {
      const response = await fetch('/logo.png');
      const blob = await response.blob();
      return await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private obtenerFechaVenta(venta: Venta): Date {
    if (!venta.fecha) {
      return new Date();
    }

    const fecha = new Date(venta.fecha);
    return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  }

  private descargarPdf(doc: jsPDF, nombreArchivo: string) {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();

    globalThis.window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  get ventasFiltradas(): Venta[] {
    const texto = this.normalizarTexto(this.busqueda);
    const fecha = this.filtroFecha;

    return this.ventas.filter(venta => {
      const coincideTexto = !texto ||
        this.normalizarTexto(venta.clienteNombre).includes(texto) ||
        String(venta.clienteId || '').includes(texto) ||
        String(venta.id || '').includes(texto);

      const coincideFecha = !fecha || (venta.fecha || '').startsWith(fecha);

      return coincideTexto && coincideFecha;
    });
  }

  get ventasPaginadas(): Venta[] {
    this.ajustarPaginaVentas();
    const inicio = (this.paginaVentas - 1) * this.elementosPorPagina;
    return this.ventasFiltradas.slice(inicio, inicio + this.elementosPorPagina);
  }

  get totalPaginasVentas(): number {
    return Math.max(1, Math.ceil(this.ventasFiltradas.length / this.elementosPorPagina));
  }

  cambiarPaginaVentas(cambio: number) {
    this.paginaVentas = Math.min(Math.max(this.paginaVentas + cambio, 1), this.totalPaginasVentas);
  }

  private ajustarPaginaVentas() {
    if (this.paginaVentas > this.totalPaginasVentas) {
      this.paginaVentas = this.totalPaginasVentas;
    }
  }

  get totalVentasFiltradas(): number {
    return this.ventasFiltradas.reduce((acc, v) => acc + (v.total || 0), 0);
  }

  getNombreCliente(cliente: Cliente | Partial<Cliente> | undefined | null): string {
    if (!cliente) return 'Cliente sin nombre';
    const nombreSeparado = `${cliente.nombres || ''} ${cliente.apellidoPaterno || ''} ${cliente.apellidoMaterno || ''}`
      .replaceAll(/\s+/g, ' ')
      .trim();
    return nombreSeparado || cliente.razonSocialONombre || 'Cliente sin nombre';
  }

  solicitarEliminar(venta: Venta) {
    this.accionPendiente = 'eliminar';
    this.ventaPendiente = venta;
  }

  get tituloConfirmacion(): string {
    return 'Eliminar venta';
  }

  get mensajeConfirmacion(): string {
    const id = this.ventaPendiente?.id ? `#${this.ventaPendiente.id}` : 'seleccionada';
    return `¿Seguro que quieres eliminar la venta ${id}? Se repondrá el stock de sus productos.`;
  }

  confirmarAccion() {
    if (!this.accionPendiente || !this.ventaPendiente) return;

    const venta = this.ventaPendiente;
    this.cancelarConfirmacion();
    this.eliminarVenta(venta.id);
  }

  cancelarConfirmacion() {
    this.accionPendiente = null;
    this.ventaPendiente = null;
  }

  private normalizarTexto(valor: string | undefined): string {
    return (valor || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036f]/g, '');
  }

  private crearVentaVacia(): Venta {
    return {
      clienteId: null,
      items: [this.crearItemVacio()],
    };
  }

  private crearItemVacio(): ItemVenta {
    return {
      productoId: null,
      cantidad: 1,
      precio: 0,
      busquedaProducto: '',
      productosFiltrados: [],
      productoSeleccionado: undefined,
    };
  }

  private crearClienteVacio(): Partial<Cliente> {
    return {
      dniOrRuc: '',
      razonSocialONombre: '',
      direccion: '',
      telefono: '',
      nombres: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
    };
  }

  private prepararClienteNoRegistrado(dni: string) {
    if (this.nuevoCliente.dniOrRuc !== dni) {
      this.nuevoCliente = {
        ...this.crearClienteVacio(),
        dniOrRuc: dni,
      };
    }
  }

  private consultarDniParaClienteRapido(dni: string) {
    if (this.consultandoDniCliente && this.nuevoCliente.dniOrRuc === dni) return;
    if (
      this.nuevoCliente.dniOrRuc === dni &&
      this.nuevoCliente.nombres &&
      this.nuevoCliente.apellidoPaterno &&
      this.nuevoCliente.apellidoMaterno
    ) {
      return;
    }

    const consultaActual = ++this.consultaDniClienteId;
    this.consultandoDniCliente = true;
    this.mensajeDniCliente = 'Cliente no registrado. Consultando datos del DNI...';

    this.http.get<DniConsulta>(`${this.consultaDniUrl}/${dni}`).subscribe({
      next: data => {
        if (consultaActual !== this.consultaDniClienteId || this.nuevoCliente.dniOrRuc !== dni) return;

        this.nuevoCliente.nombres = (data.nombres || '').trim();
        this.nuevoCliente.apellidoPaterno = (data.apellidoPaterno || '').trim();
        this.nuevoCliente.apellidoMaterno = (data.apellidoMaterno || '').trim();
        this.nuevoCliente.razonSocialONombre = this.getNombreCliente(this.nuevoCliente as Cliente);
        this.mensajeDniCliente = 'Cliente no registrado. Puedes agregarlo con el botón +.';
        this.consultandoDniCliente = false;
      },
      error: () => {
        if (consultaActual !== this.consultaDniClienteId || this.nuevoCliente.dniOrRuc !== dni) return;

        this.mensajeDniCliente = 'Cliente no registrado. Completa sus datos y presiona +.';
        this.consultandoDniCliente = false;
      },
    });
  }

  private prepararClienteRapidoParaGuardar() {
    this.nuevoCliente.dniOrRuc = (this.nuevoCliente.dniOrRuc || '').replaceAll(/\D/g, '').slice(0, 8);
    this.nuevoCliente.nombres = (this.nuevoCliente.nombres || '').replaceAll(/\s+/g, ' ').trim();
    this.nuevoCliente.apellidoPaterno = (this.nuevoCliente.apellidoPaterno || '').replaceAll(/\s+/g, ' ').trim();
    this.nuevoCliente.apellidoMaterno = (this.nuevoCliente.apellidoMaterno || '').replaceAll(/\s+/g, ' ').trim();
    this.nuevoCliente.razonSocialONombre = this.getNombreCliente(this.nuevoCliente as Cliente);
    this.nuevoCliente.direccion = '';
    this.nuevoCliente.telefono = '';
  }

  private clienteRegistradoPorDni(dni: string): Cliente | undefined {
    return this.clientes.find(cliente => cliente.dniOrRuc === dni);
  }

  private normalizarCliente(cliente: Cliente): Cliente {
    const nombres = (cliente.nombres || '').replaceAll(/\s+/g, ' ').trim();
    const apellidoPaterno = (cliente.apellidoPaterno || '').replaceAll(/\s+/g, ' ').trim();
    const apellidoMaterno = (cliente.apellidoMaterno || '').replaceAll(/\s+/g, ' ').trim();
    const nombreLegacy = nombres || (cliente.razonSocialONombre || '').replaceAll(/\s+/g, ' ').trim();
    const base = {
      ...cliente,
      razonSocialONombre: cliente.razonSocialONombre || '',
      dniOrRuc: cliente.dniOrRuc || '',
      direccion: cliente.direccion || '',
      telefono: cliente.telefono || '',
    };

    if (nombres || apellidoPaterno || apellidoMaterno) {
      return { ...base, nombres, apellidoPaterno, apellidoMaterno };
    }

    const partes = nombreLegacy.split(' ').filter(Boolean);
    if (partes.length < 3) {
      return { ...base, nombres: nombreLegacy, apellidoPaterno: '', apellidoMaterno: '' };
    }

    return {
      ...base,
      apellidoPaterno: partes[0],
      apellidoMaterno: partes[1],
      nombres: partes.slice(2).join(' '),
    };
  }
}
