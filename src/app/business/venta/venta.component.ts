import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';

interface Cliente {
  id: number;
  razonSocialONombre: string;
  dniOrRuc: string;
  direccion?: string;
  telefono?: string;
}

interface Producto {
  id: number;
  nombre: string;
  codigoInterno: string;
  precioVenta: number;
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
export class VentaComponent {

  ventas: Venta[] = [];
  clientes: Cliente[] = [];
  productos: Producto[] = [];

  nuevaVenta: Venta = {
    clienteId: null,
    items: []
  };

  mensaje: string = '';
  mostrarFormulario = false;

  busquedaCliente: string = '';
  clientesFiltrados: Cliente[] = [];
  clienteSeleccionado: Cliente | null = null;

  mostrarNuevoCliente = false;
  nuevoCliente: Partial<Cliente> = {
    dniOrRuc: '',
    razonSocialONombre: '',
    direccion: '',
    telefono: ''
  };

  busqueda: string = '';
  filtroFecha: string = '';
  mostrarDetalles: { [key: number]: boolean } = {};

  private apiVentas = 'https://mean-election-candle-joint.trycloudflare.com/api/ventas';
  private apiClientes = 'https://mean-election-candle-joint.trycloudflare.com/api/clientes';
  private apiProductos = 'https://mean-election-candle-joint.trycloudflare.com/api/productos';

  // 🔥 SOLO CAMBIO: orden correcto
  constructor(private http: HttpClient) {
    this.cargarProductos(); // primero productos
    this.cargarClientes();
  }

  // ================= CLIENTES =================
  cargarClientes() {
    this.http.get<Cliente[]>(this.apiClientes).subscribe(data => {
      this.clientes = data;
    });
  }

  filtrarClientes() {
    const texto = this.busquedaCliente.trim().toLowerCase();
    this.clientesFiltrados = !texto
      ? []
      : this.clientes.filter(c =>
        c.razonSocialONombre.toLowerCase().includes(texto) ||
        (c.dniOrRuc && c.dniOrRuc.includes(texto))
      );
  }

  seleccionarCliente(cli: Cliente) {
    this.clienteSeleccionado = cli;
    this.nuevaVenta.clienteId = cli.id;
    this.busquedaCliente = cli.razonSocialONombre;
    this.clientesFiltrados = [];
  }

  crearCliente() {
    if (!this.nuevoCliente.dniOrRuc || !this.nuevoCliente.razonSocialONombre) {
      alert('Completa DNI/RUC y nombre');
      return;
    }

    this.http.post<Cliente>(this.apiClientes, this.nuevoCliente).subscribe(nuevo => {
      this.cargarClientes();
      this.clienteSeleccionado = nuevo;
      this.nuevaVenta.clienteId = nuevo.id;
      this.busquedaCliente = nuevo.razonSocialONombre;
      this.mostrarNuevoCliente = false;
      this.nuevoCliente = { dniOrRuc: '', razonSocialONombre: '', direccion: '', telefono: '' };
    });
  }

  // ================= PRODUCTOS =================
  cargarProductos() {
    this.http.get<Producto[]>(this.apiProductos).subscribe({
      next: data => {
        this.productos = data;

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
    const texto = this.nuevaVenta.items[i].busquedaProducto?.trim().toLowerCase() || '';
    this.nuevaVenta.items[i].productosFiltrados = !texto
      ? []
      : this.productos.filter(p =>
        p.nombre.toLowerCase().includes(texto) ||
        (p.codigoInterno && p.codigoInterno.toLowerCase().includes(texto))
      );
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

  onCantidadChange(i: number) {
    const item = this.nuevaVenta.items[i];
    if (item.cantidad < 1) item.cantidad = 1;
  }

  agregarItem() {
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
    if (!confirm('¿Seguro que deseas eliminar esta venta? Se repondra el stock de sus productos.')) {
      return;
    }

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

  registrarVenta() {
    if (!this.nuevaVenta.clienteId || this.nuevaVenta.items.length === 0) {
      this.mensaje = 'Completa los datos';
      return;
    }

    if (this.nuevaVenta.items.some(item => !item.productoId || item.cantidad < 1)) {
      this.mensaje = 'Selecciona producto y cantidad';
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
        this.nuevaVenta = { clienteId: null, items: [] };
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
    const fecha = venta.fecha ? new Date(venta.fecha).toLocaleDateString() : '';

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
    const igv = subtotal * 0.18;
    const totalGeneral = subtotal + igv;
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

    doc.save(`boleta_${venta.id}.pdf`);
  }

  get ventasFiltradas(): Venta[] {
    return this.ventas;
  }

  get totalVentasFiltradas(): number {
    return this.ventas.reduce((acc, v) => acc + (v.total || 0), 0);
  }
}
