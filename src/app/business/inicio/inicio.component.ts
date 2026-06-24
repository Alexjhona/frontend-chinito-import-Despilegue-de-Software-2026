import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { PublicContentConfig, PublicContentService, PublicServicioConfig } from '../../core/services/public-content.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';

interface CategoriaCatalogo {
  id: number;
  nombre: string;
  imagen?: string;
}

interface ProductoCatalogo {
  id?: number;
  categoriaId: number | null;
  codigoInterno?: string;
  nombre: string;
  imagen?: string;
  precioVenta: number | null;
  moneda?: string;
  stock?: number;
}

interface SlideInicio {
  etiqueta: string;
  titulo: string;
  descripcion: string;
  boton: string;
  imagen: string;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css',
})
export class InicioComponent implements OnDestroy {
  productos: ProductoCatalogo[] = [];
  categorias: CategoriaCatalogo[] = [];
  busqueda = '';
  categoriaSeleccionada = 'todas';
  cargandoCatalogo = true;
  cargandoCategorias = true;
  cargandoProductos = true;
  errorCategorias = '';
  errorProductos = '';
  vistaActual: 'inicio' | 'catalogo' | 'productos' | 'servicios' = 'inicio';
  contenido: PublicContentConfig;
  slideActivo = 0;
  servicioActivo: 'garantia' | 'pagos' | 'atencion' | null = null;
  logoActualizando = false;

  get slidesInicio(): SlideInicio[] {
    return this.contenido.slidesInicio;
  }

  get serviciosInicio(): PublicServicioConfig[] {
    return this.contenido.servicios;
  }

  get servicioActivoConfig(): PublicServicioConfig | null {
    return this.serviciosInicio.find(servicio => servicio.id === this.servicioActivo) || null;
  }

  get categoriasInicio(): CategoriaCatalogo[] {
    return this.categoriasVisibles.slice(0, 5);
  }

  get productosDestacados(): ProductoCatalogo[] {
    return this.productosFiltrados.slice(0, 8);
  }

  seleccionarSlide(index: number): void {
    this.slideActivo = index;
    this.iniciarCarrusel();
  }

  alternarServicio(servicio: 'garantia' | 'pagos' | 'atencion'): void {
    this.servicioActivo = servicio;
  }

  cerrarServicio(): void {
    this.servicioActivo = null;
  }

  actualizarDesdeLogo(event?: Event): void {
    event?.preventDefault();
    this.logoActualizando = true;
    this.busqueda = '';
    this.seleccionarCategoria('todas');
    this.slideActivo = 0;
    this.cargarCatalogo();
    this.router.navigate(['/inicio']);
    this.iniciarCarrusel();

    setTimeout(() => {
      this.logoActualizando = false;
    }, 700);
  }

  imagenSlide(slide: SlideInicio): string {
    return slide.imagen;
  }

  private productoUrl = 'http://localhost:8080/api/productos';
  private categoriaUrl = 'http://localhost:8080/api/categorias';
  private stockUrl = 'http://localhost:8080/api/stock';
  private readonly subs = new Subscription();
  private sliderTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private publicContent: PublicContentService,
    private dataRefresh: DataRefreshService,
  ) {
    this.contenido = this.publicContent.config;
    this.cargarCatalogo();
    this.actualizarVista(this.router.url);

    this.subs.add(
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(event => this.actualizarVista(event.urlAfterRedirects))
    );

    this.subs.add(
      this.route.queryParamMap.subscribe(params => {
        const categoria = params.get('categoria');
        this.categoriaSeleccionada = categoria || 'todas';
      })
    );

    this.subs.add(
      this.publicContent.config$.subscribe(config => {
        this.contenido = config;
      })
    );

    this.subs.add(
      this.dataRefresh.refresh$.subscribe(() => this.cargarCatalogo())
    );

    this.iniciarCarrusel();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    if (this.sliderTimer) clearInterval(this.sliderTimer);
  }

  get esVistaInicio(): boolean {
    return this.vistaActual === 'inicio';
  }

  get esVistaCatalogo(): boolean {
    return this.vistaActual === 'catalogo';
  }

  get esVistaProductos(): boolean {
    return this.vistaActual === 'productos';
  }

  get esVistaServicios(): boolean {
    return this.vistaActual === 'servicios';
  }

  get productosFiltrados(): ProductoCatalogo[] {
    const texto = this.normalizar(this.busqueda);
    const categoria = this.categoriaSeleccionada;

    return this.productosVisibles.filter(producto => {
      const coincideCategoria = categoria === 'todas' || String(producto.categoriaId) === categoria;
      const categoriaNombre = this.nombreCategoria(producto.categoriaId);
      const coincideTexto = !texto ||
        this.normalizar(producto.nombre).includes(texto) ||
        this.normalizar(producto.codigoInterno).includes(texto) ||
        this.normalizar(categoriaNombre).includes(texto);

      return coincideCategoria && coincideTexto;
    });
  }

  get categoriasFiltradas(): CategoriaCatalogo[] {
    const texto = this.normalizar(this.busqueda);
    if (!texto) return this.categoriasVisibles;
    return this.categoriasVisibles.filter(categoria => this.normalizar(categoria.nombre).includes(texto));
  }

  get productosVisibles(): ProductoCatalogo[] {
    return this.productos.filter(producto =>
      !this.publicContent.estaProductoOculto(producto.id) &&
      !this.publicContent.estaCategoriaOculta(producto.categoriaId)
    );
  }

  get categoriasVisibles(): CategoriaCatalogo[] {
    return this.categorias.filter(categoria => !this.publicContent.estaCategoriaOculta(categoria.id));
  }

  cargarCatalogo() {
    this.cargandoCatalogo = true;
    this.cargandoCategorias = true;
    this.cargandoProductos = true;
    this.errorCategorias = '';
    this.errorProductos = '';

    this.http.get<CategoriaCatalogo[]>(this.categoriaUrl).subscribe({
      next: categorias => {
        this.categorias = categorias;
        this.cargandoCategorias = false;
        this.actualizarEstadoCarga();
      },
      error: () => {
        this.categorias = [];
        this.errorCategorias = 'No se pudieron cargar las categorias. Verifica que el backend este levantado.';
        this.cargandoCategorias = false;
        this.actualizarEstadoCarga();
      },
    });

    this.cargarProductos();
  }

  nombreCategoria(categoriaId: number | null | undefined): string {
    return this.categorias.find(categoria => categoria.id === categoriaId)?.nombre || 'Sin categoria';
  }

  precioProducto(producto: ProductoCatalogo): string {
    const precio = Number(producto.precioVenta || 0);
    const moneda = producto.moneda || 'Soles';
    const simbolo = moneda.toLowerCase().includes('sol') ? 'S/' : '$';
    return precio > 0 ? `${simbolo} ${precio.toFixed(2)}` : 'Consultar';
  }

  estadoStock(producto: ProductoCatalogo): string {
    const stock = Number(producto.stock ?? 0);
    return stock > 0 ? 'Disponible' : 'No disponible';
  }

  claseStock(producto: ProductoCatalogo): string {
    const stock = Number(producto.stock ?? 0);
    return stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700';
  }

  imagenProducto(producto: ProductoCatalogo): string {
    return producto.imagen || this.crearImagenPlaceholder(producto.nombre);
  }

  imagenCategoria(categoria: CategoriaCatalogo): string {
    return categoria.imagen || this.crearImagenPlaceholder(categoria.nombre);
  }

  productosPorCategoria(categoriaId: number): number {
    return this.productosVisibles.filter(producto => producto.categoriaId === categoriaId).length;
  }

  seleccionarCategoria(categoriaId: number | 'todas') {
    this.categoriaSeleccionada = String(categoriaId);
  }

  verCatalogo(event?: Event) {
    event?.preventDefault();
    this.router.navigate(['/catalogo']);
  }

  verTodosProductos(event?: Event) {
    event?.preventDefault();
    this.busqueda = '';
    this.seleccionarCategoria('todas');
    this.router.navigate(['/productos']);
  }

  verCategoriaDesdeHeader(categoriaId: number) {
    this.busqueda = '';
    this.seleccionarCategoria(categoriaId);
    this.router.navigate(['/productos'], { queryParams: { categoria: categoriaId } });
  }

  categoriaActiva(categoriaId: number): boolean {
    return this.categoriaSeleccionada === String(categoriaId);
  }

  iniciales(nombre: string): string {
    return (nombre || 'CI').split(/\s+/).filter(Boolean).slice(0, 2).map(parte => parte.charAt(0).toUpperCase()).join('');
  }

  private cargarProductos() {
    this.http.get<ProductoCatalogo[]>(this.productoUrl).subscribe({
      next: productos => {
        this.productos = productos;
        this.cargarStockProductos();
        this.cargandoProductos = false;
        this.actualizarEstadoCarga();
      },
      error: () => {
        this.productos = [];
        this.errorProductos = 'No se pudieron cargar los productos. Las categorias pueden seguir disponibles.';
        this.cargandoProductos = false;
        this.actualizarEstadoCarga();
      },
    });
  }

  private actualizarEstadoCarga() {
    this.cargandoCatalogo = this.cargandoCategorias || this.cargandoProductos;
  }

  private cargarStockProductos() {
    this.productos.forEach(producto => {
      if (!producto.id) {
        producto.stock = 0;
        return;
      }

      this.http.get<{ cantidad: number }>(`${this.stockUrl}/${producto.id}`).subscribe({
        next: stockData => producto.stock = Number(stockData.cantidad || 0),
        error: () => producto.stock = 0,
      });
    });
  }

  private crearImagenPlaceholder(nombre: string): string {
    const texto = this.iniciales(nombre);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop stop-color="#e0f2fe"/>
            <stop offset="1" stop-color="#ede9fe"/>
          </linearGradient>
        </defs>
        <rect width="640" height="480" fill="url(#g)"/>
        <circle cx="120" cy="96" r="80" fill="#bae6fd" opacity=".65"/>
        <circle cx="540" cy="380" r="120" fill="#ddd6fe" opacity=".65"/>
        <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="92" font-weight="900" fill="#0369a1">${texto}</text>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  private normalizar(valor: string | undefined | null): string {
    return (valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }

  private actualizarVista(url: string) {
    const path = url.split('?')[0].split('#')[0].replace(/^\/+/, '') || 'inicio';

    if (path === 'catalogo' || path === 'productos' || path === 'servicios') {
      this.vistaActual = path;
    } else {
      this.vistaActual = 'inicio';
    }
  }

  private iniciarCarrusel(): void {
    if (this.sliderTimer) clearInterval(this.sliderTimer);
    if (typeof window === 'undefined') return;

    this.sliderTimer = setInterval(() => {
      this.slideActivo = (this.slideActivo + 1) % this.slidesInicio.length;
    }, 5200);
  }
}
