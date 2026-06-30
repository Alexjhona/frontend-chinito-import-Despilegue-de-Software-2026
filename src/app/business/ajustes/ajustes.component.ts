import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuditEntry, AuditService } from '../../core/services/audit.service';
import { ColorSistema, TemaSistema, ThemeService } from '../../core/services/theme.service';

type Tema = TemaSistema;
type ColorPrincipal = ColorSistema;
type ModuloRespaldo = 'clientes' | 'proveedores' | 'categorias' | 'productos' | 'ventas';
type RespaldoGeneral = {
  data?: Partial<Record<ModuloRespaldo, Record<string, unknown>[]>>;
  localStorage?: Record<string, unknown>;
};

interface EstadisticasGenerales {
  clientes: number;
  proveedores: number;
  categorias: number;
  productos: number;
  ventas: number;
  montoVendido: number;
  productosStockBajo: number;
  productosSinStock: number;
}

@Component({
  selector: 'app-ajustes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ajustes.component.html',
})
export class AjustesComponent {
  tema: Tema = 'Claro';
  colorPrincipal: ColorPrincipal = 'Azul';
  respaldoGenerado = '';
  estadoServidor: 'Activo' | 'Inactivo' | 'Comprobando' = 'Comprobando';
  estadoBaseDatos: 'Conectada' | 'Sin conexión' | 'Comprobando' = 'Comprobando';
  ultimoRespaldo = '21/06/2026 09:30 AM';
  espacioUtilizado = 'Calculando...';
  mensaje = '';
  restaurando = false;
  cargandoEstadisticas = true;
  auditoria: AuditEntry[] = [];
  estadisticas: EstadisticasGenerales = {
    clientes: 0,
    proveedores: 0,
    categorias: 0,
    productos: 0,
    ventas: 0,
    montoVendido: 0,
    productosStockBajo: 0,
    productosSinStock: 0,
  };

  readonly versionSistema = 'v1.0.0';
  readonly fechaInstalacion = '21/06/2026';
  readonly temas: Tema[] = ['Claro', 'Oscuro'];
  readonly colores: ColorPrincipal[] = ['Azul', 'Verde', 'Rojo', 'Morado', 'Naranja'];
  readonly modulosRespaldo: Array<{ id: ModuloRespaldo; nombre: string; descripcion: string }> = [
    { id: 'clientes', nombre: 'Clientes', descripcion: 'Listado completo de clientes' },
    { id: 'proveedores', nombre: 'Proveedores', descripcion: 'Contactos y datos comerciales' },
    { id: 'categorias', nombre: 'Categorías', descripcion: 'Categorías públicas e internas' },
    { id: 'productos', nombre: 'Productos', descripcion: 'Productos, precios e información' },
    { id: 'ventas', nombre: 'Ventas', descripcion: 'Historial de ventas registradas' },
  ];

  private readonly apiClientes = 'http://localhost:8080/api/clientes';
  private readonly apiVentas = 'http://localhost:8080/api/ventas';
  private readonly apiProductos = 'http://localhost:8080/api/productos';
  private readonly apiCategorias = 'http://localhost:8080/api/categorias';
  private readonly apiProveedores = 'http://localhost:8080/api/proveedores';
  private readonly apiStock = 'http://localhost:8080/api/stock';
  private readonly apiPorModulo: Record<ModuloRespaldo, string> = {
    clientes: this.apiClientes,
    proveedores: this.apiProveedores,
    categorias: this.apiCategorias,
    productos: this.apiProductos,
    ventas: this.apiVentas,
  };

  constructor(
    private readonly http: HttpClient,
    private readonly themeService: ThemeService,
    private readonly auditService: AuditService,
  ) {
    const theme = this.themeService.theme;
    this.tema = theme.tema;
    this.colorPrincipal = theme.colorPrincipal;
    this.themeService.inicializar();
    this.auditoria = this.auditService.entries;
    this.auditService.audit$.subscribe(entries => this.auditoria = entries);
    this.comprobarSistema();
    this.cargarEstadisticasGenerales();
  }

  get colorClase(): string {
    const clases: Record<ColorPrincipal, string> = {
      Azul: 'from-sky-500 to-blue-600',
      Verde: 'from-emerald-500 to-green-600',
      Rojo: 'from-rose-500 to-red-600',
      Morado: 'from-violet-500 to-purple-600',
      Naranja: 'from-orange-400 to-amber-600',
    };
    return clases[this.colorPrincipal];
  }

  get previewOscuro(): boolean {
    return this.tema === 'Oscuro';
  }

  aplicarTema(): void {
    this.themeService.aplicar({
      tema: this.tema,
      colorPrincipal: this.colorPrincipal,
    });
    this.auditService.registrar(`Apariencia actualizada: ${this.tema} / ${this.colorPrincipal}`);
    this.mensaje = 'Apariencia aplicada al sistema.';
  }

  restablecerColores(): void {
    this.colorPrincipal = 'Azul';
    this.themeService.aplicar({
      tema: this.tema,
      colorPrincipal: this.colorPrincipal,
    });
    this.auditService.registrar('Colores restablecidos');
    this.mensaje = 'Colores restablecidos al valor original.';
  }

  crearRespaldo(): void {
    forkJoin({
      clientes: this.http.get<unknown[]>(this.apiClientes).pipe(catchError(() => of([]))),
      ventas: this.http.get<unknown[]>(this.apiVentas).pipe(catchError(() => of([]))),
      productos: this.http.get<unknown[]>(this.apiProductos).pipe(catchError(() => of([]))),
      categorias: this.http.get<unknown[]>(this.apiCategorias).pipe(catchError(() => of([]))),
      proveedores: this.http.get<unknown[]>(this.apiProveedores).pipe(catchError(() => of([]))),
    }).subscribe(data => {
      const respaldo = {
        sistema: 'Chinito Importaciones',
        version: this.versionSistema,
        fecha: new Date().toLocaleString('es-PE'),
        apariencia: {
          tema: this.tema,
          colorPrincipal: this.colorPrincipal,
        },
        data,
        localStorage: this.obtenerLocalStorage(),
      };

      this.respaldoGenerado = JSON.stringify(respaldo, null, 2);
      this.ultimoRespaldo = new Date().toLocaleString('es-PE');
      this.auditService.registrar('Respaldo general creado');
      this.mensaje = 'Respaldo generado correctamente con datos reales del backend.';
    });
  }

  descargarRespaldo(): void {
    if (!this.respaldoGenerado) {
      this.crearRespaldo();
    }

    this.descargarArchivo(
      this.respaldoGenerado,
      `respaldo_chinito_${this.fechaArchivo()}.json`,
      'application/json;charset=utf-8'
    );
    this.auditService.registrar('Respaldo general descargado');
    this.mensaje = 'Respaldo general descargado.';
  }

  async restaurarRespaldo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const contenido = await file.text();
      const data = this.parseJson<RespaldoGeneral>(contenido, {});
      const storage = data.localStorage ?? {};
      Object.entries(storage).forEach(([key, value]) => localStorage.setItem(key, this.valorTexto(value)));
      this.restaurando = true;
      await this.restaurarDatosBackend(data.data ?? {});
      this.restaurando = false;
      this.auditService.registrar('Respaldo restaurado');
      this.mensaje = 'Respaldo restaurado. Los datos compatibles fueron enviados al backend.';
    } catch {
      this.restaurando = false;
      this.mensaje = 'No se pudo restaurar el respaldo. Revisa el archivo.';
    }
    input.value = '';
  }

  exportarClientes(): void {
    this.exportarModuloExcel('clientes');
  }

  exportarVentas(): void {
    this.exportarModuloExcel('ventas');
  }

  exportarModuloExcel(modulo: ModuloRespaldo): void {
    this.http.get<Record<string, unknown>[]>(this.apiPorModulo[modulo]).subscribe({
      next: data => {
        this.descargarExcel(`${modulo}_chinito`, data);
        this.auditService.registrar(`${this.nombreModulo(modulo)} exportado`);
      },
      error: () => this.mensaje = `No se pudo exportar ${this.nombreModulo(modulo).toLowerCase()}.`,
    });
  }

  crearRespaldoModulo(modulo: ModuloRespaldo): void {
    this.http.get<unknown[]>(this.apiPorModulo[modulo]).subscribe({
      next: data => {
        const respaldo = {
          sistema: 'Chinito Importaciones',
          version: this.versionSistema,
          fecha: new Date().toLocaleString('es-PE'),
          modulo,
          data,
        };
        this.descargarArchivo(
          JSON.stringify(respaldo, null, 2),
          `respaldo_${modulo}_${this.fechaArchivo()}.json`,
          'application/json;charset=utf-8'
        );
        this.ultimoRespaldo = new Date().toLocaleString('es-PE');
        this.auditService.registrar(`Respaldo de ${this.nombreModulo(modulo)} creado`);
        this.mensaje = `Respaldo de ${this.nombreModulo(modulo).toLowerCase()} descargado.`;
      },
      error: () => this.mensaje = `No se pudo crear respaldo de ${this.nombreModulo(modulo).toLowerCase()}.`,
    });
  }

  async cargarRespaldoModulo(event: Event, modulo: ModuloRespaldo): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const contenido = await file.text();
      const items = file.name.endsWith('.json')
        ? this.extraerItemsJson(this.parseJson<unknown>(contenido, {}), modulo)
        : this.parseCsv(contenido);

      await this.restaurarModuloDesdeItems(modulo, items);
      this.auditService.registrar(`${this.nombreModulo(modulo)} restaurado`);
      this.mensaje = `${this.nombreModulo(modulo)} cargado al backend.`;
    } catch {
      this.restaurando = false;
      this.mensaje = `No se pudo cargar ${this.nombreModulo(modulo).toLowerCase()}. Revisa el archivo.`;
    }
    input.value = '';
  }

  async restaurarModuloDesdeItems(modulo: ModuloRespaldo, items: Record<string, unknown>[]): Promise<void> {
    this.restaurando = true;
    await Promise.allSettled(items.map(item => this.postSeguro(this.apiPorModulo[modulo], item)));
    this.restaurando = false;
  }

  comprobarSistema(): void {
    this.estadoServidor = 'Comprobando';
    this.estadoBaseDatos = 'Comprobando';

    this.http.get(this.apiProductos).subscribe({
      next: () => {
        this.estadoServidor = 'Activo';
        this.estadoBaseDatos = 'Conectada';
        this.mensaje = 'Servidor y base de datos activos.';
      },
      error: () => {
        this.estadoServidor = 'Inactivo';
        this.estadoBaseDatos = 'Sin conexión';
        this.mensaje = 'No se pudo conectar con el backend.';
      },
    });
  }

  cargarEstadisticasGenerales(): void {
    this.cargandoEstadisticas = true;

    forkJoin({
      clientes: this.http.get<Record<string, unknown>[]>(this.apiClientes).pipe(catchError(() => of([]))),
      ventas: this.http.get<Record<string, unknown>[]>(this.apiVentas).pipe(catchError(() => of([]))),
      productos: this.http.get<Record<string, unknown>[]>(this.apiProductos).pipe(catchError(() => of([]))),
      categorias: this.http.get<Record<string, unknown>[]>(this.apiCategorias).pipe(catchError(() => of([]))),
      proveedores: this.http.get<Record<string, unknown>[]>(this.apiProveedores).pipe(catchError(() => of([]))),
    }).subscribe(data => {
      const productos = data.productos;
      const ventas = data.ventas;
      const stockRequests = productos.map(producto => {
        if (producto['stock'] !== undefined || producto['cantidad'] !== undefined) {
          return of({ cantidad: this.stockDesdeProducto(producto) });
        }

        const id = producto['id'];
        if (!id) return of(this.stockDesdeProducto(producto));
        return this.http.get<Record<string, unknown>>(`${this.apiStock}/${this.valorTexto(id)}`).pipe(
          catchError(() => of({ cantidad: this.stockDesdeProducto(producto) }))
        );
      });

      forkJoin(stockRequests.length ? stockRequests : [of({ cantidad: 0 })]).subscribe(stocks => {
        const stocksReales = productos.map((producto, index) => this.stockDesdeRespuesta(stocks[index], producto));

        this.estadisticas = {
          clientes: data.clientes.length,
          proveedores: data.proveedores.length,
          categorias: data.categorias.length,
          productos: productos.length,
          ventas: ventas.length,
          montoVendido: ventas.reduce((total, venta) => total + Number(venta['total'] ?? 0), 0),
          productosStockBajo: stocksReales.filter(stock => stock > 0 && stock < 3).length,
          productosSinStock: stocksReales.filter(stock => stock <= 0).length,
        };

        this.espacioUtilizado = `${this.bytesLegibles(JSON.stringify(data).length)} / 2 GB`;
        this.cargandoEstadisticas = false;
      });
    });
  }

  private stockDesdeRespuesta(stockData: unknown, producto: Record<string, unknown>): number {
    if (stockData && typeof stockData === 'object' && 'cantidad' in stockData) {
      return Number((stockData as Record<string, unknown>)['cantidad'] ?? 0);
    }

    return this.stockDesdeProducto(producto);
  }

  private stockDesdeProducto(producto: Record<string, unknown>): number {
    return Number(producto['stock'] ?? producto['cantidad'] ?? 0);
  }

  private obtenerLocalStorage(): Record<string, string> {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) data[key] = localStorage.getItem(key) || '';
    }
    return data;
  }

  private descargarExcel(nombre: string, datos: Record<string, unknown>[]): void {
    if (!datos.length) {
      this.mensaje = 'No hay datos para exportar.';
      return;
    }

    const columnas = Array.from(new Set(datos.flatMap(item => Object.keys(item))));
    const encabezados = columnas
      .map(columna => this.celdaHtml('th', this.valorHtml(columna)))
      .join('');
    const filas = datos.map(item => {
      const celdas = columnas
        .map(columna => this.celdaHtml('td', this.valorHtml(item[columna])))
        .join('');
      return `<tr>${celdas}</tr>`;
    });
    const tabla = `
      <html>
        <head><meta charset="UTF-8"></head>
        <body>
          <table>
            <thead><tr>${encabezados}</tr></thead>
            <tbody>${filas.join('')}</tbody>
          </table>
        </body>
      </html>
    `;

    this.descargarArchivo(tabla, `${nombre}_${this.fechaArchivo()}.xls`, 'application/vnd.ms-excel;charset=utf-8');
    this.mensaje = `${nombre.replaceAll('_', ' ')} exportado.`;
  }

  private valorHtml(valor: unknown): string {
    return this.valorTexto(valor)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  private celdaHtml(etiqueta: 'td' | 'th', contenido: string): string {
    return `<${etiqueta}>${contenido}</${etiqueta}>`;
  }

  private descargarArchivo(contenido: string, nombre: string, tipo: string): void {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombre;
    link.click();
    URL.revokeObjectURL(url);
  }

  private fechaArchivo(): string {
    return new Date().toISOString().slice(0, 19).replaceAll(':', '-').replaceAll('T', '-');
  }

  private bytesLegibles(bytes: number): string {
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  }

  private nombreModulo(modulo: ModuloRespaldo): string {
    return this.modulosRespaldo.find(item => item.id === modulo)?.nombre || modulo;
  }

  private extraerItemsJson(data: unknown, modulo: ModuloRespaldo): Record<string, unknown>[] {
    if (this.esListaRegistros(data)) return data;
    if (!this.esRegistro(data)) return [];

    const respaldoData = data['data'];
    if (this.esListaRegistros(respaldoData)) return respaldoData;
    if (this.esRegistro(respaldoData)) {
      const itemsModulo = respaldoData[modulo];
      if (this.esListaRegistros(itemsModulo)) return itemsModulo;
    }
    return [];
  }

  private parseJson<T>(contenido: string, fallback: T): T {
    return contenido.trim() ? JSON.parse(contenido) as T : fallback;
  }

  private valorTexto(valor: unknown): string {
    if (valor === null || valor === undefined) return '';
    if (typeof valor === 'object') return JSON.stringify(valor);
    return String(valor);
  }

  private esRegistro(valor: unknown): valor is Record<string, unknown> {
    return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
  }

  private esListaRegistros(valor: unknown): valor is Record<string, unknown>[] {
    return Array.isArray(valor) && valor.every(item => this.esRegistro(item));
  }

  private parseCsv(contenido: string): Record<string, unknown>[] {
    const lineas = contenido.split(/\r?\n/).filter(linea => linea.trim());
    if (lineas.length < 2) return [];
    const columnas = this.parseCsvLine(lineas[0]);
    return lineas.slice(1).map(linea => {
      const valores = this.parseCsvLine(linea);
      return columnas.reduce<Record<string, unknown>>((item, columna, index) => {
        item[columna] = valores[index] ?? '';
        return item;
      }, {});
    });
  }

  private parseCsvLine(linea: string): string[] {
    const valores: string[] = [];
    let actual = '';
    let entreComillas = false;

    for (let i = 0; i < linea.length; i++) {
      const char = linea[i];
      const siguiente = linea[i + 1];
      if (char === '"' && siguiente === '"') {
        actual += '"';
        i++;
      } else if (char === '"') {
        entreComillas = !entreComillas;
      } else if (char === ',' && !entreComillas) {
        valores.push(actual);
        actual = '';
      } else {
        actual += char;
      }
    }

    valores.push(actual);
    return valores;
  }

  private async restaurarDatosBackend(data: Record<string, unknown[]>): Promise<void> {
    const tareas: Promise<unknown>[] = [];

    (data['categorias'] || []).forEach(item => tareas.push(this.postSeguro(this.apiCategorias, item)));
    (data['clientes'] || []).forEach(item => tareas.push(this.postSeguro(this.apiClientes, item)));
    (data['proveedores'] || []).forEach(item => tareas.push(this.postSeguro(this.apiProveedores, item)));
    (data['productos'] || []).forEach(item => tareas.push(this.postSeguro(this.apiProductos, item)));

    await Promise.allSettled(tareas);
  }

  private postSeguro(url: string, item: unknown): Promise<unknown> {
    const payload = { ...(item as Record<string, unknown>) };
    delete payload['id'];
    return new Promise(resolve => {
      this.http.post(url, payload).subscribe({
        next: response => resolve(response),
        error: error => resolve(error),
      });
    });
  }
}
