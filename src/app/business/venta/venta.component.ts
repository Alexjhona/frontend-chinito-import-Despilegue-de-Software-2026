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
  styleUrl: './venta.component.css',
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
  accionPendiente: 'eliminar' | null = null;
  ventaPendiente: Venta | null = null;

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
  mostrarDetalles: { [key: number]: boolean } = {};

  private readonly apiVentas = 'http://localhost:8080/api/ventas';
  private readonly apiClientes = 'http://localhost:8080/api/clientes';
  private readonly apiProductos = 'http://localhost:8080/api/productos';
  private readonly apiCategorias = 'http://localhost:8080/api/categorias';
  private readonly apiStock = 'http://localhost:8080/api/stock';
  private readonly consultaDniUrl = 'http://localhost:8080/auth/dni';
  readonly stockCriticoMinimo = 3;
  private readonly refreshSub: Subscription;

  get fechaVentaAutomatica(): string {
    return new Date().toLocaleString('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  // 🔥 SOLO CAMBIO: orden correcto
  constructor(
    private http: HttpClient,
    private dataRefresh: DataRefreshService,
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
        (c.dniOrRuc && c.dniOrRuc.includes(texto))
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
    return (this.busquedaCliente || '').replace(/\D/g, '').slice(0, 8);
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
        this.productos.forEach(producto => {
          this.http.get<{ cantidad: number }>(`${this.apiStock}/${producto.id}`).subscribe({
            next: stockData => {
              producto.stock = stockData.cantidad;
            },
            error: () => {
              producto.stock = 0;
            }
          });
        });

      // 🔥 IMPORTANTE: cargar ventas después
        this.cargarVentas();
      },
      error: () => {
        this.productos = [];
        this.cargarVentas();
      }
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
    this.nuevaVenta.items[i].productoId = prod.id;
    this.nuevaVenta.items[i].productoNombre = prod.nombre;
    this.nuevaVenta.items[i].precio = prod.precioVenta;
    this.nuevaVenta.items[i].productoSeleccionado = prod;
    this.nuevaVenta.items[i].busquedaProducto = prod.nombre;
    this.nuevaVenta.items[i].productosFiltrados = [];

    if (this.nuevaVenta.items[i].cantidad < 1) {
      this.nuevaVenta.items[i].cantidad = 1;
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
    this.nuevaVenta.items.push({
      productoId: null,
      cantidad: 1,
      precio: 0,
      busquedaProducto: '',
      productosFiltrados: [],
      productoSeleccionado: undefined
    });
  }

  eliminarItem(i: number) {
    this.nuevaVenta.items.splice(i, 1);
  }

  // ================= VENTAS =================
  cargarVentas() {
    this.http.get<Venta[]>(this.apiVentas).subscribe(data => {
      data.forEach(venta => {
        venta.items.forEach(item => {

          // 🔥 mejora sin romper tu lógica
          const prod = this.productos.find(p => p.id === item.productoId);

          if (prod) {
            item.productoNombre = prod.nombre;
            item.precio = item.precio ?? prod.precioVenta;
          } else {
            item.productoNombre = item.productoNombre || 'Producto';
            item.precio = item.precio ?? 0;
          }

        });
      });

      this.ventas = data;
    });
  }

  private prepararVentaParaVista(venta: Venta): Venta {
    venta.fecha = venta.fecha || new Date().toISOString();

    venta.items.forEach(item => {
      const prod = this.productos.find(p => p.id === item.productoId);

      if (prod) {
        item.productoNombre = prod.nombre;
        item.precio = item.precio ?? prod.precioVenta;
      } else {
        item.productoNombre = item.productoNombre || 'Producto';
        item.precio = item.precio ?? 0;
      }
    });

    return venta;
  }

  toggleDetalles(id: number) {
    this.mostrarDetalles[id] = !this.mostrarDetalles[id];
  }

  eliminarVenta(id: number | undefined) {
    if (!id) return;
    this.http.delete(`${this.apiVentas}/${id}`).subscribe({
      next: () => {
        delete this.mostrarDetalles[id];
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
    this.mensaje = '';
    this.errorFormulario = '';
    this.mostrarFormulario = true;

    if (this.nuevaVenta.items.length === 0) {
      this.agregarItem();
    }
  }

  cancelarFormulario() {
    this.mostrarFormulario = false;
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
        this.nuevaVenta = this.crearVentaVacia();
        this.busquedaCliente = '';
        this.clienteSeleccionado = null;
        this.mostrarFormulario = false;
        this.mensaje = 'Venta registrada correctamente';
      },
      error: () => {
        this.mensaje = 'No se pudo registrar la venta';
      }
    });
  }

  // ================= PDF =================
  generarBoletaDesdeVenta(venta: Venta) {
    const doc = new jsPDF();
    const marginX = 10;
    const pageWidth = 210;

    let y = 20;

    const cliente = this.clientes.find(c => c.id === venta.clienteId)
      || (this.clienteSeleccionado?.id === venta.clienteId ? this.clienteSeleccionado : null);
    const fechaVenta = this.obtenerFechaVenta(venta);
    const fecha = fechaVenta.toLocaleDateString('es-PE');

    // =========================
    // 🧾 TÍTULO
    // =========================
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTA DE VENTA', pageWidth / 2, y, { align: 'center' });

    y += 15;

    // =========================
    // 👤 DATOS DE CABECERA
    // =========================
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    doc.text('Cliente:', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cliente?.razonSocialONombre || '-'}`, marginX + 18, y);

    doc.setFont('helvetica', 'bold');
    doc.text(`N°: INV${venta.id}`, pageWidth - 60, y);

    y += 6;
    doc.text('Documento:', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cliente?.dniOrRuc || '-'}`, marginX + 23, y);

    doc.setFont('helvetica', 'bold');
    doc.text(`Fecha: ${fecha}`, pageWidth - 60, y);

    y += 6;
    doc.text('Dirección:', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cliente?.direccion || '-'}`, marginX + 19, y);

    y += 15;

    // =========================
    // 📦 TABLA CON MARCOS DEFINIDOS
    // =========================
    const cols = [
      { title: 'N°', width: 15 },
      { title: 'Producto', width: 85 },
      { title: 'Cant.', width: 20 },
      { title: 'P. Unit', width: 35 },
      { title: 'Total', width: 35 }
    ];

    const rowHeight = 9; // Un poco más alto para que el texto respire

    // CONFIGURACIÓN DE BORDES
    doc.setDrawColor(0, 0, 0); // Color negro para las líneas
    doc.setLineWidth(0.1);     // Grosor fino pero visible

    // --- ENCABEZADOS ---
    let currentX = marginX;
    doc.setFont('helvetica', 'bold');

    cols.forEach(col => {
      // Fondo azul
      doc.setFillColor(33, 150, 243);
      doc.rect(currentX, y, col.width, rowHeight, 'FD'); // 'FD' = Fill and Draw (Relleno y Borde)

      // Texto blanco
      doc.setTextColor(255, 255, 255);
      doc.text(col.title, currentX + col.width / 2, y + 6, { align: 'center' });

      currentX += col.width;
    });

    y += rowHeight;

    // --- FILAS DE PRODUCTOS ---
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    let subtotal = 0;

    venta.items.forEach((item, index) => {
      let rowX = marginX;
      const precio = item.precio ?? 0;
      const totalItem = precio * item.cantidad;
      subtotal += totalItem;

      const rowData = [
        String(index + 1),
        item.productoNombre || '',
        String(item.cantidad),
        precio.toFixed(2),
        totalItem.toFixed(2)
      ];

      rowData.forEach((text, i) => {
        const w = cols[i].width;

        // Dibujar celda con borde
        doc.rect(rowX, y, w, rowHeight);

        // Alinear texto
        if (i === 1) {
          doc.text(text, rowX + 2, y + 6); // Producto a la izquierda
        } else {
          doc.text(text, rowX + w / 2, y + 6, { align: 'center' }); // Números centrados
        }
        rowX += w;
      });
      y += rowHeight;
    });

    // =========================
    // 💰 TOTALES
    // =========================
    y += 10;
    const boxWidth = 80;
    const boxX = pageWidth - marginX - boxWidth;

    doc.setFont('helvetica', 'bold');


    // TOTAL (Recuadro azul con borde)
    doc.setFillColor(33, 150, 243);
    doc.rect(boxX - 2, y, boxWidth + 2, 10, 'FD'); // Fondo y borde

    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL:', boxX + 2, y + 7);
    doc.text(`S/ ${subtotal.toFixed(2)}`, pageWidth - marginX - 2, y + 7, { align: 'right' });

    // Pie de página
    doc.setTextColor(0, 0, 0);
    y += 20;
    doc.text('Gracias por su compra', pageWidth / 2, y, { align: 'center' });

    this.descargarPdf(doc, `boleta_${venta.id || 'venta'}_${fechaVenta.toISOString().slice(0, 10)}.pdf`);
    this.mensaje = this.mensaje || 'PDF generado correctamente';
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

    window.open(url, '_blank', 'noopener');
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

  get totalVentasFiltradas(): number {
    return this.ventasFiltradas.reduce((acc, v) => acc + (v.total || 0), 0);
  }

  getNombreCliente(cliente: Cliente | Partial<Cliente> | undefined | null): string {
    if (!cliente) return 'Cliente sin nombre';
    const nombreSeparado = `${cliente.nombres || ''} ${cliente.apellidoPaterno || ''} ${cliente.apellidoMaterno || ''}`
      .replace(/\s+/g, ' ')
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
      .replace(/[\u0300-\u036f]/g, '');
  }

  private crearVentaVacia(): Venta {
    return {
      clienteId: null,
      items: [],
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
    this.nuevoCliente.dniOrRuc = (this.nuevoCliente.dniOrRuc || '').replace(/\D/g, '').slice(0, 8);
    this.nuevoCliente.nombres = (this.nuevoCliente.nombres || '').replace(/\s+/g, ' ').trim();
    this.nuevoCliente.apellidoPaterno = (this.nuevoCliente.apellidoPaterno || '').replace(/\s+/g, ' ').trim();
    this.nuevoCliente.apellidoMaterno = (this.nuevoCliente.apellidoMaterno || '').replace(/\s+/g, ' ').trim();
    this.nuevoCliente.razonSocialONombre = this.getNombreCliente(this.nuevoCliente as Cliente);
    this.nuevoCliente.direccion = '';
    this.nuevoCliente.telefono = '';
  }

  private clienteRegistradoPorDni(dni: string): Cliente | undefined {
    return this.clientes.find(cliente => cliente.dniOrRuc === dni);
  }

  private normalizarCliente(cliente: Cliente): Cliente {
    const nombres = (cliente.nombres || '').replace(/\s+/g, ' ').trim();
    const apellidoPaterno = (cliente.apellidoPaterno || '').replace(/\s+/g, ' ').trim();
    const apellidoMaterno = (cliente.apellidoMaterno || '').replace(/\s+/g, ' ').trim();
    const nombreLegacy = nombres || (cliente.razonSocialONombre || '').replace(/\s+/g, ' ').trim();
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
